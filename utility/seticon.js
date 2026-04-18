const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js')
const Discord = { MessageEmbed: EmbedBuilder }
const { approve } = require('../emojis.json')
const { warn } = require('../emojis.json')
const { color } = require('../config.json')

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'seticon',
        description: 'Set the server icon',
        aliases: 'n/a',
        parameters: '(image/url)',
        information: 'MANAGE_GUILD',
        usage: 'seticon (image/url)',
        example: 'seticon image/url'
    }
],

    name: "seticon",

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`manage_guild\``)] });
    let icon = args[0]
    const embed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: seticon')
      .setDescription('Set a new guild icon')
      .addFields({ name: '**Aliases**', value: 'N/A', inline: true })
      .addFields({ name: '**Parameters**', value: 'url', inline: true })
      .addFields({ name: '**Information**', value: `${warn} Manage Guild`, inline: true })
      .addFields({ name: '**Usage**', value: '\`\`\`Syntax: seticon (url)\nExample: seticon media.discordapp.com/attachments/871...png\`\`\`' })
      .setFooter({ text: `Module: servers` })
      .setTimestamp()
      .setColor(color)
    if (!icon) return message.channel.send({ embeds: [embed] })

    if (message.attachments.first()) {
      icon = message.attachments.first().url
      message.guild.setIcon(icon).then(() => {
        message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Successfully set the guild icon to [**this image**](${icon})`)] })
      })
    } else {
      if (!icon) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You must provide a **url or attachment** to set as the guild icon`)] })
      message.guild.setIcon(icon).then(() => {
        message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Successfully set the guild icon to [**this image**](${icon})`)] })
      })
    }
  }
}