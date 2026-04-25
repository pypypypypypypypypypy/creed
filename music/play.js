const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve, deny } = require('../emojis.json');
const { formatMs } = require('../handlers/music');

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

    if (!client.lavalink?.useable) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ff5555').setDescription(`${deny} ${message.author}: All music servers are offline. The default public Lavalink nodes are down — set \`LAVALINK_HOST\`/\`LAVALINK_PORT\`/\`LAVALINK_PASSWORD\` env vars to point at a working node, then redeploy.`)] });
    }

    try {
      const player = client.lavalink.getPlayer(message.guild.id) || client.lavalink.createPlayer({
        guildId: message.guild.id,
        voiceChannelId: vc.id,
        textChannelId: message.channel.id,
        selfDeaf: true,
        volume: 100,
      });
      if (!player.connected) await player.connect();

      const result = await player.search({ query, source: 'ytsearch' }, message.author);

      if (!result || !result.tracks?.length) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#ff5555').setDescription(`${deny} ${message.author}: No results found for \`${query.slice(0, 100)}\`.`)] });
      }

      if (result.loadType === 'playlist') {
        await player.queue.add(result.tracks);
        message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Added playlist **${result.playlist?.title || 'Unknown'}** (${result.tracks.length} tracks) to the queue.`)] });
      } else {
        const track = result.tracks[0];
        await player.queue.add(track);
        if (player.playing || player.paused) {
          message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Added **[${track.info.title}](${track.info.uri})** \`[${formatMs(track.info.duration)}]\` to the queue.`)] });
        }
      }

      if (!player.playing && !player.paused && player.queue.tracks.length > 0) {
        await player.play();
      }
    } catch (e) {
      console.error('[play]', e);
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#ff5555').setDescription(`${deny} ${message.author}: Failed to play — \`${(e.message || String(e)).slice(0, 200)}\``)] });
    }
  },
};
