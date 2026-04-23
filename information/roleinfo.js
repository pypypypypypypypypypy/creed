const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js')
const Discord = { MessageEmbed: EmbedBuilder };
const { color } = require("../config.json");
const { warn } = require('../emojis.json')
const moment = require('moment')

module.exports = {
  category: 'information',
  help: [
    {
        name: 'roleinfo',
        description: 'View information about a role',
        aliases: 'ri',
        parameters: '(role)',
        information: 'n/a',
        usage: 'roleinfo (role)',
        example: 'roleinfo role'
    }
],

    name: "roleinfo",
  aliases: ["rinfo", "ri"],

  run: async (client, message, args) => {
    const roleInfoEmbed2 = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: roleinfo')
      .setDescription('View information about a role')
      .addFields({ name: '**Aliases**', value: 'rinfo', inline: true })
      .addFields({ name: '**Parameters**', value: 'role', inline: true })
      .addFields({ name: '**Information**', value: `N/A`, inline: true })
      .addFields({ name: '**Usage**', value: '\`\`\`Syntax: roleinfo <role>\nExample: roleinfo Friends\`\`\`' })
      .setFooter({ text: `Module: information` })
      .setTimestamp()
      .setColor(color)
    if (!args[0]) return message.channel.send(roleInfoEmbed2)
    let role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]) || message.guild.roles.cache.find(r => r.name.toLowerCase() === args.join(' ').toLocaleLowerCase());
    if (!role) return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: You need to enter a **valid** role`)] });

    const roleInfoEmbed = new EmbedBuilder()
      .setColor(role.hexColor)
      .setAuthor(`${message.author.username}`, message.author.displayAvatarURL({
        forceStatic: false,
        size: 2048
      }))
      .setTitle(`${role.name}`)
      .addFields({ name: "**Role ID**", value: `\`${role.id}\``, inline: true })
      .addFields({ name: "**Guild**", value: `${message.guild.name} (\`${message.guild.id}\`)`, inline: true })
      .addFields({ name: "**Hex**", value: `\`${role.hexColor}\``, inline: true })
      .addFields({ name: "**Creation Date**", value: `${moment(role.createdAt).format("dddd, MMMM Do YYYY, h:mm A")}`, inline: false })
      .addFields({ name: `**${role.members.size} Member(s)**`, value: role.members.size, inline: false })

    message.channel.send({ embeds: [roleInfoEmbed] });
  }
}