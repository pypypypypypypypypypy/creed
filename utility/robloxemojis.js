const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { canRunOwnerCmd } = require('../utils/owners');

const NAMES = [
  'profile', 'avatar', 'groups', 'games', 'inventory', 'names',
  'friends', 'followers', 'following', 'roblox', 'language', 'trash',
];
const COLOR = 0x5dade2;

function getApplicationEmoji(client, name, fallback) {
  const live = client?.application?.emojis?.cache?.find((emoji) => emoji.name === name);
  if (live) return `<${live.animated ? 'a' : ''}:${live.name}:${live.id}>`;
  try { return require('../emojis.json')[name] || fallback; } catch { return fallback; }
}

function sendEmbed(channel, desc) {
  return channel.send({ embeds: [new EmbedBuilder().setColor(COLOR).setDescription(desc)] }).catch(() => {});
}

module.exports = {
  name: 'robloxemojis',
  aliases: ['rblxemojis', 'rbxemojis'],
  category: 'owner',
  help: [{
    name: 'robloxemojis',
    description: 'Upload the Roblox icon set as bot application emojis',
    aliases: 'rblxemojis, rbxemojis',
    parameters: 'n/a',
    information: 'BOT_OWNER',
    usage: 'robloxemojis',
    example: 'robloxemojis',
  }],

  async run(client, message) {
    if (!canRunOwnerCmd(message.author.id, 'robloxemojis')) return;

    const success = getApplicationEmoji(client, 'success', '✅');
    const fail = getApplicationEmoji(client, 'fail', '❌');

    try {
      const dir = path.join(__dirname, '..', 'assets', 'roblox-emojis');
      if (!fs.existsSync(dir)) {
        return sendEmbed(message.channel, `${fail} Asset folder is missing on the bot host. Redeploy the bot so it has the latest files.`);
      }

      const missing = NAMES.filter((name) => !fs.existsSync(path.join(dir, `${name}.png`)));
      if (missing.length) {
        return sendEmbed(message.channel, `${fail} Missing image files: ${missing.map((name) => `\`${name}.png\``).join(', ')}.`);
      }

      await client.application.emojis.fetch();
      const appEmojis = client.application.emojis.cache;
      const status = await message.channel.send({
        embeds: [new EmbedBuilder().setColor(COLOR).setDescription(`Uploading **${NAMES.length}** Roblox emojis to the bot application…`)],
      }).catch(() => null);

      const created = [];
      const failed = [];

      for (const name of NAMES) {
        try {
          const existing = appEmojis.find((emoji) => emoji.name === name);
          if (existing) await client.application.emojis.delete(existing.id).catch(() => {});
          const buffer = fs.readFileSync(path.join(dir, `${name}.png`));
          const emoji = await client.application.emojis.create({
            attachment: buffer,
            name,
            reason: `Uploaded via ,robloxemojis by ${message.author.tag}`,
          });
          created.push(`\`${name}\` ${emoji.toString()}`);
        } catch (err) {
          failed.push(`\`${name}\` — ${err.message || err.code || 'unknown error'}`);
        }
      }

      const lines = [];
      if (created.length) lines.push(`${success} **Created ${created.length}/${NAMES.length}**`, created.join('\n'));
      if (failed.length) lines.push('', `${fail} **Failed ${failed.length}**`, failed.join('\n'));
      if (!created.length && !failed.length) lines.push(`${fail} Nothing happened.`);

      const embed = new EmbedBuilder()
        .setColor(COLOR)
        .setTitle('Roblox Application Emojis')
        .setDescription(lines.join('\n').slice(0, 4000));

      if (status) await status.edit({ embeds: [embed] }).catch(() => message.channel.send({ embeds: [embed] }).catch(() => {}));
      else await message.channel.send({ embeds: [embed] }).catch(() => {});
    } catch (err) {
      await sendEmbed(message.channel, `${fail} \`,robloxemojis\` failed: \`${(err && err.message) || err || 'unknown'}\``);
    }
  },
};
