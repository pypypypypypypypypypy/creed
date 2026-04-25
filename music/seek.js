const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { formatMs } = require('../handlers/music');

function parseTime(str) {
  if (!str) return null;
  if (/^\d+$/.test(str)) return parseInt(str) * 1000;
  const parts = str.split(':').map(p => parseInt(p));
  if (parts.some(isNaN)) return null;
  let s = 0;
  if (parts.length === 2) s = parts[0] * 60 + parts[1];
  else if (parts.length === 3) s = parts[0] * 3600 + parts[1] * 60 + parts[2];
  else return null;
  return s * 1000;
}

module.exports = {
  category: 'music',
  help: [{ name: 'seek', description: 'Seek to a position in the current track (e.g. 1:30 or 90)', aliases: 'n/a', parameters: '<time>', information: 'n/a', usage: 'seek <time>', example: 'seek 1:30' }],
  name: 'seek',
  run: async (client, message, args) => {
    const player = client.lavalink?.getPlayer(message.guild.id);
    const current = player?.queue?.current;
    if (!current) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Nothing is currently playing.`)] });
    if (!message.member.voice.channel || message.member.voice.channel.id !== player.voiceChannelId)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Join the voice channel I'm in to control playback.`)] });
    const ms = parseTime(args[0]);
    if (ms === null) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Provide a time like \`1:30\` or \`90\`.`)] });
    if (current.info.duration && ms > current.info.duration)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: That's beyond the track length (${formatMs(current.info.duration)}).`)] });
    await player.seek(ms);
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Seeked to \`${formatMs(ms)}\`.`)] });
  }
};
