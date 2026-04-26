const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve, deny } = require('../emojis.json');

module.exports = {
  category: 'music',
  help: [{ name: 'skip', description: 'Skip the currently playing song', aliases: 's', parameters: 'n/a', information: 'n/a', usage: 'skip', example: 'skip' }],
  name: 'skip',
  aliases: ['next'],

  run: async (client, message) => {
    const player = client.lavalink?.getPlayer(message.guild.id);
    if (!player || !player.queue.current)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Nothing is currently playing.`)] });
    try {
      await player.skip();
      message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Skipped.`)] });
    } catch (e) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#ff5555').setDescription(`${deny} ${message.author}: ${e.message || 'Could not skip.'}`)] });
    }
  },
};
