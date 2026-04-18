const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js')
const Discord = { MessageEmbed: EmbedBuilder };
const db = require('../db')
const { default_prefix } = require("../config.json");
const { color } = require("../config.json");
const { warn } = require('../emojis.json')
const { deny } = require('../emojis.json')
const { paginate } = require('../utils/paginate');

module.exports = {
  name: "ban",
  category: 'moderation',
  help: [
    { name: 'ban', description: 'Bans the mentioned user from the guild', aliases: 'n/a', parameters: '(member) [reason]', information: 'BAN_MEMBERS', usage: 'ban (member) <reason>', example: 'ban @user Threatening members' },
  ],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`);
    if (prefix === null) { prefix = default_prefix; };

    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`ban_members\``)] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`ban_members\``)] });

    let reason = args.slice(1).join(" ");
    const mentionedMember = message.mentions.members.first() || message.guild.members.cache.get(args[0]);

    if (!reason) reason = 'No Reason Supplied';
    const embed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: ban')
      .setDescription('Bans the mentioned user from the guild')
      .addFields({ name: '**Aliases**', value: 'N/A', inline: true })
      .addFields({ name: '**Parameters**', value: 'member, reason', inline: true })
      .addFields({ name: '**Information**', value: `${warn} Ban Members`, inline: true })
      .addFields({ name: '**Usage**', value: '\`\`\`Syntax: ban (member) <reason>\nExample: ban four#0001 Threatening members\`\`\`' })
      .setFooter({ text: `Module: moderation` })
      .setTimestamp()
      .setColor(color)
    if (!args[0]) return paginate(message, [
      { name: 'ban', description: 'Bans the mentioned user from the guild', aliases: 'n/a', parameters: '(member) [reason]', information: 'BAN_MEMBERS', usage: `${prefix}ban (member) <reason>`, example: `${prefix}ban @user Threatening members` }
    ], 'moderation');
    if (mentionedMember.id == message.author.id) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: You cannot ban **yourself**`)] })
    if (message.member.roles.highest.comparePositionTo(mentionedMember.roles.highest) >= 0) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: You cannot ban someone that is **higher** than **yours**`)] })
    if (!mentionedMember) return message.channel.send({ embed: { color: "#efa23a", description: `${warn} ${message.author}: **Invalid User**. Do \`${prefix}ban\` to see the variables` } })
    if (!mentionedMember.bannable) return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: Cannot ban due to **hierarchy**`)] })
    if (message.member.roles.highest.comparePositionTo(mentionedMember.roles.highest) >= 0) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: You cannot ban someone that is **higher** than **yours**`)] })


    const banEmbed = new EmbedBuilder()
      .setTitle('**Banned**')
      .addFields({ name: `**You have been banned in**`, value: `${message.guild.name}`, inline: true })
      .addFields({ name: `**Moderator**`, value: `${message.author.tag}`, inline: true })
      .addFields({ name: `**Reason**`, value: `${reason}`, inline: true })
      .setColor("#e74c3c")
      .setThumbnail(message.author.avatarURL({ forceStatic: false, size: 2048 }))
      .setTimestamp()
      .setFooter({ text: 'If you would like to dispute this punishment, contact a staff member.' });

    await mentionedMember.send({ embeds: [banEmbed] }).catch(err => console.log(err));
    await mentionedMember.ban({
      days: 7,
      reason: reason
    }).catch(err => console.log(err)).then(() => message.channel.send('👍'))
  }
}