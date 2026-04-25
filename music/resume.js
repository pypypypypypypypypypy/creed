const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

module.exports = {
  category: 'music',
  help: [{ name: 'resume', description: 'Resume the paused song', aliases: 'n/a', parameters: 'n/a', information: 'n/a', usage: 'resume', example: 'resume' }],
  name: 'resume',
  aliases: ['unpause'],

  run: async (client, message) => {
    const queue = client.distube.getQueue(message.guild);
    if (!queue) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Nothing is currently playing.`)] });
    if (!queue.paused) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Not paused.`)] });
    queue.resume();
    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Resumed.`)] });
  },
};
