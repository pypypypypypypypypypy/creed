const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { color } = require('../config.json');
const { canRunOwnerCmd } = require('../utils/owners');

async function pushEmojiJsonToGitHub(content) {
  const token = process.env.DROWN_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) return { ok: false, reason: 'no GITHUB_TOKEN set' };

  const owner = process.env.DROWN_GITHUB_OWNER || 'blesspython';
  const repo  = process.env.DROWN_GITHUB_REPO  || 'drown-xd';
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/emojis.json`;

  try {
    const getRes = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'drown-bot' },
    });
    const existing = getRes.ok ? await getRes.json() : {};
    const body = {
      message: 'chore: auto-update emojis.json from ,syncemojis',
      content: Buffer.from(content).toString('base64'),
      branch: 'main',
    };
    if (existing.sha) body.sha = existing.sha;
    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'drown-bot', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return { ok: putRes.ok, reason: putRes.ok ? 'pushed to blesspython/drown-xd' : `HTTP ${putRes.status}` };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

module.exports = {
  category: 'owner',
  help: [{
    name: 'syncemojis',
    description: 'Sync bot application emojis → emojis.json and push to GitHub',
    aliases: 'syncvm',
    parameters: 'n/a',
    information: 'BOT_OWNER',
    usage: 'syncemojis',
    example: 'syncemojis',
  }],

  name: 'syncemojis',
  aliases: ['syncvm'],

  run: async (client, message, args) => {
    if (!canRunOwnerCmd(message.author.id, 'syncemojis')) return;

    const status = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription('Fetching bot application emojis...')] });

    // Fetch all application emojis
    let appEmojis;
    try {
      await client.application.emojis.fetch();
      appEmojis = client.application.emojis.cache;
    } catch (e) {
      return status.edit({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`Failed to fetch application emojis: \`${e.message}\``)] });
    }

    if (!appEmojis || appEmojis.size === 0) {
      return status.edit({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`No application emojis found on this bot. Use \`,uploademojis\` with a .zip first.`)] });
    }

    const emojiPath = path.join(__dirname, '..', 'emojis.json');
    const current = JSON.parse(fs.readFileSync(emojiPath, 'utf8'));

    const results = [];
    let synced = 0;

    for (const [, emoji] of appEmojis) {
      const tag = `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>`;
      current[emoji.name] = tag;
      results.push(`✅ \`${emoji.name}\` → \`${emoji.id}\``);
      synced++;
    }

    const newContent = JSON.stringify(current, null, 2);
    fs.writeFileSync(emojiPath, newContent);

    // Bust require cache so fresh require() calls get new values
    delete require.cache[require.resolve('../emojis.json')];

    // Patch in-place for already-loaded modules
    try {
      const cached = require('../emojis.json');
      Object.keys(current).forEach(k => { cached[k] = current[k]; });
    } catch {}

    const push = await pushEmojiJsonToGitHub(newContent);

    const preview = results.slice(0, 20).join('\n') + (results.length > 20 ? `\n…and ${results.length - 20} more` : '');

    await status.edit({
      embeds: [
        new EmbedBuilder()
          .setColor('#2ecc71')
          .setTitle('Emoji Sync')
          .setDescription(
            `**${synced}** application emojis synced to emojis.json\n\n${preview}` +
            `\n\n${push.ok ? `✅ Pushed to GitHub (${push.reason})` : `⚠️ GitHub push failed: ${push.reason}`}` +
            `\n\n⚠️ **Restart the bot** to fully reload all command modules.`
          ),
      ],
    });
  },
};
