const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { canRunOwnerCmd } = require('../utils/owners');
const { color } = require('../config.json');

// The badge emojis to upload to the bot application.
// Run ,uploadbadges once and they'll be owned by the bot forever.
const BADGES = [
  { id: '1219378385332207778', name: 'boostheart',          animated: false },
  { id: '1488484682029989928', name: 'early',               animated: false },
  { id: '1488303638278443009', name: 'nitroplatinum',       animated: false },
  { id: '1092897753199288390', name: 'booster',             animated: false },
  { id: '1488303630367854758', name: 'nitrodiamond',        animated: false },
  { id: '1488303644511178752', name: 'bughunter1',          animated: false },
  { id: '1488303634570805308', name: 'nitrogold',           animated: false },
  { id: '1488303628006719692', name: 'nitroruby',           animated: false },
  { id: '1488303645907750913', name: 'bughunter2',          animated: false },
  { id: '1488303629545766932', name: 'nitrosilver',         animated: false },
  { id: '1488303636357316779', name: 'nitroopal',           animated: false },
  { id: '1482687742621257788', name: 'booster2',            animated: false },
  { id: '1488303633014718464', name: 'nitroemerald',        animated: false },
  { id: '1488303642405507365', name: 'quest',               animated: false },
  { id: '1488484718398935240', name: 'partnerserverowner',  animated: false },
  { id: '1488303641314988042', name: 'orbs',                animated: false },
  { id: '1488484694994452620', name: 'earlybotdeveloper',   animated: false },
  { id: '1145742145379119245', name: 'hypebadge',           animated: false },
  { id: '1500203974278643802', name: 'quest2',              animated: false },
];

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 15000 }, res => {
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

async function pushEmojiJsonToGitHub(content) {
  const token = process.env.DROWN_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) return { ok: false, reason: 'no GitHub token' };
  const owner = process.env.DROWN_GITHUB_OWNER || 'abannition';
  const repo  = process.env.DROWN_GITHUB_REPO  || 'drown-xd';
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/emojis.json`;
  try {
    const getRes = await fetch(apiUrl, { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'drown-bot' } });
    const sha = getRes.ok ? (await getRes.json()).sha : null;
    const body = { message: 'feat: upload badge emojis to bot application', content: Buffer.from(content).toString('base64'), branch: 'main' };
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

const sleep = ms => new Promise(r => setTimeout(r, ms));

module.exports = {
  name: 'uploadbadges',
  aliases: ['ubadges'],
  category: 'owner',
  help: [{
    name: 'uploadbadges',
    description: 'Upload all badge/nitro/booster emojis to the bot application so it owns them.',
    aliases: 'ubadges',
    parameters: '',
    information: 'BOT_OWNER only. Run once. Updates emojis.json and pushes to GitHub automatically.',
    usage: 'uploadbadges',
    example: ',uploadbadges',
  }],

  run: async (client, message, args) => {
    if (!canRunOwnerCmd(message.author.id, 'uploadbadges')) return;

    const botToken = process.env.DISCORD_TOKEN || process.env.TOKEN;
    if (!botToken) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`No bot token found in env.`)] });

    // Get application ID
    const appRes  = await fetch('https://discord.com/api/v10/applications/@me', { headers: { Authorization: `Bot ${botToken}` } });
    const appData = await appRes.json();
    const appId   = appData.id;
    if (!appId) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`Could not resolve application ID.`)] });

    const status = await message.channel.send({
      embeds: [new EmbedBuilder().setColor(color).setDescription(`<a:loading:1499216008257339514> Uploading **${BADGES.length}** badge emojis to the bot application..`)],
    });

    // Fetch existing application emojis so we can skip/replace dupes
    const existingRes  = await fetch(`https://discord.com/api/v10/applications/${appId}/emojis`, { headers: { Authorization: `Bot ${botToken}` } });
    const existingData = await existingRes.json();
    const existingMap  = new Map((existingData.items || []).map(e => [e.name, e.id]));

    const emojiJsonPath  = path.join(__dirname, '..', 'emojis.json');
    const currentEmojis  = JSON.parse(fs.readFileSync(emojiJsonPath, 'utf8'));
    const results        = [];
    let ok = 0, skipped = 0, fail = 0;

    for (let i = 0; i < BADGES.length; i++) {
      const badge = BADGES[i];

      // Skip if already uploaded under this name
      if (existingMap.has(badge.name)) {
        const existingId  = existingMap.get(badge.name);
        const tag         = `<:${badge.name}:${existingId}>`;
        currentEmojis[badge.name] = tag;
        results.push(`⏭️ \`${badge.name}\` — already exists → ${tag}`);
        skipped++;
        continue;
      }

      // Download from CDN
      let imgBuf;
      const ext = badge.animated ? 'gif' : 'png';
      try {
        imgBuf = await fetchBuffer(`https://cdn.discordapp.com/emojis/${badge.id}.${ext}?size=64&quality=lossless`);
      } catch (e) {
        results.push(`❌ \`${badge.name}\` — download failed: ${e.message}`);
        fail++;
        continue;
      }

      // Upload to application
      const b64   = `data:image/${ext === 'gif' ? 'gif' : 'png'};base64,${imgBuf.toString('base64')}`;
      const upRes = await fetch(`https://discord.com/api/v10/applications/${appId}/emojis`, {
        method: 'POST',
        headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: badge.name, image: b64 }),
      });

      if (upRes.ok) {
        const created = await upRes.json();
        const tag = `<:${created.name}:${created.id}>`;
        currentEmojis[badge.name] = tag;
        results.push(`✅ \`${badge.name}\` → ${tag}`);
        ok++;
      } else {
        const err = await upRes.json().catch(() => ({}));
        results.push(`❌ \`${badge.name}\` — ${err.message || upRes.status}`);
        fail++;
      }

      // Respect rate limits
      await sleep(600);

      // Progress edit every 5
      if ((i + 1) % 5 === 0) {
        await status.edit({ embeds: [new EmbedBuilder().setColor(color).setDescription(`<a:loading:1499216008257339514> **${i + 1}/${BADGES.length}** · ✅ ${ok} · ⏭️ ${skipped} · ❌ ${fail}`)] }).catch(() => {});
      }
    }

    // Write updated emojis.json locally and push to GitHub
    const newContent = JSON.stringify(currentEmojis, null, 2);
    fs.writeFileSync(emojiJsonPath, newContent);
    delete require.cache[require.resolve('../emojis.json')];

    const push = await pushEmojiJsonToGitHub(newContent);

    const summary =
      `**${ok}** uploaded · **${skipped}** already existed · **${fail}** failed\n\n` +
      results.join('\n').slice(0, 3800) +
      `\n\n${push.ok ? '✅ emojis.json pushed to GitHub' : `⚠️ GitHub push: ${push.reason}`}`;

    await status.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(fail === 0 ? '#2ecc71' : color)
          .setTitle('Badge Emoji Upload')
          .setDescription(summary),
      ],
    });
  },
};
