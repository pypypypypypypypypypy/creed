// distube → undici v7 references the `File` global at module-load time.
// Node 18 doesn't expose `File` globally (added as a global in Node 20).
// Provide a minimal stub BEFORE requiring distube so module load succeeds.
if (typeof globalThis.File === 'undefined') {
  try {
    globalThis.File = require('node:buffer').File;
  } catch { /* node:buffer.File not available pre-19.7, fall through */ }
}
if (typeof globalThis.File === 'undefined') {
  globalThis.File = class File extends Blob {
    constructor(parts, name = '', opts = {}) {
      super(parts, opts);
      this.name = String(name);
      this.lastModified = opts.lastModified ?? Date.now();
    }
    get [Symbol.toStringTag]() { return 'File'; }
  };
}

const { DisTube } = require('distube');
const { YouTubePlugin } = require('@distube/youtube');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { approve, warn, deny } = require('../emojis.json');

// Resolve ffmpeg binary: prefer the bundled ffmpeg-static, fall back to system ffmpeg
let ffmpegPath = 'ffmpeg';
try {
  const staticPath = require('ffmpeg-static');
  if (staticPath) ffmpegPath = staticPath;
} catch { /* ffmpeg-static not installed — use system ffmpeg */ }

module.exports = (client) => {
  const distube = new DisTube(client, {
    plugins: [new YouTubePlugin(), new SpotifyPlugin(), new SoundCloudPlugin()],
    emitNewSongOnly: true,
    savePreviousSongs: true,
    ffmpeg: { path: ffmpegPath },
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
