const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, deny } = require('../emojis.json');

module.exports = {
  category: 'music',
  help: [{ name: 'play', description: 'Play a song or playlist from YouTube/Spotify/SoundCloud', aliases: 'p', parameters: '(song name / url)', information: 'CONNECT, SPEAK', usage: 'play (song name / url)', example: 'play never gonna give you up' }],
  name: 'play',
  aliases: ['p'],

  run: async (client, message, args) => {
    const vc = message.member.voice.channel;
    if (!vc) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You need to be in a voice channel.`)] });
    const me = message.guild.members.me;
    if (me.voice.channel && me.voice.channel.id !== vc.id) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm already playing in another voice channel.`)] });
    }
    const query = args.join(' ').trim();
    if (!query) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Provide a song name or URL.`)] });

    try {
      await client.distube.play(vc, query, {
        member: message.member,
        textChannel: message.channel,
        message,
      });
    } catch (e) {
      console.error('[play]', e);
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#ff5555').setDescription(`${deny} ${message.author}: Failed to play — \`${(e.message || String(e)).slice(0, 200)}\``)] });
    }
  },
};
