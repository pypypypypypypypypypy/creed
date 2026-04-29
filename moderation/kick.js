const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js')
const Discord = { MessageEmbed: EmbedBuilder };
const db = require('../db')
const { default_prefix } = require("../config.json");
const { color } = require("../config.json");
const { warn } = require('../emojis.json')
const { deny } = require('../emojis.json')
const { paginate } = require('../utils/paginate');
const { logModAction } = require('../utils/modlog');

module.exports = {
  name: "kick",
  category: 'moderation',
  help: [
    { name: 'kick', description: 'Kicks the mentioned member from the server', aliases: 'n/a', parameters: '(member) [reason]', information: 'KICK_MEMBERS', usage: 'kick (member) <reason>', example: 'kick @user Breaking rules' },
  ],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`);
    if (prefix === null) { prefix = default_prefix; };

    if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`kick_members\``)] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`kick_members\``)] });
    const mentionedMember = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    let reason = args.slice(1).join(" ");
    if (!reason) reason = "No Reason Supplied"

    const embed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: kick')
      .setDescription('Kicks the mentioned user from the guild')
      .addFields({ name: '**Aliases**', value: 'N/A', inline: true })
      .addFields({ name: '**Parameters**', value: 'member, reason', inline: true })
      .addFields({ name: '**Information**', value: `${warn} Kick Members`, inline: true })
      .addFields({ name: '**Usage**', value: '\`\`\`Syntax: kick (member) <reason>\nExample: kick four#0001 You need a break\`\`\`' })
      .setFooter({ text: `Module: moderation` })
      .setTimestamp()
      .setColor(color)
    if (!args[0]) return paginate(message, [
      { name: 'kick', description: 'Kicks the mentioned user from the guild', aliases: 'n/a', parameters: '(member) [reason]', information: 'KICK_MEMBERS', usage: `${prefix}kick (member) <reason>`, example: `${prefix}kick @user You need a break` }
    ], 'moderation');
    if (mentionedMember.id == message.author.id) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: You cannot kick **yourself**`)] })
    if (message.member.roles.highest.comparePositionTo(mentionedMember.roles.highest) <= 0) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: You cannot kick someone that is **higher** than **yours**`)] })
    if (!mentionedMember) return message.channel.send({ embed: { color: "#efa23a", description: `${warn} ${message.author}: **Invalid User**. Do \`${prefix}kick\` to see the variables` } });
    if (!mentionedMember.kickable) return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: Cannot kick due to **hierarchy**`)] })

    const kickEmbed = new EmbedBuilder()
      .setTitle('**Kicked**')
      .addFields({ name: `**You have been kicked from**`, value: `${message.guild.name}`, inline: true })
      .addFields({ name: `**Moderator**`, value: `${message.author.tag}`, inline: true })
      .addFields({ name: `**Reason**`, value: `${reason}`, inline: true })
      .setColor("#e74c3c")
      .setThumbnail(message.author.avatarURL({ forceStatic: false, size: 2048 }))
      .setTimestamp()
      .setFooter({ text: 'If you would like to dispute this punishment, contact a staff member.' });

    try {
      await mentionedMember.send({ embeds: [kickEmbed] });
    } catch (err) {
      console.log('Could not DM member');
    }

    await mentionedMember.kick(reason);
    message.channel.send('👍').catch(() => {});
    logModAction(message.guild, {
      action: 'Kick',
      user: mentionedMember.user,
      moderator: message.author,
      reason
    }).catch(() => {});
  }
}
