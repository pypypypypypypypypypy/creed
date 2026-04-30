const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { warn } = require('../emojis.json');

// Match the reference image proportions exactly.
const W = 1024;
const H = 576;
const IMG_W = Math.round(W * 0.56);            // image fills left 56%
const FADE_W = 30;                              // narrow soft edge
const TEXT_X0 = IMG_W;                          // text area starts where black starts
const TEXT_W = W - IMG_W;                       // black region width
const TEXT_PAD = 24;                            // inner padding inside black region
const MAX_TEXT_W = TEXT_W - TEXT_PAD * 2;

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

function fitQuote(ctx, text, family) {
  // Match the reference: medium-large, not super bold, fits in ~3-4 lines.
  for (let size = 56; size >= 22; size -= 2) {
    ctx.font = `${size}px ${family}`;
    const lines = wrapLines(ctx, text, MAX_TEXT_W);
    const lh = Math.round(size * 1.18);
    if (lines.length * lh <= H * 0.55) return { size, lh, lines };
  }
  ctx.font = `22px ${family}`;
  return { size: 22, lh: Math.round(22 * 1.18), lines: wrapLines(ctx, text, MAX_TEXT_W) };
}

function drawAvatar(ctx, img) {
  // Cover IMG_W x H with the avatar (crop to fill)
  const aspect = img.width / img.height;
  let dw, dh, dx, dy;
  if (aspect >= IMG_W / H) {
    dh = H; dw = dh * aspect;
    dx = (IMG_W - dw) / 2; dy = 0;
  } else {
    dw = IMG_W; dh = dw / aspect;
    dx = 0; dy = (H - dh) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);

  // Narrow soft edge on the right side of the image so the seam isn't a hard line.
  const grad = ctx.createLinearGradient(IMG_W - FADE_W, 0, IMG_W, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = grad;
  ctx.fillRect(IMG_W - FADE_W, 0, FADE_W, H);
}

async function generateQuoteImage({ avatarBuffer, text, displayName, username }) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Pure black background (right region + behind any image gaps)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  if (avatarBuffer) {
    try {
      const img = await loadImage(avatarBuffer);
      drawAvatar(ctx, img);
    } catch {}
  }

  const family = 'sans-serif';
  const cx = TEXT_X0 + TEXT_W / 2;

  // Fit the quote
  const fit = fitQuote(ctx, text, family);

  // Attribution sizes scale relative to the quote size
  const attrSize = Math.max(14, Math.round(fit.size * 0.42));
  const handleSize = Math.max(12, Math.round(fit.size * 0.34));

  const gapAfterQuote = Math.round(fit.size * 0.35);
  const gapBetweenAttrs = Math.round(attrSize * 0.25);

  const totalH =
    fit.lines.length * fit.lh +
    gapAfterQuote +
    attrSize +
    gapBetweenAttrs +
    handleSize;

  let y = Math.round((H - totalH) / 2);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Quote text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `${fit.size}px ${family}`;
  for (const line of fit.lines) {
    ctx.fillText(line, cx, y);
    y += fit.lh;
  }
  y += gapAfterQuote;

  // - displayName
  ctx.fillStyle = '#bdbdbd';
  ctx.font = `${attrSize}px ${family}`;
  ctx.fillText(`- ${displayName}`, cx, y);
  y += attrSize + gapBetweenAttrs;

  // @username
  ctx.fillStyle = '#7a7a7a';
  ctx.font = `${handleSize}px ${family}`;
  ctx.fillText(`@${username}`, cx, y);

  return canvas.encode('png');
}

async function fetchAvatarBuffer(user) {
  try {
    const url = user.displayAvatarURL({ extension: 'png', forceStatic: true, size: 1024 });
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
      const displayName =
        (member && member.displayName) ||
        targetUser.globalName ||
        targetUser.username;

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
