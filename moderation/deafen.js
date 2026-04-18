const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn, deny, approve } = require('../emojis.json');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'deafen',
        description: 'Deafen a user in a voice channel',
        aliases: 'n/a',
        parameters: '(user) [reason]',
        information: 'MUTE_MEMBERS',
        usage: 'deafen (user) [reason]',
        example: 'deafen user reason'
    }
],

    name: 'deafen',
  aliases: ['deaf'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.DeafenMembers))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`deafen_members\``)] });

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.DeafenMembers))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`deafen_members\``)] });

    if (!args[0])
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Usage: \`${prefix}deafen <member> [reason]\``)] });

    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!member)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: **Invalid** member.`)] });

    if (!member.voice.channel)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: That member is not in a **voice channel**.`)] });

    if (member.voice.serverDeaf)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: That member is already **deafened**.`)] });

    const reason = args.slice(1).join(' ') || 'No reason provided';

    try {
      await member.voice.setDeaf(true, reason);
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: **Deafened** ${member.user.tag} — ${reason}`)] });
    } catch (err) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: Failed to deafen member: ${err.message}`)] });
    }
  }
};
