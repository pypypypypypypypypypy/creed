const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

module.exports = {
  category: 'music',
  help: [{ name: 'stop', description: 'Stop the music and clear the queue', aliases: 'n/a', parameters: 'n/a', information: 'n/a', usage: 'stop', example: 'stop' }],
  name: 'stop',
  aliases: ['leave', 'disconnect', 'dc'],

  run: async (client, message) => {
    const queue = client.distube.getQueue(message.guild);
    if (!queue) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Nothing is currently playing.`)] });
    queue.stop();
    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Stopped and cleared the queue.`)] });
  },
};
