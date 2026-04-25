const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');

module.exports = {
  category: 'music',
  help: [{ name: 'queue', description: 'Show the current music queue', aliases: 'q', parameters: 'n/a', information: 'n/a', usage: 'queue', example: 'queue' }],
  name: 'queue',
  aliases: ['q'],

  run: async (client, message) => {
    const queue = client.distube.getQueue(message.guild);
    if (!queue || queue.songs.length === 0)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: The queue is empty.`)] });
    const [current, ...rest] = queue.songs;
    const upcoming = rest.slice(0, 10).map((s, i) => `**${i + 1}.** [${s.name}](${s.url}) \`[${s.formattedDuration}]\``).join('\n');
    const more = rest.length > 10 ? `\n…and **${rest.length - 10}** more` : '';
    const desc = `**Now playing:** [${current.name}](${current.url}) \`[${current.formattedDuration}]\`\n\n` + (upcoming ? `**Up next:**\n${upcoming}${more}` : '*No more songs in queue.*');
    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Queue · ${queue.songs.length} song${queue.songs.length === 1 ? '' : 's'}`).setDescription(desc)] });
  },
};
