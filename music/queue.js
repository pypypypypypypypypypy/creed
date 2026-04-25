const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { formatMs } = require('../handlers/music');

module.exports = {
  category: 'music',
  help: [{ name: 'queue', description: 'Show the current music queue', aliases: 'q', parameters: 'n/a', information: 'n/a', usage: 'queue', example: 'queue' }],
  name: 'queue',
  aliases: ['q'],

  run: async (client, message) => {
    const player = client.lavalink?.getPlayer(message.guild.id);
    if (!player || (!player.queue.current && player.queue.tracks.length === 0))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: The queue is empty.`)] });

    const current = player.queue.current;
    const upcoming = player.queue.tracks.slice(0, 10)
      .map((t, i) => `**${i + 1}.** [${t.info.title}](${t.info.uri}) \`[${formatMs(t.info.duration)}]\``)
      .join('\n');
    const more = player.queue.tracks.length > 10 ? `\n…and **${player.queue.tracks.length - 10}** more` : '';
    const total = (current ? 1 : 0) + player.queue.tracks.length;

    const desc =
      (current ? `**Now playing:** [${current.info.title}](${current.info.uri}) \`[${formatMs(current.info.duration)}]\`\n\n` : '') +
      (upcoming ? `**Up next:**\n${upcoming}${more}` : '*No more songs in queue.*');

    message.channel.send({
      embeds: [new EmbedBuilder()
        .setColor(color)
        .setTitle(`Queue · ${total} song${total === 1 ? '' : 's'}`)
        .setDescription(desc)],
    });
  },
};
