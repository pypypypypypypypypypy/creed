const { Message } = require('discord.js')
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js')
const Discord = { MessageEmbed: EmbedBuilder };
const { color } = require("../config.json");
const { approve, warn, deny } = require('../emojis.json')
const { paginate } = require('../utils/paginate');
const db = require('../db');

module.exports = {
  name: 'mute',
  category: 'moderation',
  help: [
    { name: 'mute', description: 'Mute a member across all channels', aliases: 'n/a', parameters: '(member)', information: 'MANAGE_ROLES', usage: 'mute (member)', example: 'mute @user' },
  ],

  /**
   * @param {Message} message
   */

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.channel.send({ embeds: [new EmbedBuilder().setColor("efa23a").setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_messages\``)] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.MuteMembers)) return message.channel.send({ embeds: [new EmbedBuilder().setColor("efa23a").setDescription(`${warn} ${message.author}: I'm **missing** permission: \`mute_members\``)] });

    const muteEmbed = new EmbedBuilder()
    .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
    .setTitle('Command: mute')
    .setDescription('Mutes the mentioned member in all channels')
    .addFields({ name: '**Aliases**', value: 'N/A', inline: true })
    .addFields({ name: '**Parameters**', value: 'member', inline: true })
    .addFields({ name: '**Information**', value: `${warn} Manage Messages`, inline: true })
    .addFields({ name: '**Usage**', value: '\`\`\`Syntax: mute <member>\nExample: mute four#0001\`\`\`' })
    .setFooter({ text: `Module: moderation` })
    .setTimestamp()
    .setColor(color)
    if (!args[0]) {
      let prefix = db.get(`prefix_${message.guild.id}`);
      if (prefix === null) prefix = require('../config.json').default_prefix;
      return paginate(message, [
        { name: 'mute', description: 'Mutes the mentioned member in all channels', aliases: 'n/a', parameters: '(member)', information: 'MANAGE_MESSAGES', usage: `${prefix}mute (member)`, example: `${prefix}mute @user` }
      ], 'moderation');
    }

    let user = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || message.member;

    const Member = message.mentions.members.first() || message.guild.members.cache.get(args[0])
    if (Member.id == message.author.id) return message.channel.send({ embeds: [new EmbedBuilder().setColor("fe6464").setDescription(`${deny} ${message.author}: You cannot mute **yourself**`)] })
    if (message.member.roles.highest.comparePositionTo(Member.roles.highest) >= 0) return message.channel.send({ embeds: [new EmbedBuilder().setColor("fe6464").setDescription(`${deny} ${message.author}: You cannot mute someone that is **higher** than **yours**`)] })
    if (!Member) return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: I was unable to find a member with that name`)] })
    const role = message.guild.roles.cache.find(role => role.name.toLowerCase() === 'muted')
    if (!role) {
      try {
        message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: There was no **muted** role found`)] }).then(embedMessage => {
          embedMessage.edit({ embed: { color: "#efa23a", description: `${warn} ${message.author}: Attempting to create a **muted** role` } })
        });

        let muterole = await message.guild.roles.create({
          data: {
            name: 'muted',
            permissions: []
          }
        });
        message.guild.channels.cache.filter(c => c.type === ChannelType.GuildText).forEach(async (channel, id) => {
          await channel.createOverwrite(muterole, {
            SEND_MESSAGES: false,
            ADD_REACTIONS: false
          })
        });
        message.channel.send({ embeds: [new EmbedBuilder().setColor("#a3eb7b").setDescription(`${approve} ${message.author}: Sucessfully created a **muted** role`)] })
      } catch (error) {
        console.log(error)
        message.channel.send(error)
      }
    };
    let role2 = message.guild.roles.cache.find(r => r.name.toLowerCase() === 'muted')
    if (Member.roles.cache.has(role2.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: **${user.user.tag}** has already been muted`)] })
    await Member.roles.add(role2)
    message.channel.send({ embeds: [new EmbedBuilder().setColor("RED").setDescription(`${message.author}: **${user.user.tag}** is now muted`)] })
  }
}