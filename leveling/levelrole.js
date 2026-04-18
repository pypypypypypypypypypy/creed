const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'leveling',
  help: [
    {
        name: 'levelrole',
        description: 'Manage level-up role rewards',
        aliases: 'lr',
        parameters: 'n/a',
        information: 'MANAGE_ROLES',
        usage: 'levelrole',
        example: 'levelrole'
    },
    {
        name: 'levelrole add',
        description: 'Add a role reward for a level',
        aliases: 'n/a',
        parameters: '(level) (role)',
        information: 'MANAGE_ROLES',
        usage: 'levelrole add (level) (role)',
        example: 'levelrole add level'
    },
    {
        name: 'levelrole remove',
        description: 'Remove a level role reward',
        aliases: 'n/a',
        parameters: '(level)',
        information: 'MANAGE_ROLES',
        usage: 'levelrole remove (level)',
        example: 'levelrole remove level'
    },
    {
        name: 'levelrole list',
        description: 'List all level role rewards',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_ROLES',
        usage: 'levelrole list',
        example: 'levelrole list'
    },
    {
        name: 'levelrole reset',
        description: 'Reset all level role rewards',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_ROLES',
        usage: 'levelrole reset',
        example: 'levelrole reset'
    }
],

    name: 'levelrole',
  aliases: ['lvlrole', 'rankreward'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_roles\``)] });

    const sub = args[0]?.toLowerCase();

    if (!sub || sub === 'list') {
      const roles = db.get(`levelroles_${message.guild.id}`) || {};
      const entries = Object.entries(roles);
      if (!entries.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`No level roles configured. Use \`${prefix}levelrole add <level> @role\``)] });
      const lines = entries.sort((a, b) => a[0] - b[0]).map(([lvl, rid]) => `Level **${lvl}** → <@&${rid}>`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Level Roles').setDescription(lines.join('\n'))] });
    }

    if (sub === 'add') {
      const level = parseInt(args[1]);
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[2]);
      if (isNaN(level) || !role) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}levelrole add <level> @role\``)] });
      const roles = db.get(`levelroles_${message.guild.id}`) || {};
      roles[level] = role.id;
      db.set(`levelroles_${message.guild.id}`, roles);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Set ${role} as reward for reaching level **${level}**.`)] });
    }

    if (sub === 'remove') {
      const level = parseInt(args[1]);
      if (isNaN(level)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}levelrole remove <level>\``)] });
      const roles = db.get(`levelroles_${message.guild.id}`) || {};
      if (!roles[level]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: No role set for level **${level}**.`)] });
      delete roles[level];
      db.set(`levelroles_${message.guild.id}`, roles);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Removed level role for level **${level}**.`)] });
    }

    message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}levelrole [add <level> @role] [remove <level>] [list]\``)] });
  }
};
