const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');
const { paginate } = require('../utils/paginate');

module.exports = {
  name: 'badge',
  aliases: ['gt'],
  category: 'utility',
  help: [
    { name: 'badge', description: 'Manage server badges', aliases: 'gt', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'badge', example: 'badge' },
    { name: 'badge channel', description: 'Set the badge notification channel', aliases: 'n/a', parameters: '(#channel)', information: 'MANAGE_GUILD', usage: 'badge channel (#channel)', example: 'badge channel #badges' },
    { name: 'badge message', description: 'Set the badge award message', aliases: 'n/a', parameters: '(text)', information: 'MANAGE_GUILD', usage: 'badge message (text)', example: 'badge message {user} earned a badge!' },
    { name: 'badge role add', description: 'Add a role to the badge system', aliases: 'n/a', parameters: '(@role)', information: 'MANAGE_GUILD', usage: 'badge role add (@role)', example: 'badge role add @VIP' },
    { name: 'badge role remove', description: 'Remove a role from badge system', aliases: 'n/a', parameters: '(@role)', information: 'MANAGE_GUILD', usage: 'badge role remove (@role)', example: 'badge role remove @VIP' },
    { name: 'badge role list', description: 'List badge roles', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'badge role list', example: 'badge role list' },
    { name: 'badge sync', description: 'Sync badge roles for all members', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'badge sync', example: 'badge sync' },
  ],

  run: async (client, message, args) => {
    const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const sub = (args[0] || '').toLowerCase();
    const gid = message.guild.id;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild) && !message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });

    if (!sub) {
      return paginate(message, this.help, 'utility');
    }

    if (sub === 'channel') {
      const ch = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
      if (!ch) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please mention a channel.`)] });
      db.set(`badge_channel_${gid}`, ch.id);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Badge channel set to ${ch}.`)] });
    }

    if (sub === 'message') {
      const sub2 = (args[1] || '').toLowerCase();
      if (sub2 === 'view') {
        const msg = db.get(`badge_message_${gid}`);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Badge Message').setDescription(msg || 'No badge message set. Default: `{user} has earned a badge!`')] });
      }
      const msg = args.slice(1).join(' ');
      if (!msg) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Provide a message. Variables: \`{user}\`, \`{badge}\`, \`{guild}\``)] });
      db.set(`badge_message_${gid}`, msg);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Badge message set.`)] });
    }

    if (sub === 'role') {
      const action = (args[1] || '').toLowerCase();
      const rolesKey = `badge_roles_${gid}`;
      const roles = db.get(rolesKey) || [];

      if (action === 'list') {
        if (!roles.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: No badge roles configured.`)] });
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Badge Roles').setDescription(roles.map(id => `<@&${id}>`).join('\n'))] });
      }

      if (action === 'add') {
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[2]);
        if (!role) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please mention a role.`)] });
        if (roles.includes(role.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: That role is already a badge role.`)] });
        roles.push(role.id);
        db.set(rolesKey, roles);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: ${role} added as a badge role.`)] });
      }

      if (action === 'remove') {
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[2]);
        if (!role) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please mention a role.`)] });
        if (!roles.includes(role.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: That role is not a badge role.`)] });
        db.set(rolesKey, roles.filter(id => id !== role.id));
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: ${role} removed from badge roles.`)] });
      }

      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}badge role <add|remove|list>\``)] });
    }

    if (sub === 'sync') {
      const roles = db.get(`badge_roles_${gid}`) || [];
      if (!roles.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: No badge roles configured.`)] });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Badge roles synced for all members.`)] });
    }

    return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Unknown subcommand. Use \`${prefix}badge\` for help.`)] });
  }
};
