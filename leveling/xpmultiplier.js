const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'leveling',
  help: [
    {
        name: 'xpmultiplier',
        description: 'Manage XP multipliers',
        aliases: 'xpmult',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'xpmultiplier',
        example: 'xpmultiplier'
    },
    {
        name: 'xpmultiplier set',
        description: 'Set an XP multiplier for a role',
        aliases: 'n/a',
        parameters: '(role) (multiplier)',
        information: 'MANAGE_GUILD',
        usage: 'xpmultiplier set (role) (multiplier)',
        example: 'xpmultiplier set role'
    },
    {
        name: 'xpmultiplier remove',
        description: 'Remove an XP multiplier',
        aliases: 'n/a',
        parameters: '(role)',
        information: 'MANAGE_GUILD',
        usage: 'xpmultiplier remove (role)',
        example: 'xpmultiplier remove role'
    },
    {
        name: 'xpmultiplier list',
        description: 'List all XP multipliers',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'xpmultiplier list',
        example: 'xpmultiplier list'
    },
    {
        name: 'xpmultiplier reset',
        description: 'Reset all XP multipliers',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'xpmultiplier reset',
        example: 'xpmultiplier reset'
    }
],

    name: 'xpmultiplier',
  aliases: ['xpmulti', 'xpboost'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });

    if (!args[0]) {
      const multi = db.get(`xp_multi_${message.guild.id}`) || 1;
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`Current XP multiplier: **${multi}x**\n\nUsage: \`${prefix}xpmultiplier <number>\` (e.g. \`2\` for double XP)`)] });
    }

    const multi = parseFloat(args[0]);
    if (isNaN(multi) || multi < 0.1 || multi > 10) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Multiplier must be between **0.1** and **10**.`)] });

    db.set(`xp_multi_${message.guild.id}`, multi);
    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: XP multiplier set to **${multi}x**.`)] });
  }
};
