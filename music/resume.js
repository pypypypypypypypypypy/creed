const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

module.exports = {
  category: 'music',
  help: [
    {
        name: 'resume',
        description: 'Resume a paused track',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'resume',
        example: 'resume'
    }
],

    name: 'resume',

  run: async (client, message, args) => {
    if (!message.member.voice.channel) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You need to be in a voice channel.`)] });
    }

    if (!client.musicQueue || !client.musicQueue.get(message.guild.id)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Nothing is paused.`)] });
    }

    const queue = client.musicQueue.get(message.guild.id);
    if (!queue.paused) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: The music is not paused.`)] });

    queue.paused = false;
    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: ▶️ Resumed the music.`)] });
  }
};
