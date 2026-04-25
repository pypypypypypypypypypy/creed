const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

module.exports = {
  category: 'music',
  help: [{ name: 'shuffle', description: 'Shuffle the current queue', aliases: 'n/a', parameters: 'n/a', information: 'n/a', usage: 'shuffle', example: 'shuffle' }],
  name: 'shuffle',
  aliases: [],

  run: async (client, message) => {
    const player = client.lavalink?.getPlayer(message.guild.id);
    if (!player || !player.queue.current) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Nothing is currently playing.`)] });
    if (player.queue.tracks.length < 2) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Need at least 2 upcoming songs to shuffle.`)] });
    await player.queue.shuffle();
    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Queue shuffled.`)] });
  },
};
