const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

module.exports = {
  category: 'music',
  help: [
    {
        name: 'loop',
        description: 'Toggle loop mode for the current track or queue',
        aliases: 'n/a',
        parameters: '[track/queue/off]',
        information: 'n/a',
        usage: 'loop [track/queue/off]',
        example: 'loop track/queue/off'
    }
],

    name: 'loop',
  aliases: ['repeat'],

  run: async (client, message, args) => {
    if (!message.member.voice.channel)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You need to be in a voice channel.`)] });

    const key = `music_loop_${message.guild.id}`;
    const modes = ['off', 'track', 'queue'];
    const current = db.get(key) || 'off';
    const next = modes[(modes.indexOf(current) + 1) % modes.length];
    db.set(key, next);

    const labels = { off: '🔁 Loop: **Off**', track: '🔂 Loop: **Track**', queue: '🔁 Loop: **Queue**' };
    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: ${labels[next]}`)] });
  }
};
