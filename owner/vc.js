const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const voice24 = require('../music/voice24');

const OWNER_ID = '370268185410404353';

module.exports = {
  category: 'owner',
  help: [
    {
      name: 'vc',
      description: 'Owner only: join a voice channel forever and play 24/7 music',
      aliases: 'n/a',
      parameters: '(channel)',
      information: 'BOT_OWNER',
      usage: 'vc (channel id or mention)',
      example: 'vc #general',
    },
  ],

  name: 'vc',
  aliases: [],
  category: 'owner',

  run: async (client, message, args) => {
    if (message.author.id !== OWNER_ID) return;

    const arg = args[0];
    if (!arg) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`,vc <channel>\` (or \`,vc stop\` to leave)`)],
      });
    }

    if (arg.toLowerCase() === 'stop' || arg.toLowerCase() === 'leave') {
      voice24.stop(message.guild.id);
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Stopped the 24/7 voice session.`)],
      });
    }

    const id = arg.replace(/[<#>]/g, '');
    const channel = message.guild.channels.cache.get(id) || message.mentions.channels.first();
    if (!channel || (channel.type !== 2 && channel.type !== 13)) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: That isn't a valid voice channel.`)],
      });
    }

    const ok = voice24.start(client, message.guild.id, channel.id);
    if (!ok) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Failed to join ${channel}.`)],
      });
    }

    return message.channel.send({
      embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Joined ${channel} and started 24/7 playback. Bot will rejoin automatically if disconnected or restarted.`)],
    });
  },
};
