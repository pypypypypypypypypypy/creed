const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

module.exports = {
  category: 'music',
  help: [
    {
        name: 'skip',
        description: 'Skip the current song',
        aliases: 'sk',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'skip',
        example: 'skip'
    }
],

    name: 'skip',
  aliases: ['sk'],

  run: async (client, message, args) => {
    if (!message.member.voice.channel) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You need to be in a voice channel.`)] });
    }

    if (!client.musicQueue || !client.musicQueue.get(message.guild.id)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Nothing is currently playing.`)] });
    }

    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: ⏭️ Skipped the current song.`)] });
  }
};
