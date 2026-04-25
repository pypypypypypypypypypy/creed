const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

const MODES = { off: 0, none: 0, song: 1, track: 1, queue: 2, all: 2 };

module.exports = {
  category: 'music',
  help: [{ name: 'loop', description: 'Set the loop mode (off / song / queue)', aliases: 'repeat', parameters: '(off | song | queue)', information: 'n/a', usage: 'loop (off | song | queue)', example: 'loop song' }],
  name: 'loop',
  aliases: ['repeat'],

  run: async (client, message, args) => {
    const queue = client.distube.getQueue(message.guild);
    if (!queue) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Nothing is currently playing.`)] });
    const arg = (args[0] || '').toLowerCase();
    if (!(arg in MODES))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Mode must be \`off\`, \`song\`, or \`queue\`.`)] });
    queue.setRepeatMode(MODES[arg]);
    const label = ['off', 'song', 'queue'][MODES[arg]];
    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Loop set to \`${label}\`.`)] });
  },
};
