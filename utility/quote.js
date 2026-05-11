const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const fetch = require('node-fetch');

// ── Font bootstrap ──────────────────────────────────────────────────────────
// @napi-rs/canvas ships with no fonts on Railway/Linux.
// We download Inter from jsDelivr once and cache it in memory.

let fontReady = false;

async function ensureFont() {
  if (fontReady) return;
  // Try system fonts first (works locally, may have nothing on Railway)
  try { GlobalFonts.loadSystemFonts(); } catch {}
  // Always load Inter so we have a guaranteed font
  try {
    const res = await fetch(
      'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.18/files/inter-latin-600-normal.woff2',
      { timeout: 10000 }
    );
    if (res.ok) {
      const buf = await res.arrayBuffer();
      GlobalFonts.register(Buffer.from(buf), 'QuoteFont');
      fontReady = true;
      return;
    }
  } catch {}
  // Fallback: try a second CDN (Roboto)
  try {
    const res = await fetch(
      'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2',
      { timeout: 10000 }
    );
    if (res.ok) {
      const buf = await res.arrayBuffer();
      GlobalFonts.register(Buffer.from(buf), 'QuoteFont');
    }
  } catch {}
  fontReady = true;
}

// Pre-warm on module load (non-blocking)
ensureFont().catch(() => {});

// ── Canvas helpers ──────────────────────────────────────────────────────────

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function buildQuoteImage({ text, displayName, username, imageUrl }) {
  await ensureFont();

  const fontFamily = GlobalFonts.families.some(f => f.family === 'QuoteFont')
    ? 'QuoteFont'
    : (GlobalFonts.families[0]?.family || 'sans-serif');

  const W = 1000, H = 500;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Full black base
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, W, H);

  // ── Left panel — image cover-cropped into 500×500 ──
  if (imageUrl) {
    try {
      const buf = await fetch(imageUrl, { timeout: 8000 }).then(r => r.buffer());
      const img = await loadImage(buf);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, 500, H);
      ctx.clip();
      const scale = Math.max(500 / img.width, H / img.height);
      const dw = img.width * scale, dh = img.height * scale;
      const dx = (500 - dw) / 2, dy = (H - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();

      // Soft right-edge fade
      const grad = ctx.createLinearGradient(340, 0, 500, 0);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.75)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 500, H);
    } catch {}
  }

  // ── Right panel text ──
  const pad = 44;
  const textX = 500 + pad;
  const textMaxW = W - 500 - pad * 2; // 412 px
  const textAreaH = H - 130;

  // Auto-size to fit
  let fontSize = 36;
  let lines = [];
  while (fontSize >= 14) {
    ctx.font = `600 ${fontSize}px "${fontFamily}"`;
    lines = wrapText(ctx, text, textMaxW);
    const totalH = lines.length * (fontSize * 1.5);
    if (totalH <= textAreaH) break;
    fontSize -= 2;
  }

  // Vertically centre text block
  const lineH = fontSize * 1.5;
  const totalTextH = lines.length * lineH;
  let y = Math.max(fontSize + pad, (H - 120 - totalTextH) / 2 + fontSize + 20);

  ctx.fillStyle = '#ffffff';
  ctx.font = `600 ${fontSize}px "${fontFamily}"`;
  for (const line of lines) {
    ctx.fillText(line, textX, y);
    y += lineH;
  }

  // Subtle divider
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(textX, H - 88);
  ctx.lineTo(W - pad, H - 88);
  ctx.stroke();

  // "— DisplayName"
  ctx.fillStyle = '#ffffff';
  ctx.font = `italic ${Math.min(22, fontSize)}px "${fontFamily}"`;
  ctx.fillText(`\u2014 ${displayName}`, textX, H - 56);

  // "@username"
  ctx.fillStyle = '#777777';
  ctx.font = `${Math.min(16, fontSize - 4)}px "${fontFamily}"`;
  ctx.fillText(`@${username}`, textX, H - 28);

  return canvas.toBuffer('image/png');
}

// ── Shared resolve helpers ───────────────────────────────────────────────────

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
      const att = [...replied.attachments.values()]
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
    text = args.join(' ').trim();
  }

  if (!imageUrl)
    imageUrl = targetUser.displayAvatarURL({ forceStatic: true, size: 512, extension: 'png' });

  return { targetUser, text, imageUrl };
}

// ── Command ──────────────────────────────────────────────────────────────────

module.exports = {
  name: 'quote',
  aliases: ['q'],
  category: 'utility',
  help: [
    {
      name: 'quote',
      description: 'Quote a message as a stylized image card.',
      aliases: 'q',
      parameters: '[@user] <text>  |  reply to a message',
      information: 'Reply to a message, or pass @user + text, or just text.',
      usage: 'quote [@user] <text>',
      example: 'quote @bob life is short',
    },
  ],

  slashData: {
    name: 'quote',
    description: 'Generate a stylized quote image card',
    dm_permission: true,
    options: [
      { type: 3, name: 'text',      description: 'The text to quote',                                    required: true  },
      { type: 6, name: 'user',      description: 'Who said it (defaults to you)',                         required: false },
      { type: 3, name: 'image_url', description: 'Optional background image URL for the left panel',     required: false },
    ],
  },

  runSlash: async (client, interaction) => {
    await interaction.deferReply();
    const text      = interaction.options.getString('text');
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const imageUrl  = interaction.options.getString('image_url')
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
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(
          `${warn} ${message.author}: Reply to a message, or provide some text.\n\`\`\`\n,quote some text\n,quote @user some text\n\`\`\``
        )],
      });
    }

    const safe = text.length > 500 ? text.slice(0, 500) + '\u2026' : text;
    const member = message.guild
      ? await message.guild.members.fetch(targetUser.id).catch(() => null)
      : null;
    const displayName = (member && member.displayName) || targetUser.globalName || targetUser.username;

    try {
      message.channel.sendTyping().catch(() => {});
      const buf = await buildQuoteImage({ text: safe, displayName, username: targetUser.username, imageUrl });
      if (message.guild) await message.delete().catch(() => {});
      message.channel.send({ files: [new AttachmentBuilder(buf, { name: 'quote.png' })] });
    } catch (e) {
      message.channel.send({
        embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(
          `${warn} ${message.author}: Failed to generate quote image: \`${e.message}\``
        )],
      });
    }
  },
};
