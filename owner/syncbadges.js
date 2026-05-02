const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { canRunOwnerCmd } = require('../utils/owners');
const { color } = require('../config.json');

// All badge keys managed by ,uploadbadges
const ALL_BADGE_KEYS = [
  'discordstaff','discordpartner','moderatoralumni','hypesquadevents',
  'hypesquadbravery','hypesquadbrilliance','hypesquadbalance',
  'bughunter1','bughunter2','certifiedmoderator','earlysupporter',
  'activedeveloper','verifiedbotdev','quest','orb','nitro',
  'boost1mo','boost2mo','boost3mo','boost6mo','boost9mo',
  'boost1yr','boost15mo','boost18mo','boost2yr',
  'tenure1yr','tenure3yr','tenure6yr','tenure12yr','tenure24yr',
];

async function pushToGitHub(content) {
  const token = process.env.DROWN_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) return { ok: false, reason: 'no GitHub token env var' };
  const owner = process.env.DROWN_GITHUB_OWNER || 'abannition';
  const repo  = process.env.DROWN_GITHUB_REPO  || 'drown-xd';
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/emojis.json`;
  try {
    const getRes = await fetch(apiUrl, { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'drown-bot' } });
    const sha = getRes.ok ? (await getRes.json()).sha : null;
    const body = { message: 'feat: sync badge emoji IDs from bot application', content: Buffer.from(content).toString('base64'), branch: 'main' };
    if (sha) body.sha = sha;
    const putRes = await fetch(apiUrl, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'drown-bot', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { ok: putRes.ok, reason: putRes.ok ? 'pushed' : `HTTP ${putRes.status}` };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

module.exports = {
  name: 'syncbadges',
  aliases: ['syncemojis'],
  category: 'owner',
  help: [{
    name: 'syncbadges',
    description: 'Fetch live badge emoji IDs from the bot application and push to emojis.json on GitHub.',
    aliases: 'syncemojis',
    parameters: '',
    information: 'BOT_OWNER only. Run after ,uploadbadges if the GitHub push failed.',
    usage: 'syncbadges',
    example: ',syncbadges',
  }],

  run: async (client, message, args) => {
    if (!canRunOwnerCmd(message.author.id, 'syncbadges')) return;

    const botToken = process.env.DISCORD_TOKEN || process.env.TOKEN;
    if (!botToken) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription('No bot token in env.')] });

    const status = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription('<a:loading:1499216008257339514> Fetching application emojis..')] });

    const appRes  = await fetch('https://discord.com/api/v10/applications/@me', { headers: { Authorization: `Bot ${botToken}` } });
    const appData = await appRes.json();
    const appId   = appData.id;
    if (!appId) return status.edit({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription('Could not resolve application ID.')] });

    const emojiRes  = await fetch(`https://discord.com/api/v10/applications/${appId}/emojis`, { headers: { Authorization: `Bot ${botToken}` } });
    const emojiData = await emojiRes.json();
    const liveMap   = new Map((emojiData.items || []).map(e => [e.name, e]));

    const emojiJsonPath = path.join(__dirname, '..', 'emojis.json');
    const current = JSON.parse(fs.readFileSync(emojiJsonPath, 'utf8'));

    const updated = [];
    const missing = [];

    for (const key of ALL_BADGE_KEYS) {
      const appEmoji = liveMap.get(key);
      if (!appEmoji) { missing.push(key); continue; }
      const tag = `<${appEmoji.animated ? 'a' : ''}:${appEmoji.name}:${appEmoji.id}>`;
      current[key] = tag;
      updated.push(`\`${key}\` → ${tag}`);
    }

    const newContent = JSON.stringify(current, null, 2);
    fs.writeFileSync(emojiJsonPath, newContent);
    delete require.cache[require.resolve('../emojis.json')];

    const push = await pushToGitHub(newContent);

    const descLines = [
      `**${updated.length}** synced · **${missing.length}** missing from application`,
      updated.join('\n').slice(0, 2000),
      missing.length ? `Missing (run ,uploadbadges): ${missing.map(m => `\`${m}\``).join(', ')}` : '',
      push.ok ? '✅ emojis.json pushed to GitHub' : `⚠️ GitHub push: ${push.reason} — file attached`,
    ].filter(Boolean).join('\n\n');

    const payload = {
      embeds: [new EmbedBuilder().setColor(push.ok ? '#2ecc71' : color).setTitle('Badge Emoji Sync').setDescription(descLines)],
    };
    if (!push.ok) {
      payload.files = [new AttachmentBuilder(Buffer.from(newContent, 'utf8'), { name: 'emojis.json' })];
    }

    await status.edit(payload);
  },
};
