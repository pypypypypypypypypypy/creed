const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const fetch = require('node-fetch');
const path = require('path');

// ── Font — loaded synchronously from repo at module load ────────────────────
const FONT_PATH   = path.join(__dirname, '../assets/QuoteFont.woff2');
const FONT_FAMILY = 'QuoteFont';

try {
  GlobalFonts.registerFromPath(FONT_PATH, FONT_FAMILY);
} catch (e) {
  console.warn('[quote] font load failed:', e.message);
  try { GlobalFonts.loadSystemFonts(); } catch {}
}

// ── Canvas constants (matched to reference image) ────────────────────────────
const W          = 1024;  // canvas width
const H          = 512;   // canvas height
const IMG_W      = 395;   // left image panel width  (~38.6%)
const TEXT_PAD_L = 28;    // padding left inside text panel
const TEXT_PAD_R = 28;    // padding right
const TEXT_X     = IMG_W + TEXT_PAD_L;          // text left edge
const TEXT_MAX_W = W - IMG_W - TEXT_PAD_L - TEXT_PAD_R; // ~573px

// ── Helpers ──────────────────────────────────────────────────────────────────

function wrapText(ctx, text, maxWidth) {
  // Split on spaces — but also hard-wrap any word wider than maxWidth
  const rawWords = text.split(' ');
  const words = [];
  for (const w of rawWords) {
    if (ctx.measureText(w).width <= maxWidth) {
      words.push(w);
    } else {
      // Hard-break long words (e.g. URLs) character by character
      let chunk = '';
      for (const ch of w) {
        if (ctx.measureText(chunk + ch).width > maxWidth) {
          if (chunk) words.push(chunk);
          chunk = ch;
        } else {
          chunk += ch;
        }
      }
      if (chunk) words.push(chunk);
    }
  }

  const lines = [];
  let cur = '';
  for (const word of words) {
    const test = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = word;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

async function buildQuoteImage({ text, displayName, username, imageUrl }) {
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext('2d');

  // 1. Black base
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  // 2. Left image panel — cover-cropped, right edge fades into black
  if (imageUrl) {
    try {
      const buf = await fetch(imageUrl, { timeout: 8000 }).then(r => r.buffer());
      const img = await loadImage(buf);

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, IMG_W, H);
      ctx.clip();

      const scale = Math.max(IMG_W / img.width, H / img.height);
      const dw = img.width  * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, (IMG_W - dw) / 2, (H - dh) / 2, dw, dh);
      ctx.restore();

      // Right-edge gradient — starts 130px before the panel edge
      const grad = ctx.createLinearGradient(IMG_W - 130, 0, IMG_W, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,1)');
      ctx.fillStyle = grad;
      ctx.fillRect(IMG_W - 130, 0, 130, H);
    } catch (e) {
      console.warn('[quote] image load error:', e.message);
    }
  }

  // 3. Quote text
  // Reserve bottom space for attribution (2 lines ~56px)
  const ATTR_RESERVE = 70;
  const TEXT_AREA_H  = H - ATTR_RESERVE;

  // Auto-shrink until text block fits vertically
  let fontSize = 48;
  let lines    = [];
  while (fontSize >= 14) {
    ctx.font = `400 ${fontSize}px "${FONT_FAMILY}"`;
    lines = wrapText(ctx, text, TEXT_MAX_W);
    const lineH   = fontSize * 1.25;
    const blockH  = lines.length * lineH;
    const startY  = 48; // how far from top the text starts
    if (startY + blockH <= TEXT_AREA_H) break;
    fontSize -= 2;
  }

  const lineH  = fontSize * 1.25;
  let ty = 48 + fontSize; // baseline of first line

  ctx.fillStyle = '#ffffff';
  ctx.font      = `400 ${fontSize}px "${FONT_FAMILY}"`;
  for (const line of lines) {
    ctx.fillText(line, TEXT_X, ty);
    ty += lineH;
  }

  // 4. Attribution — no divider, just text near bottom
  const nameSize = 22;
  const userSize = 15;

  ctx.fillStyle = '#ffffff';
  ctx.font      = `italic ${nameSize}px "${FONT_FAMILY}"`;
  ctx.fillText(`- ${displayName}`, TEXT_X, H - 38);

  ctx.fillStyle = '#888888';
  ctx.font      = `${userSize}px "${FONT_FAMILY}"`;
  ctx.fillText(`@${username}`, TEXT_X, H - 15);

  return canvas.toBuffer('image/png');
}

// ── Resolve helper ───────────────────────────────────────────────────────────

async function resolveTarget(message, args) {
  let targetUser = null, text = '', imageUrl = null;

  if (message.reference?.messageId) {
    const replied = await message.channel.messages
      .fetch(message.reference.messageId).catch(() => null);
    if (replied) {
      targetUser = replied.author;
      text       = replied.content?.trim() || '';
      if (!text && replied.embeds.length)
        text = replied.embeds[0].description || replied.embeds[0].title || '';
      if (!text && replied.attachments.size) text = '[attachment]';
      const att  = [...replied.attachments.values()]
        .find(a => a.contentType?.startsWith('image'));
      if (att) imageUrl = att.url;
    }
  }

  if (!targetUser) {
    const mention = message.mentions.users.first();
    if (mention) {
      targetUser = mention;
      text = args.filter(a => !a.match(new RegExp(`<@!?${mention.id}>`))).join(' ').trim();
    }
  }

  if (!targetUser) {
    targetUser = message.author;
    text       = args.join(' ').trim();
  }

  if (!imageUrl)
    imageUrl = targetUser.displayAvatarURL({ forceStatic: true, size: 512, extension: 'png' });

  return { targetUser, text, imageUrl };
}

// ── Export ───────────────────────────────────────────────────────────────────

module.exports = {
  name: 'quote',
  aliases: ['q'],
  category: 'utility',
  help: [{
    name:        'quote',
    description: 'Quote a message as a stylized image card.',
    aliases:     'q',
    parameters:  '[@user] <text>  |  reply to a message',
    information: 'Reply to a message, or pass @user + text, or just text.',
    usage:       'quote [@user] <text>',
    example:     'quote @bob life is short',
  }],

  slashData: {
    name:          'quote',
    description:   'Generate a stylized quote image card',
    dm_permission: true,
    options: [
      { type: 3, name: 'text',      description: 'The text to quote',                            required: true  },
      { type: 6, name: 'user',      description: 'Who said it (defaults to you)',                 required: false },
      { type: 3, name: 'image_url', description: 'Optional left-panel background image URL',     required: false },
    ],
  },

  runSlash: async (client, interaction) => {
    await interaction.deferReply();
    const text       = interaction.options.getString('text');
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const imageUrl   = interaction.options.getString('image_url')
      || targetUser.displayAvatarURL({ forceStatic: true, size: 512, extension: 'png' });
    const displayName = targetUser.globalName || targetUser.username;
    const safe = text.length > 600 ? text.slice(0, 600) + '\u2026' : text;
    try {
      const buf = await buildQuoteImage({ text: safe, displayName, username: targetUser.username, imageUrl });
      await interaction.editReply({ files: [new AttachmentBuilder(buf, { name: 'quote.png' })] });
    } catch (e) {
      await interaction.editReply({ content: `Could not generate quote: ${e.message}` });
    }
  },

  run: async (client, message, args) => {
    const { targetUser, text, imageUrl } = await resolveTarget(message, args);

    if (!text) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(
        `${warn} ${message.author}: Reply to a message or provide text.\n\`\`\`\n,quote some text\n,quote @user some text\n\`\`\``
      )] });
    }

    const safe = text.length > 600 ? text.slice(0, 600) + '\u2026' : text;
    const member = message.guild
      ? await message.guild.members.fetch(targetUser.id).catch(() => null)
      : null;
    const displayName = member?.displayName || targetUser.globalName || targetUser.username;

    try {
      message.channel.sendTyping().catch(() => {});
      const buf = await buildQuoteImage({ text: safe, displayName, username: targetUser.username, imageUrl });
      if (message.guild) await message.delete().catch(() => {});
      message.channel.send({ files: [new AttachmentBuilder(buf, { name: 'quote.png' })] });
    } catch (e) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(
        `${warn} ${message.author}: Failed to generate quote: \`${e.message}\``
      )] });
    }
  },
};
