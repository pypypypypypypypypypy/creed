const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const fetch = require('node-fetch');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'wikipedia',
        description: 'Search Wikipedia for an article',
        aliases: 'wiki, wp',
        parameters: '(query)',
        information: 'n/a',
        usage: 'wikipedia (query)',
        example: 'wikipedia query'
    }
],

    name: 'wikipedia',
  aliases: ['wiki', 'wp'],
  category: 'utility',

  run: async (client, message, args) => {
    const helpEmbed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: wikipedia')
      .setDescription('Search Wikipedia for a topic.')
      .addFields(
        { name: '**Aliases**', value: 'wiki, wp', inline: true },
        { name: '**Parameters**', value: '[query]', inline: true },
        { name: '**Information**', value: 'N/A', inline: true },
        { name: '**Usage**', value: '```Syntax: ,wikipedia <query>\nExample: ,wikipedia Discord```' }
      )
      .setFooter({ text: 'Module: utility' })
      .setTimestamp()
      .setColor(color);

    if (!args[0]) return message.channel.send({ embeds: [helpEmbed] });

    const query = args.join(' ');
    const loading = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`<a:loading:1496728277690089503> ${message.author}: Searching Wikipedia...`)] });

    try {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&utf8=1`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();

      if (!searchData.query.search.length) {
        await loading.delete().catch(() => {});
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${warn} ${message.author}: No Wikipedia results found for **${query}**.`)] });
      }

      const title = searchData.query.search[0].title;
      const summaryUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&exintro=1&explaintext=1&titles=${encodeURIComponent(title)}&format=json&pithumbsize=400`;
      const summaryRes = await fetch(summaryUrl);
      const summaryData = await summaryRes.json();

      const pages = summaryData.query.pages;
      const page = pages[Object.keys(pages)[0]];
      const extract = page.extract || 'No description available.';
      const thumbnail = page.thumbnail?.source || null;
      const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;

      const description = extract.length > 1024 ? extract.slice(0, 1021) + '...' : extract;

      const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: 'Wikipedia', iconURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Wikipedia-logo-v2.svg/240px-Wikipedia-logo-v2.svg.png' })
        .setTitle(title)
        .setURL(wikiUrl)
        .setDescription(description)
        .setFooter({ text: `Wikipedia • Read more at the link above` })
        .setTimestamp();

      if (thumbnail) embed.setThumbnail(thumbnail);

      await loading.delete().catch(() => {});
      message.channel.send({ embeds: [embed] });
    } catch (e) {
      await loading.delete().catch(() => {});
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${warn} ${message.author}: An error occurred while searching Wikipedia.`)] });
    }
  }
};
