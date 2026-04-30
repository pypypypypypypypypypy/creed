const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');

// ---- Config ----
const W = 1280;
const H = 640;
const AVATAR_W = Math.round(W * 0.55); // avatar takes left ~55%
const TEXT_X = AVATAR_W - 40;          // text starts a bit before edge of avatar (over the fade)
const TEXT_RIGHT_PAD = 60;
const MAX_TEXT_W = W - TEXT_X - TEXT_RIGHT_PAD;

// ---- Helpers ----
function wrapLines(ctx, text, maxWidth) {
  const paragraphs = String(text).split(/\r?\n/);
  const out = [];
  for (const p of paragraphs) {
    if (!p.trim()) { out.push(''); continue; }
    const words = p.split(/\s+/);
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width <= maxWidth) {
        line = test;
      } else {
        if (line) out.push(line);
        // Hard-break very long words
        if (ctx.measureText(w).width > maxWidth) {
          let chunk = '';
          for (const ch of w) {
            const t = chunk + ch;
            if (ctx.measureText(t).width <= maxWidth) chunk = t;
            else { out.push(chunk); chunk = ch; }
          }
          line = chunk;
        } else {
          line = w;
        }
      }
    }
    if (line) out.push(line);
  }
  return out;
}

function fitFont(ctx, text, maxWidth, maxHeight, family, startSize, minSize) {
  for (let size = startSize; size >= minSize; size -= 2) {
    ctx.font = `bold ${size}px ${family}`;
    const lineHeight = Math.round(size * 1.18);
    const lines = wrapLines(ctx, text, maxWidth);
    const total = lines.length * lineHeight;
    if (total <= maxHeight) return { size, lineHeight, lines };
  }
  ctx.font = `bold ${minSize}px ${family}`;
  return {
    size: minSize,
    lineHeight: Math.round(minSize * 1.18),
    lines: wrapLines(ctx, text, maxWidth),
  };
}

// Draw avatar covering left region, then a left-to-right gradient fade
// to black across the right portion of the avatar so text on the right
// reads cleanly on a pure-black background.
function drawAvatarWithFade(ctx, img) {
  const aspect = img.width / img.height;
  let dw, dh, dx, dy;
  if (aspect >= AVATAR_W / H) {
    dh = H; dw = dh * aspect;
    dx = (AVATAR_W - dw) / 2; dy = 0;
  } else {
    dw = AVATAR_W; dh = dw / aspect;
    dx = 0; dy = (H - dh) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);

  // Desaturate by overlaying a low-alpha grayscale of itself? Skip — keep color.
  // Subtle vignette darkening on the bottom for legibility of attribution if needed.

  // Fade to pure black: solid black on the right half, gradient across the
  // middle band of the avatar so the transition looks natural.
  const fadeStart = Math.round(AVATAR_W * 0.55);
  const fadeEnd = AVATAR_W;
  const grad = ctx.createLinearGradient(fadeStart, 0, fadeEnd, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = grad;
  ctx.fillRect(fadeStart, 0, fadeEnd - fadeStart, H);

  ctx.fillStyle = '#000000';
  ctx.fillRect(fadeEnd, 0, W - fadeEnd, H);
}

async function generateQuoteImage({ avatarBuffer, text, displayName, username }) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  // Avatar
  if (avatarBuffer) {
    try {
      const img = await loadImage(avatarBuffer);
      drawAvatarWithFade(ctx, img);
    } catch {}
  }

  const family = 'sans-serif';

  // Reserve space for attribution lines beneath the quote
  const attrSize = 26;
  const handleSize = 20;
  const attrBlockHeight = attrSize + 8 + handleSize + 20;

  // Quote text — auto-fit
  const maxTextHeight = H - 120 - attrBlockHeight;
  const fit = fitFont(ctx, text, MAX_TEXT_W, maxTextHeight, family, 64, 22);

  // Vertically center the entire (quote + attribution) block in the right region
  const totalHeight = fit.lines.length * fit.lineHeight + attrBlockHeight;
  let y = Math.max(60, Math.round((H - totalHeight) / 2));

  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  const cx = TEXT_X + MAX_TEXT_W / 2;

  ctx.font = `bold ${fit.size}px ${family}`;
  for (const line of fit.lines) {
    ctx.fillText(line, cx, y);
    y += fit.lineHeight;
  }

  y += 18;
  ctx.font = `${attrSize}px ${family}`;
  ctx.fillStyle = '#cfcfcf';
  ctx.fillText(`- ${displayName}`, cx, y);
  y += attrSize + 8;

  ctx.font = `${handleSize}px ${family}`;
  ctx.fillStyle = '#7a7a7a';
  ctx.fillText(`@${username}`, cx, y);

  return canvas.encode('png');
}

async function fetchAvatarBuffer(user) {
  try {
    const url = user.displayAvatarURL({ extension: 'png', forceStatic: true, size: 512 });
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

module.exports = {
  category: 'utility',
  help: [
    {
      name: 'quote',
      description: 'Generate a stylized quote image from a message or text.',
      aliases: 'q',
      parameters: '[@user] <text> | (reply to a message)',
      information: 'Reply to a message to quote it, or pass a user + text, or just text to quote yourself.',
      usage: 'quote [@user] <text>',
      example: 'quote @bob life is good',
    },
  ],

  name: 'quote',
  aliases: ['q'],

  run: async (client, message, args) => {
    message.channel.sendTyping();

    let targetUser = null;
    let text = '';

    // 1) Reply mode
    if (message.reference && message.reference.messageId) {
      const replied = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
      if (replied) {
        targetUser = replied.author;
        text = (replied.content || '').trim();
        if (!text && replied.embeds.length) text = replied.embeds[0].description || replied.embeds[0].title || '';
      }
    }

    // 2) Mention + text mode
    if (!targetUser) {
      const mention = message.mentions.users.first();
      if (mention) {
        targetUser = mention;
        text = args.filter((a) => !a.match(new RegExp(`<@!?${mention.id}>`))).join(' ').trim();
      }
    }

    // 3) Self + text mode
    if (!targetUser) {
      targetUser = message.author;
      text = args.join(' ').trim();
    }

    if (!text) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Reply to a message or provide some text. \`,quote some text\``)],
      });
    }

    if (text.length > 500) text = text.slice(0, 500) + '…';

    try {
      const avatarBuffer = await fetchAvatarBuffer(targetUser);
      const member = message.guild ? await message.guild.members.fetch(targetUser.id).catch(() => null) : null;
      const displayName = (member && member.displayName) || targetUser.globalName || targetUser.username;

      const png = await generateQuoteImage({
        avatarBuffer,
        text,
        displayName,
        username: targetUser.username,
      });

      const file = new AttachmentBuilder(png, { name: 'quote.png' });
      return message.channel.send({ files: [file] });
    } catch (e) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Failed to render quote — \`${(e && e.message) || 'unknown error'}\``)],
      });
    }
  },
};
