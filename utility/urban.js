const { EmbedBuilder } = require('discord.js');
const { stripIndents } = require('common-tags');
const fetch = require('node-fetch');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');

async function define(query) {
  const res = await fetch(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(query)}`);
  const data = await res.json();
  if (!data.list?.length) throw new Error('No results');
  const r = data.list[0];
  return new EmbedBuilder().setColor(color)
    .setTitle(`**${r.word}**`).setURL(r.permalink || 'https://www.urbandictionary.com/')
    .setDescription(stripIndents`${(r.definition || 'No definition').slice(0, 1000)}\n\n**Example**\n${(r.example || 'None').slice(0, 500)}`)
    .addFields({ name: '**Votes**', value: `👍 \`${r.thumbs_up} / ${r.thumbs_down}\` 👎` })
    .setFooter({ text: `Urban Dictionary • by ${r.author || 'Unknown'}` }).setTimestamp();
}

module.exports = {
  category: 'utility',
  name: 'urbandictionary',
  aliases: ['ud', 'urban', 'define'],
  help: [{ name: 'urbandictionary', description: 'Look up a term on Urban Dictionary', aliases: 'ud, urban, define', parameters: '(term)', information: 'n/a', usage: 'urban (term)', example: 'urban slatt' }],

  slashData: {
    name: 'urban',
    description: 'Look up a word or phrase on Urban Dictionary',
    dm_permission: true,
    options: [{ type: 3, name: 'term', description: 'Term to look up', required: true }],
  },
  runSlash: async (client, interaction) => {
    const term = interaction.options.getString('term');
    await interaction.deferReply();
    try {
      const embed = await define(term);
      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply({ content: `No results found for **${term}**.` });
    }
  },

  run: async (client, message, args) => {
    if (!args[0]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`,urban <term>\``)] });
    try {
      const embed = await define(args.join(' '));
      message.channel.send({ embeds: [embed] });
    } catch {
      message.channel.send({ content: 'No results found.' });
    }
  }
};
