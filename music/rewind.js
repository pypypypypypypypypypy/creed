const { EmbedBuilder } = require('discord.js');
const { warn, approve } = require('../emojis.json');
const { formatMs } = require('../handlers/music');

module.exports = {
  category: 'music',
  help: [{ name: 'rewind', description: 'Rewind the current track by N seconds (default 10)', aliases: 'rw', parameters: '[seconds]', information: 'n/a', usage: 'rewind [seconds]', example: 'rewind 30' }],
  name: 'rewind',
  aliases: ['rw'],
  run: async (client, message, args) => {
    const player = client.lavalink?.getPlayer(message.guild.id);
    const current = player?.queue?.current;
    if (!current) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Nothing is playing.`)] });
    const sec = Math.max(1, parseInt(args[0]) || 10);
    const target = Math.max(0, player.position - sec * 1000);
    await player.seek(target);
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Rewound to \`${formatMs(target)}\`.`)] });
  }
};
