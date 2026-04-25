const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

const MODES = { off: 'off', none: 'off', song: 'track', track: 'track', queue: 'queue', all: 'queue' };

module.exports = {
  category: 'music',
  help: [{ name: 'loop', description: 'Set the loop mode (off / song / queue)', aliases: 'repeat', parameters: '(off | song | queue)', information: 'n/a', usage: 'loop (off | song | queue)', example: 'loop song' }],
  name: 'loop',
  aliases: ['repeat'],

  run: async (client, message, args) => {
    const player = client.lavalink?.getPlayer(message.guild.id);
    if (!player || !player.queue.current) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Nothing is currently playing.`)] });
    const arg = (args[0] || '').toLowerCase();
    if (!(arg in MODES))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Mode must be \`off\`, \`song\`, or \`queue\`.`)] });
    await player.setRepeatMode(MODES[arg]);
    const label = MODES[arg] === 'track' ? 'song' : MODES[arg];
    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Loop set to \`${label}\`.`)] });
  },
};
