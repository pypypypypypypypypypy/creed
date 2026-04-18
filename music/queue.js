const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');

module.exports = {
  category: 'music',
  help: [
    {
        name: 'queue',
        description: 'View the current music queue',
        aliases: 'q',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'queue',
        example: 'queue'
    }
],

    name: 'queue',
  aliases: ['q'],

  run: async (client, message, args) => {
    if (!client.musicQueue || !client.musicQueue.get(message.guild.id)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: The queue is empty.`)] });
    }

    const queue = client.musicQueue.get(message.guild.id);
    const tracks = queue.tracks || [];

    if (!tracks.length) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription('The queue is currently empty.')] });
    }

    const list = tracks.slice(0, 10).map((t, i) => `**${i + 1}.** ${t.title || t}`).join('\n');
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('🎶 Music Queue')
      .setDescription(list)
      .setFooter({ text: `${tracks.length} song(s) in queue` })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
