const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const https = require('https');
const AdmZip = require('adm-zip');
const { color } = require('../config.json');
const { canRunOwnerCmd } = require('../utils/owners');

const VALID_EXT = ['.png', '.gif', '.jpg', '.jpeg', '.webp'];

const RANK_MAP = {
  'a': 'a', 'ace': 'a', '1': 'a',
  '2': '2', 'two': '2',
  '3': '3', 'three': '3',
  '4': '4', 'four': '4',
  '5': '5', 'five': '5',
  '6': '6', 'six': '6',
  '7': '7', 'seven': '7',
  '8': '8', 'eight': '8',
  '9': '9', 'nine': '9',
  '10': '10', 't': '10', 'ten': '10',
  'j': 'j', 'jack': 'j',
  'q': 'q', 'queen': 'q',
  'k': 'k', 'king': 'k',
};

const SUIT_MAP = {
  's': 'spades', 'spade': 'spades', 'spades': 'spades',
  'h': 'hearts', 'heart': 'hearts', 'hearts': 'hearts',
  'd': 'diamonds', 'diamond': 'diamonds', 'diamonds': 'diamonds',
  'c': 'clubs', 'club': 'clubs', 'clubs': 'clubs',
};

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 30000 }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchBuffer(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
  });
}

function sanitizeName(raw) {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 32) || 'card';
}

// Try to parse rank+suit out of a filename like "2_of_spades", "ace-hearts",
// "card_k_diamonds", "10c", "qh", "AS", "card_back", "joker_red".
function parseCardName(base) {
  const lower = base.toLowerCase();

  if (/joker.*red|red.*joker/.test(lower)) return 'card_joker_red';
  if (/joker.*black|black.*joker/.test(lower)) return 'card_joker_black';
  if (/^joker$|^card_joker$/.test(lower)) return 'card_joker';
  if (/back/.test(lower)) return 'card_back';

  const tokens = lower
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter(t => t !== 'of' && t !== 'card');

  let rank = null, suit = null;
  for (const t of tokens) {
    if (!rank && RANK_MAP[t]) { rank = RANK_MAP[t]; continue; }
    if (!suit && SUIT_MAP[t]) { suit = SUIT_MAP[t]; continue; }
  }

  if (!rank || !suit) {
    const compact = lower.replace(/[^a-z0-9]/g, '');
    const m = compact.match(/^(10|[2-9akqj])([shdc])$/) || compact.match(/^([shdc])(10|[2-9akqj])$/);
    if (m) {
      const a = m[1], b = m[2];
      if (RANK_MAP[a] && SUIT_MAP[b]) { rank = RANK_MAP[a]; suit = SUIT_MAP[b]; }
      else if (RANK_MAP[b] && SUIT_MAP[a]) { rank = RANK_MAP[b]; suit = SUIT_MAP[a]; }
    }
  }

  if (rank && suit) return `card_${rank}_${suit}`;
  return null;
}

async function pushEmojiJsonToGitHub(content) {
  const token = process.env.DROWN_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) return { ok: false, reason: 'no token' };
  const owner = process.env.DROWN_GITHUB_OWNER || 'abannition';
  const repo = process.env.DROWN_GITHUB_REPO || 'drown-xd';
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/emojis.json`;
  try {
    const getRes = await fetch(apiUrl, { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'drown-bot' } });
    const sha = getRes.ok ? (await getRes.json()).sha : null;
    const body = { message: 'Auto-update emojis.json from ,blackjackemojis', content: Buffer.from(content).toString('base64'), branch: 'main' };
    if (sha) body.sha = sha;
    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'drown-bot', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { ok: putRes.ok, reason: putRes.ok ? 'pushed' : `HTTP ${putRes.status}` };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

module.exports = {
  name: 'blackjackemojis',
  aliases: ['bjemojis', 'cardemojis'],
  category: 'owner',
  help: [{
    name: 'blackjackemojis',
    description: 'Upload every card image inside an attached .zip as an APPLICATION (bot) emoji',
    aliases: 'bjemojis, cardemojis',
    parameters: '(attach .zip)',
    information: 'Bot owner only. Uploads to the bot application — usable in any server, no server slot consumed. Limit 2000.',
    usage: 'blackjackemojis (with .zip attachment)',
    example: 'blackjackemojis',
  }],

  run: async (client, message) => {
    if (!canRunOwnerCmd(message.author.id, 'blackjackemojis')) return;

    const att = message.attachments.find(a => /\.zip$/i.test(a.name || a.url || ''));
    if (!att) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`${message.author}: Attach a **.zip** of card images (e.g. \`2_of_spades.png\`, \`ace_hearts.png\`, \`card_back.png\`).`)] });

    const status = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`Downloading \`${att.name}\`...`)] });

    let buf;
    try { buf = await fetchBuffer(att.url); }
    catch (e) { return status.edit({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`Download failed: \`${e.message}\``)] }); }

    let entries;
    try {
      const zip = new AdmZip(buf);
      entries = zip.getEntries().filter(e => !e.isDirectory && VALID_EXT.includes(path.extname(e.entryName).toLowerCase()));
    } catch (e) {
      return status.edit({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`Could not read zip: \`${e.message}\``)] });
    }

    if (!entries.length) return status.edit({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`No image files found in zip.`)] });

    if (!client.application) {
      try { await client.application.fetch(); } catch (_) {}
    }
    if (!client.application || !client.application.emojis) {
      return status.edit({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`This discord.js version doesn't expose application emojis. Update discord.js to >=14.18.`)] });
    }

    await status.edit({ embeds: [new EmbedBuilder().setColor(color).setDescription(`Uploading **${entries.length}** card emojis to the **bot application** (global to the bot)...`)] });

    const emojiJsonPath = path.join(__dirname, '..', 'emojis.json');
    const currentEmojis = JSON.parse(fs.readFileSync(emojiJsonPath, 'utf8'));

    let existing = null;
    try { existing = await client.application.emojis.fetch(); } catch (_) {}

    const results = [];
    let ok = 0, fail = 0, replaced = 0, quotaHit = false;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    let lastProgressEdit = 0;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const base = path.basename(entry.entryName, path.extname(entry.entryName));
      const parsed = parseCardName(base);
      const name = (parsed || `card_${sanitizeName(base)}`).slice(0, 32);
      const data = entry.getData();

      if (existing) {
        const dupe = existing.find(e => e.name === name);
        if (dupe) {
          try { await client.application.emojis.delete(dupe.id, 'Replaced by ,blackjackemojis'); replaced++; await sleep(250); }
          catch (_) {}
        }
      }

      try {
        const created = await client.application.emojis.create({ attachment: data, name });
        const tag = `<${created.animated ? 'a' : ''}:${created.name}:${created.id}>`;
        currentEmojis[name] = tag;
        ok++;
        results.push(`${tag} \`${name}\``);
      } catch (e) {
        fail++;
        const msg = (e && e.message) || 'unknown';
        results.push(`FAIL \`${name}\` — ${msg.slice(0, 80)}`);
        if (/Maximum number of emojis|2000/i.test(msg)) {
          quotaHit = true;
          results.push(`Stopped: bot application emoji slots are full (2000 max).`);
          break;
        }
      }

      await sleep(500);

      const nowT = Date.now();
      if (nowT - lastProgressEdit > 4000 || i === entries.length - 1) {
        lastProgressEdit = nowT;
        await status.edit({ embeds: [new EmbedBuilder().setColor(color).setDescription(`Progress: **${i + 1}/${entries.length}** · ✅ ${ok} · ❌ ${fail}`)] }).catch(() => {});
      }
    }

    const newContent = JSON.stringify(currentEmojis, null, 2);
    fs.writeFileSync(emojiJsonPath, newContent);
    delete require.cache[require.resolve('../emojis.json')];

    const push = await pushEmojiJsonToGitHub(newContent);

    const description =
      `**${ok}** uploaded · **${fail}** failed · **${replaced}** replaced${quotaHit ? ' · **app slot limit reached**' : ''}\n` +
      `Uploaded as **application emojis** — usable by the bot in any server it's in.\n\n` +
      results.slice(0, 30).join('\n') +
      (results.length > 30 ? `\n…and ${results.length - 30} more` : '') +
      `\n\n${push.ok ? 'emojis.json pushed to GitHub' : `GitHub push: ${push.reason}`}`;

    await status.edit({ embeds: [new EmbedBuilder().setColor(ok && !fail ? '#2ecc71' : color).setTitle('Blackjack Emoji Upload (Bot Application)').setDescription(description)] });
  },
};
