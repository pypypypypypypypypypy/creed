const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

module.exports = {
  category: 'music',
  help: [{ name: 'volume', description: 'Set or view the music volume (0-200)', aliases: 'vol', parameters: '(0-200)', information: 'n/a', usage: 'volume (0-200)', example: 'volume 75' }],
  name: 'volume',
  aliases: ['vol'],

  run: async (client, message, args) => {
    const queue = client.distube.getQueue(message.guild);
    if (!queue) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Nothing is currently playing.`)] });
    if (!args[0]) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`Current volume: \`${queue.volume}%\``)] });
    const v = parseInt(args[0], 10);
    if (Number.isNaN(v) || v < 0 || v > 200)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Volume must be between 0 and 200.`)] });
    queue.setVolume(v);
    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Volume set to \`${v}%\`.`)] });
  },
};
