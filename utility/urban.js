const { EmbedBuilder } = require('discord.js');
const { stripIndents } = require("common-tags");
const fetch = require('node-fetch');
const { color } = require("../config.json");

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'urbandictionary',
        description: 'Look up a term on Urban Dictionary',
        aliases: 'ud, urban, define',
        parameters: '(term)',
        information: 'n/a',
        usage: 'urbandictionary (term)',
        example: 'urbandictionary term'
    }
],

    name: "urbandictionary",
  aliases: ["ud", "urban", "define"],

  run: async (client, message, args) => {
    const mentionedMember = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || message.member;

    const urbanEmbed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: urbandictionary')
      .setDescription('Gets the definition of a word/slang from Urbandictionary')
      .addFields({ name: '**Aliases**', value: 'define, ud, urban', inline: true })
      .addFields({ name: '**Parameters**', value: 'search', inline: true })
      .addFields({ name: '**Information**', value: 'N/A', inline: true })
      .addFields({ name: '**Usage**', value: '```Syntax: urbandictionary <word>\nExample: urbandictionary Slatt```' })
      .setFooter({ text: 'Module: fun' })
      .setTimestamp()
      .setColor(color);

    if (!args[0]) return message.channel.send({ embeds: [urbanEmbed] });

    const query = args.join(' ');

    try {
      const res = await fetch(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (!data.list || data.list.length === 0) return message.channel.send('No results found.');

      const result = data.list[0];
      const { word, definition, example, thumbs_up, thumbs_down, permalink, author } = result;

      const embed = new EmbedBuilder()
        .setColor(mentionedMember.displayHexColor || color)
        .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
        .setTitle(`**${word}**`)
        .setURL(permalink || 'https://www.urbandictionary.com/')
        .setDescription(stripIndents`${(definition || 'No Definition').slice(0, 1000)}
        **Example**\n${(example || 'No Example').slice(0, 500)}`)
        .setTimestamp()
        .addFields({ name: '**Votes**', value: `👍 \`${thumbs_up} / ${thumbs_down}\` 👎` })
        .setFooter({ text: `Urban Dictionary • by ${author || 'Unknown'}` });

      message.channel.send({ embeds: [embed] });
    } catch (e) {
      return message.channel.send('Error fetching definition, try again.');
    }
  }
};