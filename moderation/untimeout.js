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
        name: 'untimeout',
        description: 'Remove a timeout from a user',
        aliases: 'uto',
        parameters: '(user)',
        information: 'MODERATE_MEMBERS',
        usage: 'untimeout (user)',
        example: 'untimeout user'
    }
],

    name: 'untimeout',
  aliases: ['uto', 'removetimeout'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`moderate_members\``)] });
    }

    if (!args[0]) return paginate(message, [
      { name: 'untimeout', description: 'Removes a timeout from a member', aliases: 'uto, removetimeout', parameters: '(member)', information: 'MODERATE_MEMBERS', usage: `${prefix}untimeout (member)`, example: `${prefix}untimeout @user` }
    ], 'moderation');

    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!member) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Couldn't find that member.`)] });
    if (!member.moderatable) return message.channel.send({ embeds: [new EmbedBuilder().setColor('fe6464').setDescription(`${warn} ${message.author}: I cannot modify this member due to hierarchy.`)] });

    await member.timeout(null);
    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Removed timeout from **${member.user.tag}**.`)] });
  }
};
