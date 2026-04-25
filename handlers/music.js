const { DisTube } = require('distube');
const { YouTubePlugin } = require('@distube/youtube');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { approve, warn, deny } = require('../emojis.json');

module.exports = (client) => {
  const distube = new DisTube(client, {
    plugins: [new YouTubePlugin(), new SpotifyPlugin(), new SoundCloudPlugin()],
    emitNewSongOnly: true,
    savePreviousSongs: true,
  });

  client.distube = distube;

  const embed = (text, c = color) =>
    new EmbedBuilder().setColor(c).setDescription(text);

  distube
    .on('playSong', (queue, song) => {
      queue.textChannel?.send({
        embeds: [
          embed(
            `${approve} Now playing: **[${song.name}](${song.url})** \`[${song.formattedDuration}]\` — requested by ${song.user}`
          ),
        ],
      });
    })
    .on('addSong', (queue, song) => {
      queue.textChannel?.send({
        embeds: [
          embed(
            `${approve} Added **[${song.name}](${song.url})** \`[${song.formattedDuration}]\` to the queue — requested by ${song.user}`
          ),
        ],
      });
    })
    .on('addList', (queue, playlist) => {
      queue.textChannel?.send({
        embeds: [
          embed(
            `${approve} Added playlist **[${playlist.name}](${playlist.url})** (${playlist.songs.length} tracks) to the queue`
          ),
        ],
      });
    })
    .on('finish', (queue) => {
      queue.textChannel?.send({
        embeds: [embed(`${approve} Queue finished.`)],
      });
    })
    .on('empty', (queue) => {
      queue.textChannel?.send({
        embeds: [embed(`${warn} Voice channel is empty — leaving.`, '#efa23a')],
      });
    })
    .on('disconnect', (queue) => {
      queue.textChannel?.send({
        embeds: [embed(`${warn} Disconnected from the voice channel.`, '#efa23a')],
      });
    })
    .on('error', (error, queue) => {
      const ch = queue?.textChannel;
      const msg = (error?.message || String(error)).slice(0, 1500);
      console.error('[DisTube]', error);
      ch?.send({
        embeds: [embed(`${deny} Music error: \`${msg}\``, '#ff5555')],
      }).catch(() => {});
    });

  console.log('DisTube initialized.');
};
