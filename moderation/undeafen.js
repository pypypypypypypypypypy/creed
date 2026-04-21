const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn, deny, approve } = require('../emojis.json');
const { logModAction } = require('../utils/modlog');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'undeafen',
        description: 'Un-deafen a user in a voice channel',
        aliases: 'n/a',
        parameters: '(user)',
        information: 'MUTE_MEMBERS',
        usage: 'undeafen (user)',
        example: 'undeafen user'
    }
],

    name: 'undeafen',
  aliases: ['undeaf'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.DeafenMembers))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`deafen_members\``)] });

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.DeafenMembers))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`deafen_members\``)] });

    if (!args[0])
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Usage: \`${prefix}undeafen <member> [reason]\``)] });

    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!member)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: **Invalid** member.`)] });

    if (!member.voice.channel)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: That member is not in a **voice channel**.`)] });

    if (!member.voice.serverDeaf)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: That member is not **deafened**.`)] });

    const reason = args.slice(1).join(' ') || 'No reason provided';

    try {
      await member.voice.setDeaf(false, reason);
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: **Undeafened** ${member.user.tag} — ${reason}`)] });
    } catch (err) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: Failed to undeafen member: ${err.message}`)] });
    }
    logModAction(message.guild, { action: 'Undeafen', user: member.user, moderator: message.author, reason: 'No Reason Supplied' }).catch(() => {});
  }
};
