const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');

module.exports = {
  category: 'music',
  help: [
    {
        name: 'nowplaying',
        description: 'View the currently playing track',
        aliases: 'np',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'nowplaying',
        example: 'nowplaying'
    }
],

    name: 'nowplaying',
  aliases: ['np'],

  run: async (client, message, args) => {
    if (!client.musicQueue || !client.musicQueue.get(message.guild.id)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Nothing is currently playing.`)] });
    }

    const queue = client.musicQueue.get(message.guild.id);
    const current = queue.current;

    if (!current) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Nothing is currently playing.`)] });

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('🎵 Now Playing')
      .setDescription(`**${current.title || current}**`)
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
