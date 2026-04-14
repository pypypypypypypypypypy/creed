const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'music',
  help: [
    {
        name: 'play',
        description: 'Play a song or playlist',
        aliases: 'n/a',
        parameters: '(song name / url)',
        information: 'CONNECT',
        usage: 'play (song name / url)',
        example: 'play song name'
    }
],

    name: 'play',
  aliases: ['p'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    const query = args.join(' ');
    if (!query) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}play <song name or URL>\``)] });

    if (!message.member.voice.channel) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You need to be in a voice channel to use this command.`)] });
    }

    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: 🎵 Searching for **${query}**...\n\n*Note: Full music playback requires a music library like DisTube or Lavalink to be set up.*`)] });
  }
};
