const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');

function cleanTitle(title) {
  if (!title) return '';
  return title
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\b(official|music|video|audio|lyric[s]?|hd|hq|4k|mv|m\/v|visualizer|performance|live|remaster(ed)?|explicit|clean|version|edit|extended|radio|edit|feat\.?|ft\.?)\b/gi, ' ')
    .replace(/[|·•\-–—_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitArtistTitle(rawTitle, author) {
  const title = cleanTitle(rawTitle);
  if (title.includes(' - ')) {
    const [a, ...rest] = title.split(' - ');
    return { artist: a.trim(), track: rest.join(' - ').trim() };
  }
  return { artist: (author || '').replace(/\s*-\s*topic\s*$/i, '').trim(), track: title };
}

async function fetchLyrics(artist, track) {
  const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(track)}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) return null;
    const j = await r.json();
    const lyrics = (j && j.lyrics ? String(j.lyrics) : '').trim();
    return lyrics || null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function chunkLyrics(text, max = 4000) {
  const out = [];
  let buf = '';
  for (const line of text.split('\n')) {
    if ((buf + line + '\n').length > max) {
      if (buf) out.push(buf);
      buf = line + '\n';
    } else {
      buf += line + '\n';
    }
  }
  if (buf) out.push(buf);
  return out;
}

module.exports = {
  category: 'music',
  help: [{
    name: 'lyrics',
    description: 'Fetch lyrics for the current track or a song name',
    aliases: 'ly',
    parameters: '[song name]',
    information: 'If no song name is given, uses the currently playing track.',
    usage: 'lyrics [song name]',
    example: 'lyrics blinding lights',
  }],
  name: 'lyrics',
  aliases: ['ly'],

  run: async (client, message, args) => {
    let artist = '';
    let track = '';
    let displayTitle = '';
    let displayUrl = null;
    let displayThumb = null;

    const query = args.join(' ').trim();

    if (query) {
      if (query.includes(' - ')) {
        const [a, ...rest] = query.split(' - ');
        artist = a.trim();
        track = rest.join(' - ').trim();
      } else {
        artist = '';
        track = query;
      }
      displayTitle = query;
    } else {
      const player = client.lavalink?.getPlayer(message.guild.id);
      const current = player?.queue?.current;
      if (!current) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Nothing is playing — provide a song name, e.g. \`lyrics blinding lights\`.`)],
        });
      }
      const split = splitArtistTitle(current.info.title, current.info.author);
      artist = split.artist;
      track = split.track;
      displayTitle = current.info.title;
      displayUrl = current.info.uri || null;
      displayThumb = current.info.artworkUrl || null;
    }

    if (!track) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Could not figure out the song name.`)],
      });
    }

    let loading;
    try {
      loading = await message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setDescription(`Searching lyrics for \`${[artist, track].filter(Boolean).join(' - ')}\`…`)],
      });
    } catch {}

    let lyrics = null;
    if (artist) lyrics = await fetchLyrics(artist, track);
    if (!lyrics) lyrics = await fetchLyrics(track, artist || track);
    if (!lyrics && track.includes(' ')) {
      const parts = track.split(' ');
      lyrics = await fetchLyrics(parts[0], parts.slice(1).join(' '));
    }

    if (!lyrics) {
      const embed = new EmbedBuilder()
        .setColor('#efa23a')
        .setDescription(`${warn} ${message.author}: No lyrics found for \`${displayTitle}\`.`);
      if (loading) return loading.edit({ embeds: [embed] }).catch(() => {});
      return message.channel.send({ embeds: [embed] });
    }

    const chunks = chunkLyrics(lyrics, 4000);
    const first = new EmbedBuilder()
      .setColor(color)
      .setTitle(displayTitle.length > 256 ? displayTitle.slice(0, 253) + '…' : displayTitle)
      .setDescription(chunks[0]);
    if (displayUrl) first.setURL(displayUrl);
    if (displayThumb) first.setThumbnail(displayThumb);
    if (chunks.length > 1) first.setFooter({ text: `Page 1/${chunks.length}` });

    if (loading) await loading.edit({ embeds: [first] }).catch(() => {});
    else await message.channel.send({ embeds: [first] });

    for (let i = 1; i < chunks.length; i++) {
      const next = new EmbedBuilder()
        .setColor(color)
        .setDescription(chunks[i])
        .setFooter({ text: `Page ${i + 1}/${chunks.length}` });
      await message.channel.send({ embeds: [next] }).catch(() => {});
    }
  },
};
