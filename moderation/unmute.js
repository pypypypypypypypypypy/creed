const { Message } = require('discord.js')
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js')
const Discord = { MessageEmbed: EmbedBuilder };
const { color } = require("../config.json");
const { warn } = require('../emojis.json')
const { paginate } = require('../utils/paginate');
const db = require('../db');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'unmute',
        description: 'Remove a mute from a user',
        aliases: 'n/a',
        parameters: '(user) [reason]',
        information: 'MANAGE_ROLES',
        usage: 'unmute (user) [reason]',
        example: 'unmute user reason'
    }
],

    name: 'unmute',

  /**
   * @param {Message} message
   */

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_messages\``)] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`manage_roles\``)] });

    const unmuteEmbed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: unmute')
      .setDescription('Unmutes the mentioned member in all channels')
      .addFields({ name: '**Aliases**', value: 'N/A', inline: true })
      .addFields({ name: '**Parameters**', value: 'member', inline: true })
      .addFields({ name: '**Information**', value: `${warn} Manage Messages`, inline: true })
      .addFields({ name: '**Usage**', value: '\`\`\`Syntax: unmute <member>\nExample: unmute four#0001\`\`\`' })
      .setFooter({ text: `Module: moderation` })
      .setTimestamp()
      .setColor(color)
    if (!args[0]) {
      let prefix = db.get(`prefix_${message.guild.id}`);
      if (prefix === null) prefix = require('../config.json').default_prefix;
      return paginate(message, [
        { name: 'unmute', description: 'Unmute the mentioned member in all channels', aliases: 'n/a', parameters: '(member)', information: 'MANAGE_MESSAGES', usage: `${prefix}unmute (member)`, example: `${prefix}unmute @user` }
      ], 'moderation');
    }

    let user = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || message.member;

    const Member = message.mentions.members.first() || message.guild.members.cache.get(args[0])

    if (!Member) return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: I was unable to find a member with that name`)] })

    const role = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'muted');

    await Member.roles.remove(role)

    message.channel.send({ embeds: [new EmbedBuilder().setColor("RED").setDescription(`${message.author}: **${user.user.tag}** is now unmuted`)] })
  }
}