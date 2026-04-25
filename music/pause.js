const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

module.exports = {
  category: 'music',
  help: [{ name: 'pause', description: 'Pause the current song', aliases: 'n/a', parameters: 'n/a', information: 'n/a', usage: 'pause', example: 'pause' }],
  name: 'pause',
  aliases: [],

  run: async (client, message) => {
    const queue = client.distube.getQueue(message.guild);
    if (!queue) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Nothing is currently playing.`)] });
    if (queue.paused) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Already paused.`)] });
    queue.pause();
    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Paused.`)] });
  },
};
