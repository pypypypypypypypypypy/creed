const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, loading: loadingEmoji } = require('../emojis.json');
const fetch = require('node-fetch');

async function searchWiki(query) {
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&utf8=1`;
  const searchData = await fetch(searchUrl).then(r => r.json());
  if (!searchData.query.search.length) throw new Error('No results');
  const title = searchData.query.search[0].title;
  const summaryUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages&exintro=1&explaintext=1&titles=${encodeURIComponent(title)}&format=json&pithumbsize=400`;
  const summaryData = await fetch(summaryUrl).then(r => r.json());
  const page = Object.values(summaryData.query.pages)[0];
  const description = (page.extract || 'No description.').slice(0, 1021);
  const wikiUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  const embed = new EmbedBuilder().setColor(color)
    .setAuthor({ name: 'Wikipedia', iconURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Wikipedia-logo-v2.svg/240px-Wikipedia-logo-v2.svg.png' })
    .setTitle(title).setURL(wikiUrl).setDescription(description)
    .setFooter({ text: 'Wikipedia' }).setTimestamp();
  if (page.thumbnail?.source) embed.setThumbnail(page.thumbnail.source);
  return embed;
}

module.exports = {
  category: 'utility',
  name: 'wikipedia',
  aliases: ['wiki', 'wp'],
  help: [{ name: 'wikipedia', description: 'Search Wikipedia', aliases: 'wiki, wp', parameters: '(query)', information: 'n/a', usage: 'wikipedia (query)', example: 'wikipedia Discord' }],

  slashData: {
    name: 'wikipedia',
    description: 'Search Wikipedia for an article',
    dm_permission: true,
    options: [{ type: 3, name: 'query', description: 'What to search for', required: true }],
  },
  runSlash: async (client, interaction) => {
    const query = interaction.options.getString('query');
    await interaction.deferReply();
    try {
      await interaction.editReply({ embeds: [await searchWiki(query)] });
    } catch {
      await interaction.editReply({ content: `No Wikipedia results for **${query}**.` });
    }
  },

  run: async (client, message, args) => {
    if (!args[0]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`,wikipedia <query>\``)] });
    const loading = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${loadingEmoji} Searching...`)] });
    try {
      const embed = await searchWiki(args.join(' '));
      await loading.delete().catch(() => {});
      message.channel.send({ embeds: [embed] });
    } catch {
      await loading.delete().catch(() => {});
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${warn} ${message.author}: No results found.`)] });
    }
  }
};
