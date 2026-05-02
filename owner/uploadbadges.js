const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { canRunOwnerCmd } = require('../utils/owners');
const { color } = require('../config.json');

// All sourced from Discord's real badge-icons CDN (not emoji CDN).
// url = direct download link; name = emojis.json key AND application emoji name.
const BADGES = [
  // ── Discord profile badges ──
  { url: 'https://cdn.discordapp.com/badge-icons/5e74e9b61934fc1f67c65515d1f7e60d.png', name: 'discordstaff' },
  { url: 'https://cdn.discordapp.com/badge-icons/3f9748e53446a137a052f3454e2de41e.png', name: 'discordpartner' },
  { url: 'https://cdn.discordapp.com/badge-icons/fee1624003e2fee35cb398e125dc479b.png', name: 'moderatoralumni' },
  { url: 'https://cdn.discordapp.com/badge-icons/bf01d1073931f921909045f3a39fd264.png', name: 'hypesquadevents' },
  { url: 'https://cdn.discordapp.com/badge-icons/8a88d63823d8a71cd5e390baa45efa02.png', name: 'hypesquadbravery' },
  { url: 'https://cdn.discordapp.com/badge-icons/011940fd013da3f7fb926e4a1cd2e618.png', name: 'hypesquadbrilliance' },
  { url: 'https://cdn.discordapp.com/badge-icons/3aa41de486fa12454c3761e8e223442e.png', name: 'hypesquadbalance' },
  { url: 'https://cdn.discordapp.com/badge-icons/2717692c7dca7289b35297368a940dd0.png', name: 'bughunter1' },
  { url: 'https://cdn.discordapp.com/badge-icons/848f79194d4be5ff5f81505cbd0ce1e6.png', name: 'bughunter2' },
  { url: 'https://cdn.discordapp.com/badge-icons/6df5892e0f35b051f8b61eace34f4967.png', name: 'certifiedmoderator' },
  { url: 'https://cdn.discordapp.com/badge-icons/7060786766c9c840eb3019e725d2b358.png', name: 'earlysupporter' },
  { url: 'https://cdn.discordapp.com/badge-icons/6bdc42827a38498929a4920da12695d9.png', name: 'activedeveloper' },
  { url: 'https://cdn.discordapp.com/badge-icons/6f9e37f9029ff57aef81db857890005e.png', name: 'verifiedbotdev' },
  { url: 'https://cdn.discordapp.com/badge-icons/7d9ae358c8c5e118768335dbe68b4fb8.png', name: 'quest' },
  { url: 'https://cdn.discordapp.com/badge-icons/83d8a1eb09a8d64e59233eec5d4d5c2d.png', name: 'orb' },
  // ── Nitro ──
  { url: 'https://cdn.discordapp.com/badge-icons/2ba85e8026a8614b640c2837bcdfe21b.png', name: 'nitro' },
  // ── Server Boost tiers 1–9 ──
  { url: 'https://cdn.discordapp.com/badge-icons/51040c70d4f20a921ad6674ff86fc95c.png', name: 'boost1mo'  },
  { url: 'https://cdn.discordapp.com/badge-icons/0e4080d1d333bc7ad29ef6528b6f2fb7.png', name: 'boost2mo'  },
  { url: 'https://cdn.discordapp.com/badge-icons/72bed924410c304dbe3d00a6e593ff59.png', name: 'boost3mo'  },
  { url: 'https://cdn.discordapp.com/badge-icons/df199d2050d3ed4ebf84d64ae83989f8.png', name: 'boost6mo'  },
  { url: 'https://cdn.discordapp.com/badge-icons/996b3e870e8a22ce519b3a50e6bdd52f.png', name: 'boost9mo'  },
  { url: 'https://cdn.discordapp.com/badge-icons/991c9f39ee33d7537d9f408c3e53141e.png', name: 'boost1yr'  },
  { url: 'https://cdn.discordapp.com/badge-icons/cb3ae83c15e970e8f3d410bc62cb8b99.png', name: 'boost15mo' },
  { url: 'https://cdn.discordapp.com/badge-icons/7142225d31238f6387d9f09efaa02759.png', name: 'boost18mo' },
  { url: 'https://cdn.discordapp.com/badge-icons/ec92202290b48d0879b7413d2dde3bab.png', name: 'boost2yr'  },
  // ── Discord account tenure (legacy age) badges ──
  { url: 'https://cdn.discordapp.com/badge-icons/4f33c4a9c64ce221936bd256c356f91f.png', name: 'tenure1yr'  },
  { url: 'https://cdn.discordapp.com/badge-icons/4514fab914bdbfb4ad2fa23df76121a6.png', name: 'tenure3yr'  },
  { url: 'https://cdn.discordapp.com/badge-icons/2895086c18d5531d499862e41d1155a6.png', name: 'tenure6yr'  },
  { url: 'https://cdn.discordapp.com/badge-icons/0334688279c8359120922938dcb1d6f8.png', name: 'tenure12yr' },
  { url: 'https://cdn.discordapp.com/badge-icons/0d61871f72bb9a33a7ae568c1fb4f20a.png', name: 'tenure24yr' },
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
  if (!token) return { ok: false, reason: 'no GitHub token env var' };
  const owner = process.env.DROWN_GITHUB_OWNER || 'abannition';
  const repo  = process.env.DROWN_GITHUB_REPO  || 'drown-xd';
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/emojis.json`;
  try {
    const getRes = await fetch(apiUrl, { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'drown-bot' } });
    const sha = getRes.ok ? (await getRes.json()).sha : null;
    const body = { message: 'feat: upload all Discord badge emojis to bot application', content: Buffer.from(content).toString('base64'), branch: 'main' };
    if (sha) body.sha = sha;
    const putRes = await fetch(apiUrl, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'drown-bot', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
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
    description: 'Upload every Discord badge (all boost tiers, HypeSquad houses, etc.) to the bot application.',
    aliases: 'ubadges',
    parameters: '',
    information: 'BOT_OWNER only. Downloads directly from Discord badge-icons CDN.',
    usage: 'uploadbadges',
    example: ',uploadbadges',
  }],

  run: async (client, message, args) => {
    if (!canRunOwnerCmd(message.author.id, 'uploadbadges')) return;

    const botToken = process.env.DISCORD_TOKEN || process.env.TOKEN;
    if (!botToken) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription('No bot token in env.')] });

    const appRes  = await fetch('https://discord.com/api/v10/applications/@me', { headers: { Authorization: `Bot ${botToken}` } });
    const appData = await appRes.json();
    const appId   = appData.id;
    if (!appId) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription('Could not resolve application ID.')] });

    const status = await message.channel.send({
      embeds: [new EmbedBuilder().setColor(color).setDescription(`<a:loading:1499216008257339514> Uploading **${BADGES.length}** badges to the bot application..`)],
    });

    // Fetch existing application emojis
    const existingRes  = await fetch(`https://discord.com/api/v10/applications/${appId}/emojis`, { headers: { Authorization: `Bot ${botToken}` } });
    const existingData = await existingRes.json();
    const existingMap  = new Map((existingData.items || []).map(e => [e.name, e.id]));

    const emojiJsonPath = path.join(__dirname, '..', 'emojis.json');
    const currentEmojis = JSON.parse(fs.readFileSync(emojiJsonPath, 'utf8'));
    const results = [];
    let ok = 0, skipped = 0, fail = 0;

    for (let i = 0; i < BADGES.length; i++) {
      const badge = BADGES[i];

      if (existingMap.has(badge.name)) {
        const existingId = existingMap.get(badge.name);
        const tag = `<:${badge.name}:${existingId}>`;
        currentEmojis[badge.name] = tag;
        results.push(`⏭️ \`${badge.name}\` — already exists → ${tag}`);
        skipped++;
        continue;
      }

      let imgBuf;
      try {
        imgBuf = await fetchBuffer(badge.url);
      } catch (e) {
        results.push(`❌ \`${badge.name}\` — download failed: ${e.message}`);
        fail++;
        continue;
      }

      const b64   = `data:image/png;base64,${imgBuf.toString('base64')}`;
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

      await sleep(600);

      if ((i + 1) % 5 === 0) {
        await status.edit({ embeds: [new EmbedBuilder().setColor(color).setDescription(`<a:loading:1499216008257339514> **${i + 1}/${BADGES.length}** · ✅ ${ok} · ⏭️ ${skipped} · ❌ ${fail}`)] }).catch(() => {});
      }
    }

    const newContent = JSON.stringify(currentEmojis, null, 2);
    fs.writeFileSync(emojiJsonPath, newContent);
    delete require.cache[require.resolve('../emojis.json')];

    const push = await pushEmojiJsonToGitHub(newContent);

    const resultLines = results.join('\n').slice(0, 3200);
    const summary =
      `**${ok}** uploaded · **${skipped}** already existed · **${fail}** failed\n\n` +
      resultLines +
      `\n\n${push.ok ? '✅ emojis.json pushed to GitHub' : `⚠️ GitHub push: ${push.reason} — file attached`}`;

    const payload = {
      embeds: [new EmbedBuilder().setColor(fail === 0 ? '#2ecc71' : color).setTitle('Badge Emoji Upload').setDescription(summary)],
    };
    if (!push.ok) {
      payload.files = [new AttachmentBuilder(Buffer.from(newContent, 'utf8'), { name: 'emojis.json' })];
    }

    await status.edit(payload);
  },
};
