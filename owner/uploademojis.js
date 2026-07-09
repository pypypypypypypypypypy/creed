const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const https = require('https');
const AdmZip = require('adm-zip');
const { color } = require('../config.json');
const { canRunOwnerCmd } = require('../utils/owners');

const VALID_EXT = ['.png', '.gif', '.jpg', '.jpeg', '.webp'];

const NAME_ALIASES = {
  warning: ['warn'],
  fail: ['deny'],
  success: ['approve', 'verifiedBot', 'verifiedServer'],
  loading: ['slots'],
  bug_hunter: ['bugHunter'],
  bug_hunter_level_2: ['bugHunterPlus'],
  verified_bot_developer: ['verifiedBotDev'],
  hypesquad: ['hypeSquad'],
  hypesquad_balance: ['hypeSquadBal'],
  hypesquad_bravery: ['hypeSquadBravery'],
  hypesquad_brilliance: ['hypeSquadBril'],
  staff: ['discordStaff'],
  partner: ['discordPartner'],
  early_supporter: ['earlySupporter'],
  lock: ['vm_lock'],
  unlock: ['vm_unlock'],
  ghost: ['vm_ghost'],
  reveal: ['vm_reveal'],
  claim: ['vm_claim'],
  disconnect: ['vm_disconnect'],
  activity: ['vm_activity'],
  information: ['vm_info'],
  increase: ['vm_increase'],
  decrease: ['vm_decrease'],
};

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 30000 }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
        return fetchBuffer(res.headers.location).then(resolve, reject);
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
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 32) || 'emoji';
}

async function pushEmojiJsonToGitHub(content) {
  const token = process.env.DROWN_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) return { ok: false, reason: 'no token' };
  const owner = process.env.DROWN_GITHUB_OWNER || 'abannition';
  const repo = process.env.DROWN_GITHUB_REPO || 'bored';
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/emojis.json`;
  try {
    const getRes = await fetch(apiUrl, { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'bored-bot' } });
    const sha = getRes.ok ? (await getRes.json()).sha : null;
    const body = { message: 'Auto-update emojis.json from ,uploademojis', content: Buffer.from(content).toString('base64'), branch: 'main' };
    if (sha) body.sha = sha;
    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'bored-bot', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { ok: putRes.ok, reason: putRes.ok ? 'pushed' : `HTTP ${putRes.status}` };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

module.exports = {
  name: 'uploademojis',
  aliases: ['uploademoji', 'emojiupload'],
  category: 'owner',
  help: [{
    name: 'uploademojis',
    description: 'Upload every image inside an attached .zip as an emoji in this server',
    aliases: 'uploademoji',
    parameters: '(attach .zip)',
    information: 'Bot owner only',
    usage: 'uploademojis (with .zip attachment)',
    example: 'uploademojis',
  }],

  run: async (client, message, args) => {
    if (!canRunOwnerCmd(message.author.id, 'uploademojis')) return;

    const att = message.attachments.find(a => /\.zip$/i.test(a.name || a.url || ''));
    if (!att) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`${message.author}: Attach a **.zip** of emoji images.`)] });

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

    await status.edit({ embeds: [new EmbedBuilder().setColor(color).setDescription(`Uploading **${entries.length}** emojis to **${message.guild.name}**...`)] });

    const emojiJsonPath = path.join(__dirname, '..', 'emojis.json');
    const currentEmojis = JSON.parse(fs.readFileSync(emojiJsonPath, 'utf8'));
    const existing = await message.guild.emojis.fetch().catch(() => null);
    const results = [];
    let ok = 0, fail = 0, replaced = 0, quotaHit = false;

    const sleep = ms => new Promise(r => setTimeout(r, ms));
    let lastProgressEdit = 0;

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const base = path.basename(entry.entryName, path.extname(entry.entryName));
      const name = sanitizeName(base);
      const data = entry.getData();

      if (existing) {
        const dupe = existing.find(e => e.name === name);
        if (dupe) { await dupe.delete('Replaced by ,uploademojis').catch(() => {}); replaced++; await sleep(250); }
      }

      try {
        const created = await message.guild.emojis.create({ attachment: data, name });
        const tag = `<${created.animated ? 'a' : ''}:${created.name}:${created.id}>`;
        currentEmojis[name] = tag;
        for (const aliasKey of (NAME_ALIASES[name] || [])) currentEmojis[aliasKey] = tag;
        ok++;
        results.push(`${tag} \`${name}\``);
      } catch (e) {
        fail++;
        const msg = (e && e.message) || 'unknown';
        results.push(`FAIL \`${name}\` — ${msg.slice(0, 80)}`);
        if (/Maximum number of emojis|50138|30008/i.test(msg)) {
          quotaHit = true;
          results.push(`Stopped: server emoji slots are full.`);
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
      `**${ok}** uploaded · **${fail}** failed · **${replaced}** replaced${quotaHit ? ' · **server slot limit reached**' : ''}\n\n` +
      results.slice(0, 30).join('\n') +
      (results.length > 30 ? `\n…and ${results.length - 30} more` : '') +
      `\n\n${push.ok ? 'emojis.json pushed to GitHub' : `GitHub push: ${push.reason}`}`;

    await status.edit({ embeds: [new EmbedBuilder().setColor(ok && !fail ? '#2ecc71' : color).setTitle('Emoji Upload').setDescription(description)] });
  },
};
