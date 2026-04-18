const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

module.exports = {
  category: 'music',
  help: [
    {
        name: 'shuffle',
        description: 'Shuffle the current music queue',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'shuffle',
        example: 'shuffle'
    }
],

    name: 'shuffle',

  run: async (client, message, args) => {
    if (!message.member.voice.channel)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You need to be in a voice channel.`)] });

    const queue = db.get(`music_queue_${message.guild.id}`) || [];
    if (queue.length < 2)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Not enough songs in the queue to shuffle.`)] });

    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    db.set(`music_queue_${message.guild.id}`, queue);

    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: 🔀 Shuffled **${queue.length}** songs in the queue.`)] });
  }
};
