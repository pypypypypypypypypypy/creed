const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js')
const Discord = { MessageEmbed: EmbedBuilder };
const { color } = require("../config.json");

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'google',
        description: 'Search Google and return top results',
        aliases: 'g',
        parameters: '(query)',
        information: 'n/a',
        usage: 'google (query)',
        example: 'google query'
    }
],

    name: "google",
  aliases: [],
  category: "utility",

  run: async (client, message, args) => {
    if (!args[0]) {
      return message.channel.send({ embed: { color: color, description: `Please provide a search query. Example: \`,google discord bots\`` } });
    }

    const query = args.join(' ');
    const encoded = encodeURIComponent(query);
    const searchUrl = `https://www.google.com/search?q=${encoded}`;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({
        name: `${message.author.username}`,
        iconURL: message.author.displayAvatarURL({ forceStatic: false, size: 2048 })
      })
      .setTitle(`Search Results for: ${query}`)
      .setDescription(`[Click here to view Google results](${searchUrl})`)
      .setFooter({ text: 'Google Search' })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
