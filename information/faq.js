const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js')
const Discord = { MessageEmbed: EmbedBuilder };
const { color } = require("../config.json");

module.exports = {
  category: 'information',
  help: [
    {
        name: 'faq',
        description: 'View frequently asked questions',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'faq',
        example: 'faq'
    }
],

    name: "faq",

  run: async (client, message, args) => {
    const embed = new EmbedBuilder()
      .setAuthor({ name: `bored`, iconURL: client.user.avatarURL() })
      .setImage('https://cdn.discordapp.com/attachments/870209468443533353/871177546446811166/bored_banner.png')
      .setTitle(`Getting started with bored`)
      .setDescription(`Learn how to set up bored in your server or enhance your everyday use with commands & more.\nBy default, in a server with bored, the prefix for the bot is a comma ,.`)
      .addFields({ name: `**Hey There,**`, value: `\u3000Welcome to the support server for bored, a multi-purpose Discord bot fitting all communities with an easy-to-use system. This is the landing page to help you get set up and explaining all the commands you need to know.` })
      .addFields({ name: `**Why Bleed?**`, value: `Bleed is a sophisticated bot. Unlike many bots, bored focuses on a smooth theme, with ease of access to a wide range of commands that may require multiple bots for. Some of it's notable features include Altdentifier, Autorole,  Modlogs, Custom Prefixes and Welcome Messages, also an easy-to-use embed feature. It's the ultimate all in one Discord bot for all servers.` })
      .addFields({ name: `**FAQ**`, value: `Please reach out to **four#0001** on Discord for priority replies. Additionally, you can join the [support server](https://discord.gg/J2uxnApqfH) and send a message in the main channel which will automatically alert us.
  If you are not in the support server or would like an alternative option, you may use ,help in any guild, and bored will DM you so you can submit your request and contact the developers through the bot.
Alternatively, direct message four#0001 with your request.` })
      .setColor(color)
      .setFooter({ text: 'bored bot' })
      .setTimestamp()
    return message.channel.send({ embeds: [embed] })
  }
}