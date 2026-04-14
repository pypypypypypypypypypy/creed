const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js')
const Discord = { MessageEmbed: EmbedBuilder };
const { color } = require("../config.json");
const { warn } = require('../emojis.json')
const { deny } = require('../emojis.json')
const { paginate } = require('../utils/paginate');
const db = require('../db');

module.exports = {
  name: "unban",
  category: "moderation",
  help: [
    { name: 'unban', description: 'Unban a user from the server', aliases: 'n/a', parameters: '(user) [reason]', information: 'BAN_MEMBERS', usage: 'unban (user) [reason]', example: 'unban 123456789 Appeal accepted' },
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.channel.send({ embeds: [new EmbedBuilder().setColor("efa23a").setDescription(`${warn} ${message.author}: You're **missing** permission: \`ban_members\``)] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) return message.channel.send({ embeds: [new EmbedBuilder().setColor("efa23a").setDescription(`${warn} ${message.author}: I'm **missing** permission: \`ban_members\``)] });


    let reason = args.slice(1).join(" ");
    let userID = args[0];

    if (!reason) reason = 'No reason given.';
    const ubhelpEmbed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: unban')
      .setDescription('Unbans the mentioned user from the guild')
      .addFields({ name: '**Aliases**', value: 'N/A', inline: true })
      .addFields({ name: '**Parameters**', value: 'member, reason', inline: true })
      .addFields({ name: '**Information**', value: `${warn} Ban Members`, inline: true })
      .addFields({ name: '**Usage**', value: '\`\`\`Syntax: unban (member) <reason>\nExample: unban four#0001 Forgiven\`\`\`' })
      .setFooter({ text: `Module: moderation` })
      .setTimestamp()
      .setColor(color)
    if (!args[0] || isNaN(args[0])) {
      let prefix = db.get(`prefix_${message.guild.id}`);
      if (prefix === null) prefix = require('../config.json').default_prefix;
      return paginate(message, [
        { name: 'unban', description: 'Unban a user from the guild by their ID', aliases: 'n/a', parameters: '(user id) [reason]', information: 'BAN_MEMBERS', usage: `${prefix}unban (user id) <reason>`, example: `${prefix}unban 262429076763967488 Forgiven` }
      ], 'moderation');
    }
    message.guild.fetchBans().then(async bans => {
      if (bans.size == 0) return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: Couldn't find any bans for this guild`)] });
      let bUser = bans.find(b => b.user.id == userID);
      if (!bUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor("#fe6464").setDescription(`${deny} ${message.author}: Couldn't find a ban for: **${userID}**`)] })
      await message.guild.members.unban(bUser.user, reason).catch(err => {
        console.log(err);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: Something went wrong **unbanning** that ID`)] });
      }).then(() => {
        message.channel.send('👍')
      })
    })
  }
}