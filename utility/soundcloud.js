const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { color } = require("../config.json");
const { warn } = require('../emojis.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'soundcloud',
        description: 'Search for a SoundCloud track',
        aliases: 'sc',
        parameters: '(query)',
        information: 'n/a',
        usage: 'soundcloud (query)',
        example: 'soundcloud query'
    }
],

    name: "soundcloud",
  aliases: ["sc"],
  category: "utility",

  run: async (client, message, args) => {
    if (!args[0]) {
      return message.channel.send({ embeds: [new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
        .setTitle('Command: soundcloud')
        .setDescription('Search SoundCloud for songs or artists')
        .addFields(
          { name: '**Aliases**', value: 'sc', inline: true },
          { name: '**Parameters**', value: '<search query>', inline: true },
          { name: '**Usage**', value: '```Syntax: ,soundcloud <query>\nExample: ,soundcloud lofi hip hop```' }
        )
        .setFooter({ text: 'Module: utility' })
        .setTimestamp()
      ] });
    }

    const query = args.join(' ');
    const encoded = encodeURIComponent(query);
    const searchUrl = `https://soundcloud.com/search?q=${encoded}`;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle(`SoundCloud: ${query}`)
      .setDescription(`Click the button below to view results for **${query}** on SoundCloud.`)
      .setThumbnail('https://a-v2.sndcdn.com/assets/images/sc-icons/ios-a62dfc8fe7.png')
      .setFooter({ text: 'SoundCloud Search' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Search on SoundCloud')
        .setStyle(ButtonStyle.Link)
        .setURL(searchUrl)
        .setEmoji('🔊')
    );

    message.channel.send({ embeds: [embed], components: [row] });
  }
};
