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
        name: 'hackban',
        description: 'Ban a user by ID without them being in the server',
        aliases: 'n/a',
        parameters: '(user id) [reason]',
        information: 'BAN_MEMBERS',
        usage: 'hackban (user id) [reason]',
        example: 'hackban user id'
    }
],

    name: `hackban`,
  aliases: ['hban'],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`ban_members\``)] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`ban_members\``)] });

    const hackbanEmbed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: hackban')
      .setDescription('Ban user from guild even if they arent in the server')
      .addFields({ name: '**Aliases**', value: 'hban', inline: true })
      .addFields({ name: '**Parameters**', value: 'member, reason', inline: true })
      .addFields({ name: '**Information**', value: `${warn} Ban Members\n:notepad_spiral: Make sure to use a User ID (not name#tag...etc)`, inline: true })
      .addFields({ name: '**Usage**', value: '\`\`\`Syntax: hackban (user id) <reason>\nExample: hackban 262429076763967488 Raider\`\`\`' })
      .setFooter({ text: `Module: moderation` })
      .setTimestamp()
      .setColor(color)
    if (!args[0]) {
      let prefix = db.get(`prefix_${message.guild.id}`);
      if (prefix === null) prefix = require('../config.json').default_prefix;
      return paginate(message, [
        { name: 'hackban', description: 'Ban a user from the guild even if they are not in the server', aliases: 'hban', parameters: '(user id) [reason]', information: 'BAN_MEMBERS', usage: `${prefix}hackban (user id) <reason>`, example: `${prefix}hackban 262429076763967488 Raider` }
      ], 'moderation');
    }

    const target = args[0];
    if (target.id == message.author.id) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: You cannot ban **yourself**`)] })
    if (message.member.roles.highest.comparePositionTo(target.roles.highest) >= 0) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: You cannot ban someone that is **higher** than **yours**`)] })
    if (isNaN(target)) return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: You must to **specify** a valid user ID`)] });

    const reason = args.splice(1, args.length).join(' ');

    message.guild.members.ban(target, { reason: reason.length < 1 ? 'No Reason Supplied' : reason });

    return message.channel.send('👍');
  }
}