const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js')
const Discord = { MessageEmbed: EmbedBuilder };
const { color } = require("../config.json");

module.exports = {
  category: 'fun',
  help: [
    {
        name: 'image',
        description: 'Search for an image',
        aliases: 'im, img',
        parameters: '(query)',
        information: 'n/a',
        usage: 'image (query)',
        example: 'image query'
    }
],

    name: "image",
  aliases: ["im", "img"],

  run: async (client, message, args) => {
    if (!args[0]) {
      const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
        .setTitle('Command: image')
        .setDescription('Search Google for an image')
        .addFields({ name: '**Aliases**', value: 'im, img', inline: true })
        .addFields({ name: '**Parameters**', value: '<search query>', inline: true })
        .addFields({ name: '**Usage**', value: '```Syntax: ,image <search>\nExample: ,image sunset```' })
        .setFooter({ text: 'Module: fun' })
        .setTimestamp();
      return message.channel.send({ embeds: [embed] });
    }

    const query = args.join(' ');
    const encoded = encodeURIComponent(query);
    const searchUrl = `https://www.google.com/search?q=${encoded}&tbm=isch`;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle(`Image Search: ${query}`)
      .setDescription(`[Click here to view image results on Google](${searchUrl})`)
      .setFooter({ text: 'Google Image Search' })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
