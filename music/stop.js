const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

module.exports = {
  category: 'music',
  help: [
    {
        name: 'stop',
        description: 'Stop music and clear the queue',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'stop',
        example: 'stop'
    }
],

    name: 'stop',

  run: async (client, message, args) => {
    if (!message.member.voice.channel) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You need to be in a voice channel.`)] });
    }

    if (client.musicQueue) client.musicQueue.delete(message.guild.id);

    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: ⏹️ Stopped the music and cleared the queue.`)] });
  }
};
