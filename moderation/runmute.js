const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');
const { logModAction } = require('../utils/modlog');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'runmute',
        description: 'Remove a reaction-mute from a user',
        aliases: 'n/a',
        parameters: '(user)',
        information: 'MANAGE_ROLES',
        usage: 'runmute (user)',
        example: 'runmute user'
    }
],

    name: 'runmute',
  aliases: ['reactionunmute'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`moderate_members\``)] });

    if (!args[0]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}runmute <member>\``)] });

    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!member) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Member not found.`)] });

    const muteRole = message.guild.roles.cache.find(r => r.name === 'Reaction Muted');
    if (!muteRole || !member.roles.cache.has(muteRole.id))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: **${member.user.tag}** is not reaction muted.`)] });

    await member.roles.remove(muteRole);
    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Removed reaction mute from **${member.user.tag}**.`)] });
    logModAction(message.guild, { action: 'Reaction Unmute', user: member.user, moderator: message.author, reason: 'No Reason Supplied' }).catch(() => {});
  }
};
