const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js')
const Discord = { MessageEmbed: EmbedBuilder };
const { color } = require("../config.json");
const { approve } = require('../emojis.json')
const { warn } = require('../emojis.json')
const { deny } = require('../emojis.json')
const { paginate } = require('../utils/paginate');
const db = require('../db');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'rename',
        description: 'Rename a channel',
        aliases: 'n/a',
        parameters: '[channel] (new name)',
        information: 'MANAGE_CHANNELS',
        usage: 'rename [channel] (new name)',
        example: 'rename channel new'
    }
],

    name: "rename",
  aliases: ["nick"],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`ban_members\``)] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`ban_members\``)] });

    const mentionedMember = message.mentions.members.first() || message.guild.members.cache.get(args[0]);

    const nickEmbed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: rename')
      .setDescription('Assigns the mentioned user a new nickname in the guild')
      .addFields({ name: '**Aliases**', value: 'nick', inline: true })
      .addFields({ name: '**Parameters**', value: 'member, reason', inline: true })
      .addFields({ name: '**Information**', value: `${warn} Ban Members`, inline: true })
      .addFields({ name: '**Usage**', value: '\`\`\`Syntax: rename (member) <new nick>\nExample: rename four#0001 amir\`\`\`' })
      .setFooter({ text: `Module: moderation` })
      .setTimestamp()
      .setColor(color)
    if (!args[0]) {
      let prefix = db.get(`prefix_${message.guild.id}`);
      if (prefix === null) prefix = require('../config.json').default_prefix;
      return paginate(message, [
        { name: 'rename', description: 'Assign the mentioned user a new nickname in the guild', aliases: 'nick', parameters: '(member) (nickname)', information: 'BAN_MEMBERS', usage: `${prefix}rename (member) <new nick>`, example: `${prefix}rename @user amir` }
      ], 'moderation');
    }

    if (mentionedMember.roles.highest.position >= message.member.roles.highest.position) return message.channel.send({ embeds: [new EmbedBuilder().setColor("#fe6464").setDescription(`${deny} ${message.author}: You can't **rename** someone who is **higher** than you`)] });

    let user = message.mentions.users.first();
    if (!user) return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: You need to **mention** a user`)] });

    let nick = args.slice(1).join(" ");
    if (!nick) return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: You need to **input** a nickname`)] });

    let member = message.guild.members.cache.get(user.id);

    await member.setNickname(nick);
    return message.channel.send({ embed: { color: "#a3eb7b", description: `${approve} ${message.author}: Changed **${user.username}**'s nickname to \`${nick}\`` } });
  }
}