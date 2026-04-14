const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js')
const Discord = { MessageEmbed: EmbedBuilder };
const { color } = require("../config.json");
const { warn } = require('../emojis.json')
const { deny } = require('../emojis.json')

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'pin',
        description: 'Pin a message in the current channel',
        aliases: 'n/a',
        parameters: '[message link]',
        information: 'MANAGE_MESSAGES',
        usage: 'pin [message link]',
        example: 'pin message link'
    }
],

    name: "pin",

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return message.channel.send({ embeds: [new EmbedBuilder().setColor("efa23a").setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_messages\``)] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) return message.channel.send({ embeds: [new EmbedBuilder().setColor("efa23a").setDescription(`${warn} ${message.author}: I'm **missing** permission: \`manage_messages\``)] });

    const pinID = args.join(" ");

    const embed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: pin')
      .setDescription('Pin any recent message by ID')
      .addFields({ name: '**Aliases**', value: 'N/A', inline: true })
      .addFields({ name: '**Parameters**', value: 'message', inline: true })
      .addFields({ name: '**Information**', value: `${warn} Manage Messages`, inline: true })
      .addFields({ name: '**Usage**', value: '\`\`\`Syntax: pin (messageid)\`\`\`' })
      .setFooter({ text: `Module: servers` })
      .setTimestamp()
      .setColor(color)
    if (!args[0]) return message.channel.send({ embeds: [embed] })

    message.channel.messages.fetch(pinID).then(d => {
      d.pin().catch(err => {
        message.channel.send({ embeds: [new EmbedBuilder().setColor("#e74c3c").setDescription(`${deny} ${message.author}: An error has occurred! Failed to unpin message`)] })
        console.log(err)
      })
    }).catch(() => {
      message.channel.send({ embed: { color: "#efa23a", description: `${warn} ${message.author}: \`${pinID}\` is not a valid message id` } })
    })
  }
}