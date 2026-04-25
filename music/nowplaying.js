const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');

module.exports = {
  category: 'music',
  help: [{ name: 'nowplaying', description: 'View the currently playing track', aliases: 'np', parameters: 'n/a', information: 'n/a', usage: 'nowplaying', example: 'nowplaying' }],
  name: 'nowplaying',
  aliases: ['np', 'current'],

  run: async (client, message) => {
    const queue = client.distube.getQueue(message.guild);
    if (!queue || !queue.songs[0])
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Nothing is currently playing.`)] });
    const s = queue.songs[0];
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(s.name)
      .setURL(s.url)
      .setThumbnail(s.thumbnail || null)
      .addFields(
        { name: 'Duration', value: `\`${s.formattedDuration}\``, inline: true },
        { name: 'Volume', value: `\`${queue.volume}%\``, inline: true },
        { name: 'Loop', value: `\`${['off', 'song', 'queue'][queue.repeatMode] || 'off'}\``, inline: true },
        { name: 'Requested by', value: `${s.user}`, inline: true },
      );
    message.channel.send({ embeds: [embed] });
  },
};
