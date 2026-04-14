const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');
const Util = require('../handlers/xp');

module.exports = {
  category: 'leveling',
  help: [
    {
        name: 'setlevel',
        description: "Set a user's level",
        aliases: 'n/a',
        parameters: '(user) (level)',
        information: 'MANAGE_GUILD',
        usage: 'setlevel (user) (level)',
        example: 'setlevel user level'
    }
],

    name: 'setlevel',
  aliases: ['setxp'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });

    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!member) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}setlevel @user <level>\``)] });

    const level = parseInt(args[1]);
    if (isNaN(level) || level < 0 || level > 500) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Provide a valid level between 0 and 500.`)] });

    // Calculate XP needed to reach that level from 0
    let totalXp = 0;
    for (let l = 0; l < level; l++) totalXp += Util.getLevelxp(l);

    db.set(`xp_${member.id}_${message.guild.id}`, totalXp);
    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Set **${member.user.tag}**'s level to **${level}**.`)] });
  }
};
