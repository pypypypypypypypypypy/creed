const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

// ── Font registration — runs once at module load (synchronous) ───────────────
const FONT_PATH = path.join(__dirname, '../assets/QuoteFont.woff2');
const FONT_FAMILY = 'QuoteFont';

try {
  GlobalFonts.registerFromPath(FONT_PATH, FONT_FAMILY);
} catch (e) {
  console.warn('[quote] font registration failed:', e.message);
  // Last-resort: load whatever system fonts are available
  try { GlobalFonts.loadSystemFonts(); } catch {}
}

// ── Text helpers ────────────────────────────────────────────────────────────

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
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

// ── Image builder ────────────────────────────────────────────────────────────

async function buildQuoteImage({ text, displayName, username, imageUrl }) {
  const W = 1000, H = 500;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // 1. Black background across the whole canvas
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  // 2. Left panel — image/avatar, cover-cropped to 500×500
  if (imageUrl) {
    try {
      const imgBuf = await fetch(imageUrl, { timeout: 8000 }).then(r => r.buffer());
      const img = await loadImage(imgBuf);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, 500, H);
      ctx.clip();
      const scale = Math.max(500 / img.width, H / img.height);
      const dw = img.width * scale, dh = img.height * scale;
      ctx.drawImage(img, (500 - dw) / 2, (H - dh) / 2, dw, dh);
      ctx.restore();

      // Right-edge fade so text area feels clean
      const grad = ctx.createLinearGradient(340, 0, 500, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.8)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 500, H);
    } catch (e) {
      console.warn('[quote] image load failed:', e.message);
    }
  }

  // 3. Quote text — right panel
  const PAD  = 44;
  const TX   = 500 + PAD;         // text left edge
  const TW   = W - 500 - PAD * 2; // 412 px
  const AREA = H - 130;           // vertical space for text block

  // Auto-shrink font until text fits
  let fontSize = 36;
  let lines = [];
  while (fontSize >= 14) {
    ctx.font = `600 ${fontSize}px "${FONT_FAMILY}"`;
    lines = wrapText(ctx, text, TW);
    if (lines.length * fontSize * 1.5 <= AREA) break;
    fontSize -= 2;
  }

  // Vertically centre the text block in the available area
  const lineH     = fontSize * 1.5;
  const blockH    = lines.length * lineH;
  let y = Math.max(PAD + fontSize, (H - 120 - blockH) / 2 + fontSize + 10);

  ctx.fillStyle = '#ffffff';
  ctx.font = `600 ${fontSize}px "${FONT_FAMILY}"`;
  for (const line of lines) {
    ctx.fillText(line, TX, y);
    y += lineH;
  }

  // 4. Thin divider
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(TX, H - 88);
  ctx.lineTo(W - PAD, H - 88);
  ctx.stroke();

  // 5. Attribution
  const nameSize = Math.min(22, fontSize);
  const userSize = Math.min(15, fontSize - 4);

  ctx.fillStyle = '#ffffff';
  ctx.font = `italic ${nameSize}px "${FONT_FAMILY}"`;
  ctx.fillText(`\u2014 ${displayName}`, TX, H - 54);

  ctx.fillStyle = '#777777';
  ctx.font = `${userSize}px "${FONT_FAMILY}"`;
  ctx.fillText(`@${username}`, TX, H - 27);

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
      text = replied.content?.trim() || '';
      if (!text && replied.embeds.length)
        text = replied.embeds[0].description || replied.embeds[0].title || '';
      if (!text && replied.attachments.size) text = '[attachment]';
      const att = [...replied.attachments.values()].find(a => a.contentType?.startsWith('image'));
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
    text = args.join(' ').trim();
  }

  if (!imageUrl)
    imageUrl = targetUser.displayAvatarURL({ forceStatic: true, size: 512, extension: 'png' });

  return { targetUser, text, imageUrl };
}

// ── Command export ───────────────────────────────────────────────────────────

module.exports = {
  name: 'quote',
  aliases: ['q'],
  category: 'utility',
  help: [{
    name: 'quote',
    description: 'Quote a message as a stylized image card.',
    aliases: 'q',
    parameters: '[@user] <text>  |  reply to a message',
    information: 'Reply to a message to quote it, or pass @user + text, or just text.',
    usage: 'quote [@user] <text>',
    example: 'quote @bob life is short',
  }],

  slashData: {
    name: 'quote',
    description: 'Generate a stylized quote image card',
    dm_permission: true,
    options: [
      { type: 3, name: 'text',      description: 'The text to quote',                                required: true  },
      { type: 6, name: 'user',      description: 'Who said it (defaults to you)',                     required: false },
      { type: 3, name: 'image_url', description: 'Optional left-panel background image URL',         required: false },
    ],
  },

  runSlash: async (client, interaction) => {
    await interaction.deferReply();
    const text       = interaction.options.getString('text');
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const imageUrl   = interaction.options.getString('image_url')
      || targetUser.displayAvatarURL({ forceStatic: true, size: 512, extension: 'png' });
    const displayName = targetUser.globalName || targetUser.username;
    const safe = text.length > 500 ? text.slice(0, 500) + '\u2026' : text;
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

    const safe = text.length > 500 ? text.slice(0, 500) + '\u2026' : text;
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
