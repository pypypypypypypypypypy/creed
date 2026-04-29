const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const NAMES = [
  'profile', 'avatar', 'groups', 'games', 'inventory', 'names',
  'friends', 'followers', 'following', 'roblox', 'language', 'trash',
];

const SUCCESS = '<:success:1496708562695618641>';
const FAIL = '<:fail:1496708523613098035>';
const COLOR = 0x5dade2;

function sendEmbed(channel, desc) {
  return channel.send({ embeds: [new EmbedBuilder().setColor(COLOR).setDescription(desc)] }).catch(() => {});
}

module.exports = {
  name: 'resetrobloxemojis',
  aliases: ['resetrblxemojis', 'resetrbxemojis', 'clearrobloxemojis'],
  description: 'Delete all custom Roblox emojis uploaded by ,robloxemojis from this server.',
  usage: 'resetrobloxemojis',

  async run(client, message, args) {
    try {
      if (!message.guild) return sendEmbed(message.channel, `${FAIL} This command can only be used in a server.`);

      const member = message.member;
      const isAdmin = member?.permissions?.has(PermissionFlagsBits.Administrator);
      const canManage = member?.permissions?.has(PermissionFlagsBits.ManageGuildExpressions);
      if (!isAdmin && !canManage) {
        return sendEmbed(message.channel, `${FAIL} You need **Manage Expressions** (or Administrator) to use this.`);
      }

      const me = message.guild.members.me || await message.guild.members.fetch(client.user.id).catch(() => null);
      if (!me) return sendEmbed(message.channel, `${FAIL} I couldn't fetch my own member object.`);
      if (!me.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
        return sendEmbed(message.channel, `${FAIL} I'm missing the **Manage Expressions** permission. Please grant it and try again.`);
      }

      const status = await message.channel.send({
        embeds: [new EmbedBuilder().setColor(COLOR).setDescription(`Removing **${NAMES.length}** Roblox emojis…`)],
      }).catch(() => null);

      const deleted = [];
      const missing = [];
      const failed = [];

      for (const name of NAMES) {
        const existing = message.guild.emojis.cache.find((e) => e.name === name);
        if (!existing) { missing.push(name); continue; }
        try {
          await existing.delete(`Removed by ,resetrobloxemojis (${message.author.tag})`);
          deleted.push(`\`${name}\``);
        } catch (err) {
          failed.push(`\`${name}\` — ${err.message || err.code || 'unknown error'}`);
        }
      }

      const lines = [];
      if (deleted.length) lines.push(`${SUCCESS} **Deleted ${deleted.length}/${NAMES.length}**`, deleted.join(' '));
      if (missing.length) lines.push('', `**Not present (${missing.length}):** ${missing.map((m) => `\`${m}\``).join(' ')}`);
      if (failed.length) lines.push('', `${FAIL} **Failed ${failed.length}**`, failed.join('\n'));
      if (!deleted.length && !failed.length && !missing.length) lines.push(`${FAIL} Nothing happened.`);

      const embed = new EmbedBuilder().setColor(COLOR).setTitle('Roblox Emojis — Reset').setDescription(lines.join('\n').slice(0, 4000));

      if (status) await status.edit({ embeds: [embed] }).catch(() => message.channel.send({ embeds: [embed] }).catch(() => {}));
      else await message.channel.send({ embeds: [embed] }).catch(() => {});
    } catch (err) {
      await sendEmbed(message.channel, `${FAIL} \`,resetrobloxemojis\` crashed: \`${(err && err.message) || err || 'unknown'}\``);
    }
  },
};
