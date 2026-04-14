const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');

module.exports = {
  name: 'vanity',
  aliases: ['vanityrole', 'vanityreward'],
  category: 'utility',
  help: [
    { name: 'vanity role <@role>', description: 'Set the role rewarded for having server vanity in status', aliases: 'vanityrole', parameters: '<@role>', information: 'MANAGE_GUILD', usage: 'vanity role <@role>', example: 'vanity role @Vanity' },
    { name: 'vanity url <url>', description: 'Set the vanity URL to look for in statuses', aliases: 'n/a', parameters: '<url>', information: 'MANAGE_GUILD', usage: 'vanity url <url>', example: 'vanity url /myserver' },
    { name: 'vanity enable', description: 'Enable vanity reward system', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'vanity enable', example: 'vanity enable' },
    { name: 'vanity disable', description: 'Disable vanity reward system', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'vanity disable', example: 'vanity disable' },
    { name: 'vanity config', description: 'View current vanity reward settings', aliases: 'n/a', parameters: 'n/a', information: 'n/a', usage: 'vanity config', example: 'vanity config' },
    { name: 'vanity check', description: 'Manually scan all members for vanity in their status', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'vanity check', example: 'vanity check' },
  ],

  run: async (client, message, args) => {
    const { warn, approve } = require('../emojis.json');
    const sub = args[0]?.toLowerCase();

    const manageOnly = ['role', 'url', 'enable', 'disable', 'check'];
    if (manageOnly.includes(sub) && !message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You need **Manage Server** permission.`)] });
    }

    if (sub === 'role') {
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
      if (!role) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Mention a valid role.`)] });
      db.set(`vanity_role_${message.guild.id}`, role.id);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Vanity reward role set to ${role}.`)] });
    }

    if (sub === 'url') {
      const url = args[1];
      if (!url) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Provide a vanity URL to look for (e.g. \`/myserver\` or \`discord.gg/myserver\`).`)] });
      db.set(`vanity_url_${message.guild.id}`, url.toLowerCase());
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Vanity URL set to \`${url}\`. Members with this in their status will receive the reward role.`)] });
    }

    if (sub === 'enable') {
      db.set(`vanity_enabled_${message.guild.id}`, true);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Vanity reward system enabled.`)] });
    }

    if (sub === 'disable') {
      db.set(`vanity_enabled_${message.guild.id}`, false);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Vanity reward system disabled.`)] });
    }

    if (sub === 'check') {
      const vanityUrl = db.get(`vanity_url_${message.guild.id}`);
      const roleId = db.get(`vanity_role_${message.guild.id}`);
      if (!vanityUrl || !roleId) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Vanity URL and role must be set first.`)] });

      const role = message.guild.roles.cache.get(roleId);
      if (!role) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Reward role not found.`)] });

      let added = 0, removed = 0;
      await message.guild.members.fetch();
      for (const [, member] of message.guild.members.cache) {
        if (member.user.bot) continue;
        const hasVanity = member.presence?.activities?.some(a => a.state?.toLowerCase().includes(vanityUrl) || a.name?.toLowerCase().includes(vanityUrl));
        const hasRole = member.roles.cache.has(roleId);
        if (hasVanity && !hasRole) { await member.roles.add(role).catch(() => {}); added++; }
        else if (!hasVanity && hasRole) { await member.roles.remove(role).catch(() => {}); removed++; }
      }
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Scan complete. **${added}** members received the role, **${removed}** had it removed.`)] });
    }

    const enabled = db.get(`vanity_enabled_${message.guild.id}`) || false;
    const roleId = db.get(`vanity_role_${message.guild.id}`);
    const vanityUrl = db.get(`vanity_url_${message.guild.id}`);

    return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Vanity Rewards — ${message.guild.name}`)
      .addFields(
        { name: 'Status', value: enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: 'Reward Role', value: roleId ? `<@&${roleId}>` : 'Not set', inline: true },
        { name: 'Vanity URL', value: vanityUrl ? `\`${vanityUrl}\`` : 'Not set', inline: true }
      )
      .setDescription('Members who have the server vanity URL in their Discord status will automatically receive the reward role.')
    ] });
  }
};
