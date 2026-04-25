const { EmbedBuilder, ActivityType } = require('discord.js');
const fetch = require('node-fetch');
const convert = require('parse-ms');
const { color } = require('../config.json');
const emojis = require('../emojis.json');

const SPOTIFY_GREEN = '#1DB954';

function warn(message, text) {
  return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${emojis.warn || '⚠️'} ${message.author}: ${text}`)] });
}
function deny(message, text) {
  return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${emojis.deny || '❌'} ${message.author}: ${text}`)] });
}

let cachedToken = null;
let cachedExpiry = 0;
async function getToken() {
  const now = Date.now();
  if (cachedToken && now < cachedExpiry) return cachedToken;
  const id = process.env.SPOTIFY_CLIENT_ID;
  const sec = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !sec) return null;
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${id}:${sec}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) return null;
  const j = await res.json();
  cachedToken = j.access_token;
  cachedExpiry = now + (j.expires_in - 60) * 1000;
  return cachedToken;
}

async function spotifySearch(query, type, limit = 1) {
  const token = await getToken();
  if (!token) return { error: 'Set env vars `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` to enable Spotify lookups.' };
  const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return { error: `Spotify API returned ${res.status}` };
  return { data: await res.json() };
}

const SUBCOMMANDS = {
  help: 'Show this menu',
  presence: "What a user is listening to (Discord presence) — `[@user]`",
  track: 'Search Spotify for a track — `<name>`',
  album: 'Search Spotify for an album — `<name>`',
  artist: 'Search Spotify for an artist — `<name>`',
  playlist: 'Search Spotify for a playlist — `<name>`',
};

const ALIASES = {
  np: 'presence', nowplaying: 'presence', now: 'presence', listening: 'presence',
  t: 'track', song: 'track', tr: 'track',
  a: 'album', al: 'album',
  ar: 'artist', artists: 'artist',
  p: 'playlist', pl: 'playlist',
  h: 'help', menu: 'help', commands: 'help',
};

async function showHelp(message) {
  const lines = Object.entries(SUBCOMMANDS).map(([cmd, desc]) => `\`,spotify ${cmd}\` — ${desc}`);
  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: 'Spotify — Subcommands', iconURL: 'https://www.freepnglogos.com/uploads/spotify-logo-png/file-spotify-logo-png-4.png' })
    .setDescription(lines.join('\n'))
    .setFooter({ text: 'Tip: ,spotify @user is a shortcut for ,spotify presence @user.' });
  return message.channel.send({ embeds: [embed] });
}

async function runPresence(message, args) {
  if (!message.guild) return warn(message, 'This subcommand only works in a server.');

  let member =
    message.mentions.members.first() ||
    (args[0] && (message.guild.members.cache.get(args[0]) || (await message.guild.members.fetch(args[0]).catch(() => null)))) ||
    message.member;

  if (!member) return warn(message, 'Could not find that user.');

  const presence = member.presence;
  if (!presence || !presence.activities || presence.activities.length === 0) {
    return warn(message, `${member.id === message.author.id ? "You aren't" : `${member.user.username} isn't`} playing anything on Spotify.`);
  }

  const status = presence.activities.find(a => a.name === 'Spotify' && a.type === ActivityType.Listening);
  if (!status || !status.assets || !status.syncId) {
    return warn(message, `${member.id === message.author.id ? "You aren't" : `${member.user.username} isn't`} listening to Spotify.`);
  }

  const largeImageId = status.assets.largeImage || '';
  const image = largeImageId.startsWith('spotify:')
    ? `https://i.scdn.co/image/${largeImageId.slice(8)}`
    : null;
  const url = `https://open.spotify.com/track/${status.syncId}`;

  let time = 'Unknown';
  if (status.timestamps && status.timestamps.start && status.timestamps.end) {
    const t = convert(status.timestamps.end - status.timestamps.start);
    time = `${String(t.minutes).padStart(2, '0')}:${String(t.seconds).padStart(2, '0')}`;
  }

  const embed = new EmbedBuilder()
    .setAuthor({ name: 'Spotify', iconURL: 'https://www.freepnglogos.com/uploads/spotify-logo-png/file-spotify-logo-png-4.png' })
    .setTitle(status.details || 'Unknown')
    .setURL(url)
    .setColor(SPOTIFY_GREEN)
    .setFooter({ text: message.author.username, iconURL: message.author.displayAvatarURL({ forceStatic: false }) })
    .setTimestamp()
    .addFields(
      { name: 'Album', value: (status.assets && status.assets.largeText) || 'Unknown', inline: true },
      { name: 'Artist', value: status.state || 'Unknown', inline: true },
      { name: 'Duration', value: time, inline: true },
    );
  if (image) embed.setThumbnail(image);
  return message.channel.send({ embeds: [embed] });
}

async function runTrack(message, args) {
  const q = args.join(' ').trim();
  if (!q) return warn(message, 'Usage: `,spotify track <name>`');
  const r = await spotifySearch(q, 'track');
  if (r.error) return deny(message, r.error);
  const t = r.data.tracks?.items?.[0];
  if (!t) return warn(message, 'No results.');
  const dur = `${Math.floor(t.duration_ms / 60000)}:${String(Math.floor((t.duration_ms % 60000) / 1000)).padStart(2, '0')}`;
  const embed = new EmbedBuilder()
    .setColor(SPOTIFY_GREEN)
    .setAuthor({ name: 'Spotify Track' })
    .setTitle(`${t.name} — ${t.artists.map(a => a.name).join(', ')}`)
    .setURL(t.external_urls.spotify)
    .addFields(
      { name: 'Album', value: t.album.name, inline: true },
      { name: 'Duration', value: dur, inline: true },
      { name: 'Popularity', value: `${t.popularity}/100`, inline: true },
    );
  if (t.album.images?.[0]?.url) embed.setThumbnail(t.album.images[0].url);
  return message.channel.send({ embeds: [embed] });
}

async function runAlbum(message, args) {
  const q = args.join(' ').trim();
  if (!q) return warn(message, 'Usage: `,spotify album <name>`');
  const r = await spotifySearch(q, 'album');
  if (r.error) return deny(message, r.error);
  const a = r.data.albums?.items?.[0];
  if (!a) return warn(message, 'No results.');
  const released = Math.floor(new Date(a.release_date).getTime() / 1000);
  const embed = new EmbedBuilder()
    .setColor(SPOTIFY_GREEN)
    .setAuthor({ name: 'Spotify Album' })
    .setTitle(`${a.name} — ${a.artists.map(x => x.name).join(', ')}`)
    .setURL(a.external_urls.spotify)
    .addFields(
      { name: 'Released', value: `<t:${released}:D>`, inline: true },
      { name: 'Tracks', value: String(a.total_tracks), inline: true },
      { name: 'Type', value: a.album_type, inline: true },
    );
  if (a.images?.[0]?.url) embed.setThumbnail(a.images[0].url);
  return message.channel.send({ embeds: [embed] });
}

async function runArtist(message, args) {
  const q = args.join(' ').trim();
  if (!q) return warn(message, 'Usage: `,spotify artist <name>`');
  const r = await spotifySearch(q, 'artist');
  if (r.error) return deny(message, r.error);
  const a = r.data.artists?.items?.[0];
  if (!a) return warn(message, 'No results.');
  const embed = new EmbedBuilder()
    .setColor(SPOTIFY_GREEN)
    .setAuthor({ name: 'Spotify Artist' })
    .setTitle(a.name)
    .setURL(a.external_urls.spotify)
    .addFields(
      { name: 'Followers', value: a.followers.total.toLocaleString(), inline: true },
      { name: 'Popularity', value: `${a.popularity}/100`, inline: true },
      { name: 'Genres', value: (a.genres || []).slice(0, 5).join(', ') || '*none listed*', inline: false },
    );
  if (a.images?.[0]?.url) embed.setThumbnail(a.images[0].url);
  return message.channel.send({ embeds: [embed] });
}

async function runPlaylist(message, args) {
  const q = args.join(' ').trim();
  if (!q) return warn(message, 'Usage: `,spotify playlist <name>`');
  const r = await spotifySearch(q, 'playlist');
  if (r.error) return deny(message, r.error);
  const p = r.data.playlists?.items?.find(x => x);
  if (!p) return warn(message, 'No results.');
  const embed = new EmbedBuilder()
    .setColor(SPOTIFY_GREEN)
    .setAuthor({ name: 'Spotify Playlist' })
    .setTitle(p.name)
    .setURL(p.external_urls.spotify)
    .setDescription(p.description ? p.description.slice(0, 300) : '*No description*')
    .addFields(
      { name: 'Owner', value: p.owner?.display_name || 'Unknown', inline: true },
      { name: 'Tracks', value: String(p.tracks?.total ?? 0), inline: true },
    );
  if (p.images?.[0]?.url) embed.setThumbnail(p.images[0].url);
  return message.channel.send({ embeds: [embed] });
}

const HANDLERS = {
  help: (m) => showHelp(m),
  presence: (m, a) => runPresence(m, a),
  track: (m, a) => runTrack(m, a),
  album: (m, a) => runAlbum(m, a),
  artist: (m, a) => runArtist(m, a),
  playlist: (m, a) => runPlaylist(m, a),
};

module.exports = {
  category: 'utility',
  help: [
    { name: 'spotify', description: 'Spotify hub — run with no args for the subcommand menu.', aliases: 'sp', parameters: '[subcommand]', information: 'n/a', usage: 'spotify [subcommand]', example: 'spotify track never gonna give you up' },
    { name: 'spotify presence', description: 'View what a user is listening to on Spotify.', aliases: 'sp np', parameters: '[user]', information: 'n/a', usage: 'spotify presence [user]', example: 'spotify presence @user' },
    { name: 'spotify track', description: 'Search Spotify for a track.', aliases: 'sp t', parameters: '<name>', information: 'n/a', usage: 'spotify track <name>', example: 'spotify track bohemian rhapsody' },
    { name: 'spotify album', description: 'Search Spotify for an album.', aliases: 'sp a', parameters: '<name>', information: 'n/a', usage: 'spotify album <name>', example: 'spotify album dark side of the moon' },
    { name: 'spotify artist', description: 'Search Spotify for an artist.', aliases: 'sp ar', parameters: '<name>', information: 'n/a', usage: 'spotify artist <name>', example: 'spotify artist daft punk' },
    { name: 'spotify playlist', description: 'Search Spotify for a playlist.', aliases: 'sp p', parameters: '<name>', information: 'n/a', usage: 'spotify playlist <name>', example: 'spotify playlist chill vibes' },
  ],

  name: 'spotify',
  aliases: ['sp'],
  category: 'utility',

  run: async (client, message, args) => {
    if (args.length === 0) return runPresence(message, []); // bare ,spotify → presence of caller (back-compat)

    const first = args[0].toLowerCase();
    const sub = HANDLERS[first] ? first : (ALIASES[first] && HANDLERS[ALIASES[first]] ? ALIASES[first] : null);

    if (sub) return HANDLERS[sub](message, args.slice(1));

    // Back-compat: if first arg is a mention or user id → presence lookup
    if (message.mentions.users.size > 0 || /^\d{15,21}$/.test(first)) {
      return runPresence(message, args);
    }

    // Fallback: treat as a track search (most common intent of "spotify <words>")
    return runTrack(message, args);
  },
};
