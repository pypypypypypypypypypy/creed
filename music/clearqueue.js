const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

module.exports = {
  category: 'music',
  help: [{ name: 'clearqueue', description: 'Clear the music queue', aliases: 'cq', parameters: 'n/a', information: 'n/a', usage: 'clearqueue', example: 'clearqueue' }],
  name: 'clearqueue',
  aliases: ['cq'],
  run: async (client, message) => {
    const player = client.lavalink?.getPlayer(message.guild.id);
    if (!player || !player.queue) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Nothing is playing.`)] });
    if (!message.member.voice.channel || message.member.voice.channel.id !== player.voiceChannelId)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Join the voice channel I'm in.`)] });
    const n = player.queue.tracks.length;
    await player.queue.splice(0, n);
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Cleared **${n}** track(s) from the queue.`)] });
  }
};
