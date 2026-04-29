const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const os = require('os');
const AdmZip = require('adm-zip');
const { color } = require('../config.json');

const { canRunOwnerCmd } = require('../utils/owners');

// Anything matching these is excluded from the source zip — heavy build
// artifacts, repo metadata, secrets, and previous zip dumps from this command.
const EXCLUDE_DIRS = new Set([
  'node_modules', '.git', '.cache', '.local', '.replit',
  'dist', 'out', 'tmp', 'coverage', 'logs',
]);
const EXCLUDE_FILE_PATTERNS = [
  /^\.env(\.|$)/i,        // .env, .env.local, .env.production
  /^npm-debug\.log/i,
  /^yarn-error\.log/i,
  /\.log$/i,
  /\.DS_Store$/i,
  /^drown-bot-fixed\.zip$/i,
  /^drown-xd-source.*\.zip$/i,
  /^drown-xd-emojis.*\.zip$/i,
];

function shouldExcludeFile(name) {
  return EXCLUDE_FILE_PATTERNS.some((re) => re.test(name));
}

function walkAndZip(zip, baseDir, currentDir = baseDir) {
  let entries;
  try { entries = fs.readdirSync(currentDir, { withFileTypes: true }); }
  catch { return; }

  for (const entry of entries) {
    const full = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      walkAndZip(zip, baseDir, full);
    } else if (entry.isFile()) {
      if (shouldExcludeFile(entry.name)) continue;
      const rel = path.relative(baseDir, full);
      try {
        const data = fs.readFileSync(full);
        zip.addFile(rel.split(path.sep).join('/'), data);
      } catch {}
    }
  }
}

// Parse <:name:id> and <a:name:id> from a string. Returns {id, name, animated}[].
function extractEmojiTags(text) {
  const out = [];
  const re = /<(a?):([A-Za-z0-9_]+):(\d+)>/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    out.push({ animated: m[1] === 'a', name: m[2], id: m[3] });
  }
  return out;
}

async function downloadEmoji(id, animated) {
  const ext = animated ? 'gif' : 'png';
  const url = `https://cdn.discordapp.com/emojis/${id}.${ext}?size=128&quality=lossless`;
  const res = await fetch(url);
  if (!res.ok) {
    // Try the other extension as a fallback (some uploaded emojis flip).
    const alt = animated ? 'png' : 'gif';
    const altRes = await fetch(`https://cdn.discordapp.com/emojis/${id}.${alt}?size=128&quality=lossless`);
    if (!altRes.ok) return null;
    const buf = Buffer.from(await altRes.arrayBuffer());
    return { buf, ext: alt };
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return { buf, ext };
}

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

async function buildSourceZip() {
  // The bot's running directory — walk up from this file (owner/zipup.js -> repo root).
  const root = path.resolve(__dirname, '..');
  const zip = new AdmZip();
  walkAndZip(zip, root, root);
  const buf = zip.toBuffer();
  return { buf, fileCount: zip.getEntries().length };
}

async function buildEmojiZip(client) {
  // 1. Application emojis (the ones uploaded directly to the bot).
  const appEmojis = [];
  try {
    const fetched = await client.application.emojis.fetch();
    for (const e of fetched.values()) {
      appEmojis.push({ id: e.id, name: e.name, animated: e.animated, source: 'app' });
    }
  } catch {}

  // 2. Emojis referenced inside emojis.json (guild-uploaded ones the bot uses).
  let jsonTags = [];
  try {
    const raw = fs.readFileSync(path.resolve(__dirname, '..', 'emojis.json'), 'utf8');
    jsonTags = extractEmojiTags(raw).map((t) => ({ ...t, source: 'json' }));
  } catch {}

  // Dedupe by id (prefer app-source metadata when both exist).
  const seen = new Map();
  for (const e of [...appEmojis, ...jsonTags]) {
    if (!seen.has(e.id)) seen.set(e.id, e);
  }
  const all = [...seen.values()];

  const zip = new AdmZip();
  let ok = 0, fail = 0;
  for (const e of all) {
    const dl = await downloadEmoji(e.id, e.animated).catch(() => null);
    if (!dl) { fail++; continue; }
    const safeName = e.name.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64) || `emoji_${e.id}`;
    zip.addFile(`${safeName}.${dl.ext}`, dl.buf);
    ok++;
  }

  // Add a small manifest so the user knows where each came from.
  const manifest = all.map((e) => `${e.name}.${e.animated ? 'gif' : 'png'}\tid=${e.id}\tsource=${e.source}`).join('\n');
  zip.addFile('_manifest.txt', Buffer.from(manifest, 'utf8'));

  return { buf: zip.toBuffer(), total: all.length, ok, fail };
}

module.exports = {
  name: 'zipup',
  aliases: [],
  category: 'owner',
  help: [{
    name: 'zipup',
    description: 'Bot owner only. Sends two zips: full bot source + every emoji the bot uses.',
    aliases: 'n/a',
    parameters: '',
    information: 'Owner-only. Excludes node_modules, .git, .env*, and previous zip artifacts.',
    usage: 'zipup',
    example: ',zipup',
  }],

  run: async (client, message, _args) => {
    // Hard owner gate — silently no-op for everyone else.
    if (!canRunOwnerCmd(message.author.id, 'zipup')) return;

    const status = await message.channel.send({
      embeds: [new EmbedBuilder().setColor(color).setDescription('Packing bot source...')],
    });

    let source;
    try { source = await buildSourceZip(); }
    catch (e) {
      return status.edit({
        embeds: [new EmbedBuilder().setColor('#e74c3c').setDescription(`Source zip failed: \`${e.message}\``)],
      }).catch(() => {});
    }

    await status.edit({
      embeds: [new EmbedBuilder().setColor(color).setDescription(`Source ready (${fmtBytes(source.buf.length)}, ${source.fileCount} files). Downloading emojis...`)],
    }).catch(() => {});

    let emojis;
    try { emojis = await buildEmojiZip(client); }
    catch (e) {
      return status.edit({
        embeds: [new EmbedBuilder().setColor('#e74c3c').setDescription(`Emoji zip failed: \`${e.message}\``)],
      }).catch(() => {});
    }

    const sourceAtt = new AttachmentBuilder(source.buf, { name: 'drown-xd-source.zip' });
    const emojiAtt = new AttachmentBuilder(emojis.buf, { name: 'drown-xd-emojis.zip' });

    const summary = new EmbedBuilder()
      .setColor('#2ecc71')
      .setTitle('zipup complete')
      .setDescription(
        `**Source:** \`drown-xd-source.zip\` — ${fmtBytes(source.buf.length)}, ${source.fileCount} files\n` +
        `**Emojis:** \`drown-xd-emojis.zip\` — ${fmtBytes(emojis.buf.length)}, ${emojis.ok}/${emojis.total} downloaded${emojis.fail ? ` (${emojis.fail} failed)` : ''}`,
      );

    // Try sending both in one message; if Discord rejects it for size, send
    // them in two separate messages so at least one always lands.
    try {
      await message.author.send({ embeds: [summary], files: [sourceAtt, emojiAtt] });
      await status.edit({ embeds: [new EmbedBuilder().setColor('#2ecc71').setDescription('Sent both zips to your DMs.')] }).catch(() => {});
    } catch (e) {
      // DM closed or attachment too big — fall back to channel + split.
      try {
        await status.edit({ embeds: [summary] });
        await message.channel.send({ files: [sourceAtt] });
        await message.channel.send({ files: [emojiAtt] });
      } catch (e2) {
        await status.edit({
          embeds: [new EmbedBuilder().setColor('#e74c3c').setDescription(`Could not send files: \`${(e2 && e2.message) || e.message}\``)],
        }).catch(() => {});
      }
    }
  },
};
