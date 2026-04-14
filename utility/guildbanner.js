const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js')
const Discord = { MessageEmbed: EmbedBuilder };
const { color } = require("../config.json");

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'guildbanner',
        description: "View the server's banner",
        aliases: 'gbanner, serverbanner',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'guildbanner',
        example: 'guildbanner'
    }
],

    name: "guildbanner",
  aliases: ["gbanner", "serverbanner"],
  category: "utility",

  run: async (client, message, args) => {
    let mentionedMember = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!mentionedMember) mentionedMember = message.member;

    const bannerEmbed = new EmbedBuilder()

      .setColor(mentionedMember.displayHexColor || color)
      .setTitle(`${message.guild.name}'s guild banner`)
      .setImage(message.guild.bannerURL({
        forceStatic: false,
        format: "png",
        size: 2048
      }))

    return message.channel.send({ embeds: [bannerEmbed] })
  }
}