const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

module.exports = {
  category: 'music',
  help: [{ name: 'pause', description: 'Pause the current song', aliases: 'n/a', parameters: 'n/a', information: 'n/a', usage: 'pause', example: 'pause' }],
  name: 'pause',
  aliases: [],

  run: async (client, message) => {
    const player = client.lavalink?.getPlayer(message.guild.id);
    if (!player || !player.queue.current) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Nothing is currently playing.`)] });
    if (player.paused) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Already paused.`)] });
    await player.pause();
    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Paused.`)] });
  },
};
