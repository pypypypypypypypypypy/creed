const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js')
const Discord = { MessageEmbed: EmbedBuilder };
const { color } = require("../config.json");

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'guildicon',
        description: "View the server's icon",
        aliases: 'gicon, servericon',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'guildicon',
        example: 'guildicon'
    }
],

    name: "guildicon",
  aliases: ["gicon", "servericon"],

  run: async (client, message, args) => {
    let mentionedMember = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!mentionedMember) mentionedMember = message.member;

    const iconEmbed = new EmbedBuilder()

      .setColor(mentionedMember.displayHexColor || color)
      .setTitle(`${message.guild.name}'s guild icon`)
      .setImage(message.guild.iconURL({
        forceStatic: false,
        format: "png",
        size: 2048
      }))

    return message.channel.send({ embeds: [iconEmbed] })
  }
}