const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { formatMs } = require('../handlers/music');

const REPEAT_LABEL = { off: 'off', track: 'song', queue: 'queue' };

module.exports = {
  category: 'music',
  help: [{ name: 'nowplaying', description: 'View the currently playing track', aliases: 'np', parameters: 'n/a', information: 'n/a', usage: 'nowplaying', example: 'nowplaying' }],
  name: 'nowplaying',
  aliases: ['np', 'current'],

  run: async (client, message) => {
    const player = client.lavalink?.getPlayer(message.guild.id);
    const current = player?.queue?.current;
    if (!current)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Nothing is currently playing.`)] });

    const requester = current.requester ? `<@${current.requester.id}>` : 'unknown';
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(current.info.title)
      .setURL(current.info.uri)
      .setThumbnail(current.info.artworkUrl || null)
      .addFields(
        { name: 'Duration', value: `\`${formatMs(player.position)} / ${formatMs(current.info.duration)}\``, inline: true },
        { name: 'Volume', value: `\`${player.volume}%\``, inline: true },
        { name: 'Loop', value: `\`${REPEAT_LABEL[player.repeatMode] || 'off'}\``, inline: true },
        { name: 'Requested by', value: requester, inline: true },
      );
    message.channel.send({ embeds: [embed] });
  },
};
