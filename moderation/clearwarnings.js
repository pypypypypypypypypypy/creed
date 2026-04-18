const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { paginate } = require('../utils/paginate');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'clearwarnings',
        description: 'Clear all warnings for a user',
        aliases: 'cw',
        parameters: '(user)',
        information: 'MANAGE_GUILD',
        usage: 'clearwarnings (user)',
        example: 'clearwarnings user'
    }
],

    name: 'clearwarnings',
  aliases: ['clearwarns', 'delwarns'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`moderate_members\``)] });
    }

    if (!args[0]) return paginate(message, [
      { name: 'clearwarnings', description: 'Clears all warnings for a member', aliases: 'clearwarns, delwarns', parameters: '(member)', information: 'MODERATE_MEMBERS', usage: `${prefix}clearwarnings (member)`, example: `${prefix}clearwarnings @user` }
    ], 'moderation');

    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!member) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Couldn't find that member.`)] });

    db.delete(`warns.${message.guild.id}.${member.id}`);
    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Cleared all warnings for **${member.user.tag}**.`)] });
  }
};
