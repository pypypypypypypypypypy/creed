const { EmbedBuilder } = require('discord.js');
const rp = require('request-promise');
const fs = require('fs');
const path = require('path');
const commaNumber = require('comma-number');
const db2 = require('../db');
const { default_prefix, lfkey, color } = require('../config.json');
const { warn, approve, deny, lastfm: lfEmoji } = require('../emojis.json');

const API = 'http://ws.audioscrobbler.com/2.0/';
const APIKEY = lfkey || '43693facbb24d1ac893a7d33846b15cc';
const fmt = commaNumber.bindWith(',', '.');

const FM_FILE = path.join(__dirname, '..', 'fmuser.json');

function getDb() {
  if (!fs.existsSync(FM_FILE)) return { users: [] };
  try { return JSON.parse(fs.readFileSync(FM_FILE, 'utf8')); } catch { return { users: [] }; }
}

function saveDb(data) {
  fs.writeFileSync(FM_FILE, JSON.stringify(data, null, 2));
}

function getFmUsername(db, userId, arg) {
  if (arg && !arg.startsWith('<')) return arg;
  const dbUser = (db.users || []).find(u => u.userID === userId);
  return dbUser ? dbUser.lastFM : null;
}

async function lfm(params) {
  return rp({ uri: API, qs: { ...params, api_key: APIKEY, format: 'json' }, json: true, headers: { 'User-Agent': 'bored-bot/1.0' } });
}

function parsePeriod(str) {
  const map = { '7d': '7day', '7day': '7day', '1m': '1month', '1month': '1month', '3m': '3month', '3month': '3month', '6m': '6month', '6month': '6month', '12m': '12month', '12month': '12month', '1y': '12month', 'overall': 'overall', 'all': 'overall' };
  return map[(str || 'overall').toLowerCase()] || 'overall';
}

async function getLinkedMembers(db, guild) {
  const users = db.users || [];
  const results = [];
  for (const u of users) {
    try {
      const member = await guild.members.fetch(u.userID).catch(() => null);
      if (member) results.push({ userId: u.userID, lfmUser: u.lastFM, member });
    } catch {}
  }
  return results;
}

async function getNowPlaying(fmUser) {
  const data = await lfm({ method: 'user.getrecenttracks', user: fmUser, limit: 1, extended: 1 });
  const track = data.recenttracks.track[0];
  const nowPlaying = track['@attr'] && track['@attr'].nowplaying;
  return { track, nowPlaying, total: data.recenttracks['@attr'].total };
}

module.exports = {
  category: 'lastfm',
  help: [
    {
        name: 'lastfm',
        description: 'Manage Last.fm integration',
        aliases: 'lfm',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'lastfm',
        example: 'lastfm'
    },
    {
        name: 'lastfm set',
        description: 'Link your Last.fm account',
        aliases: 'n/a',
        parameters: '(username)',
        information: 'n/a',
        usage: 'lastfm set (username)',
        example: 'lastfm set username'
    },
    {
        name: 'lastfm remove',
        description: 'Unlink your Last.fm account',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'lastfm remove',
        example: 'lastfm remove'
    },
    {
        name: 'lastfm recent',
        description: 'View your recent tracks',
        aliases: 'n/a',
        parameters: '[user]',
        information: 'n/a',
        usage: 'lastfm recent [user]',
        example: 'lastfm recent user'
    },
    {
        name: 'lastfm topartists',
        description: 'View your top artists',
        aliases: 'n/a',
        parameters: '[user]',
        information: 'n/a',
        usage: 'lastfm topartists [user]',
        example: 'lastfm topartists user'
    },
    {
        name: 'lastfm toptracks',
        description: 'View your top tracks',
        aliases: 'n/a',
        parameters: '[user]',
        information: 'n/a',
        usage: 'lastfm toptracks [user]',
        example: 'lastfm toptracks user'
    }
],

    name: 'lastfm',
  aliases: ['lf'],
  category: 'lastfm',

  run: async (client, message, args) => {
    const db = getDb();
    let prefix = db2.get(`prefix_${message.guild.id}`);
    if (prefix === null) prefix = default_prefix;
    if (message.author.bot) return;

    const sub = (args[0] || '').toLowerCase();

    // ── HELP / MENU ──────────────────────────────────────────────────────────
    if (!sub || sub === 'help' || sub === 'menu' || sub === 'commands' || sub === 'h') {
      const linkedUser = (db.users || []).find(u => u.userID === message.author.id);
      const linkedLine = linkedUser
        ? `Linked to **${linkedUser.lastFM}**.`
        : `You haven't linked a Last.fm account yet — start with \`${prefix}lastfm set <username>\`.`;

      const groups = [
        {
          name: 'Account',
          value: [
            `\`${prefix}lastfm set <user>\` — link your Last.fm`,
            `\`${prefix}lastfm unlink\` — unlink (alias: \`logout\`)`,
            `\`${prefix}lastfm whois [@user]\` — view a user's profile`,
            `\`${prefix}lastfm color <hex>\` — set embed color`,
            `\`${prefix}lastfm mode <template>\` — custom embed template`,
            `\`${prefix}lastfm variables\` — list embed variables`,
            `\`${prefix}lastfm embed view|reset\` — manage embed settings`,
            `\`${prefix}lastfm customcommand <cmd>\` — alias for \`${prefix}fm\``,
            `\`${prefix}lastfm customreactions <up> <down>\` — set fm reactions`,
            `\`${prefix}lastfm addfriends <users…>\` / \`removefriends\``,
          ].join('\n'),
        },
        {
          name: 'Now Playing & Search',
          value: [
            `\`${prefix}lastfm nowplaying [user]\` — current track (aliases: \`np\`, \`playing\`)`,
            `\`${prefix}lastfm artist [artist]\` — artist info & your plays`,
            `\`${prefix}lastfm track [artist - track]\` — track info & your plays`,
            `\`${prefix}lastfm album [artist - album]\` — album info & your plays`,
            `\`${prefix}lastfm overview [artist]\` — full breakdown for an artist`,
          ].join('\n'),
        },
        {
          name: 'Stats',
          value: [
            `\`${prefix}lastfm count\` — your total scrobbles`,
            `\`${prefix}lastfm plays <artist>\` — plays for an artist`,
            `\`${prefix}lastfm playstrack <artist - track>\``,
            `\`${prefix}lastfm playsalbum <artist - album>\``,
            `\`${prefix}lastfm milestone <number>\` — your Nth scrobble`,
            `\`${prefix}lastfm streak\` — current daily-listening streak`,
            `\`${prefix}lastfm discoverydate <artist>\` — when you first heard them`,
          ].join('\n'),
        },
        {
          name: 'Top Charts',
          value: [
            `\`${prefix}lastfm topartists [user]\` (alias: \`ta\`)`,
            `\`${prefix}lastfm topalbums [user]\` (alias: \`tal\`)`,
            `\`${prefix}lastfm toptracks [user]\` (alias: \`tt\`)`,
            `\`${prefix}lastfm toptentracks [artist]\``,
            `\`${prefix}lastfm toptenalbums [artist]\``,
            `\`${prefix}lastfm collage [3x3] [period]\` — image collage`,
          ].join('\n'),
        },
        {
          name: 'Recent & Favorites',
          value: [
            `\`${prefix}lastfm recent [n]\` — recent scrobbles`,
            `\`${prefix}lastfm recentfor <artist>\` — recent by an artist`,
            `\`${prefix}lastfm favorites\` — loved tracks (alias: \`loved\`)`,
            `\`${prefix}lastfm recommendation\` — picks based on your taste`,
          ].join('\n'),
        },
        {
          name: 'Server / Social',
          value: [
            `\`${prefix}lastfm whoknows <artist>\` — who in the server listens (alias: \`wk\`)`,
            `\`${prefix}lastfm wktrack <artist - track>\``,
            `\`${prefix}lastfm wkalbum <artist - album>\``,
            `\`${prefix}lastfm globalwhoknows <artist>\` (alias: \`gwk\`)`,
            `\`${prefix}lastfm friendwhoknows <artist>\``,
            `\`${prefix}lastfm servertracks|serverartists|serveralbums\``,
            `\`${prefix}lastfm scoreboard\` — server scrobble leaderboard`,
            `\`${prefix}lastfm taste @user\` — compatibility with another user`,
            `\`${prefix}lastfm affinity\` — most musically similar members`,
            `\`${prefix}lastfm crowns [@user]\` / \`mostcrowns\``,
          ].join('\n'),
        },
        {
          name: 'External Links',
          value: `\`${prefix}lastfm youtube|spotify|soundcloud|itunes\` — search current track on the chosen platform`,
        },
      ];

      const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: 'Last.fm — Subcommands', iconURL: 'https://cdn-icons-png.flaticon.com/512/2111/2111624.png' })
        .setDescription(`${linkedLine}\nTip: most subcommands accept an optional \`[user]\` argument (Discord mention or Last.fm username).`)
        .addFields(groups)
        .setFooter({ text: `Quick alias: ${prefix}fm = ${prefix}lastfm nowplaying` });
      return message.channel.send({ embeds: [embed] });
    }

    // ── SET ──────────────────────────────────────────────────────────────────
    if (sub === 'set') {
      const fmUser = args[1];
      if (!fmUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You must provide a Last.fm username. Usage: \`${prefix}lastfm set <username>\``)] });
      const existing = (db.users || []).find(u => u.userID === message.author.id);
      if (existing) {
        existing.lastFM = fmUser;
        saveDb(db);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Your Last.fm username has been updated to **${fmUser}**`)] });
      }
      db.users = db.users || [];
      db.users.push({ userID: message.author.id, lastFM: fmUser });
      saveDb(db);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Your Last.fm username has been set to **${fmUser}**`)] });
    }

    // ── UNLINK / LOGOUT ───────────────────────────────────────────────────────
    if (sub === 'unlink' || sub === 'logout') {
      const existing = (db.users || []).find(u => u.userID === message.author.id);
      if (!existing) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#e74c3c').setDescription(`${deny} ${message.author}: No Last.fm username linked.`)] });
      db.users = db.users.filter(u => u.userID !== message.author.id);
      saveDb(db);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Your Last.fm account **${existing.lastFM}** has been unlinked.`)] });
    }

    // ── NOWPLAYING / PLAYING ──────────────────────────────────────────────────
    if (sub === 'nowplaying' || sub === 'playing' || sub === 'np') {
      const targetMember = message.mentions.members.first() || (args[1] && !args[1].startsWith('<') ? null : message.member);
      const fmUser = getFmUsername(db, targetMember ? targetMember.id : message.author.id, args[1]);
      if (!fmUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`${lfEmoji} ${message.author}: No Last.fm account linked. Use \`${prefix}lastfm set <username>\``)] });
      message.channel.sendTyping().catch(() => {});
      const { track, nowPlaying, total } = await getNowPlaying(fmUser);
      const artist = track.artist?.['#text'] || track.artist?.name || 'Unknown';
      const album = track.album?.['#text'] || '';
      const cover = track.image?.[3]?.['#text'] || '';
      const url = `https://www.last.fm/user/${fmUser}`;
      const trackUrl = `https://www.last.fm/music/${encodeURIComponent(artist)}/_/${encodeURIComponent(track.name)}`;
      const embed = new EmbedBuilder()
        .setAuthor({ name: `Last.fm: ${fmUser}`, iconURL: message.author.displayAvatarURL({ forceStatic: false }), url })
        .setColor(db2.get(`lastfm.color.${message.author.id}`) || color)
        .setDescription(`[**${track.name}**](${trackUrl})\nBy [**${artist}**](https://www.last.fm/music/${encodeURIComponent(artist)})${album ? `・**${album}**` : ''}`)
        .setFooter({ text: `Total Scrobbles: ${fmt(total)}${nowPlaying ? ' • Now Playing' : ' • Last Played'}` })
        .setTimestamp();
      if (cover) embed.setThumbnail(cover);
      return message.channel.send({ embeds: [embed] });
    }

    // ── TOPARTISTS ────────────────────────────────────────────────────────────
    if (sub === 'topartists' || sub === 'ta') {
      const fmUser = getFmUsername(db, message.author.id, args[1]);
      if (!fmUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`${lfEmoji} ${message.author}: No Last.fm account linked.`)] });
      const period = parsePeriod(args[2]);
      message.channel.sendTyping().catch(() => {});
      const data = await lfm({ method: 'user.gettopartists', user: fmUser, period, limit: 10 });
      const artists = data.topartists.artist;
      if (!artists?.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No top artists found.`)] });
      const desc = artists.map((a, i) => `**${i + 1}.** [${a.name}](https://www.last.fm/music/${encodeURIComponent(a.name)}) — **${fmt(a.playcount)}** plays`).join('\n');
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setAuthor({ name: `${fmUser}'s Top Artists`, iconURL: message.author.displayAvatarURL({ forceStatic: false }) }).setDescription(desc).setFooter({ text: `Period: ${period}` }).setTimestamp()] });
    }

    // ── TOPALBUMS ─────────────────────────────────────────────────────────────
    if (sub === 'topalbums' || sub === 'tal') {
      const fmUser = getFmUsername(db, message.author.id, args[1]);
      if (!fmUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`${lfEmoji} ${message.author}: No Last.fm account linked.`)] });
      const period = parsePeriod(args[2]);
      message.channel.sendTyping().catch(() => {});
      const data = await lfm({ method: 'user.gettopalbums', user: fmUser, period, limit: 10 });
      const albums = data.topalbums.album;
      if (!albums?.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No top albums found.`)] });
      const desc = albums.map((a, i) => `**${i + 1}.** [${a.name}](${a.url}) by **${a.artist.name}** — **${fmt(a.playcount)}** plays`).join('\n');
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setAuthor({ name: `${fmUser}'s Top Albums`, iconURL: message.author.displayAvatarURL({ forceStatic: false }) }).setDescription(desc).setFooter({ text: `Period: ${period}` }).setTimestamp()] });
    }

    // ── TOPTRACKS ─────────────────────────────────────────────────────────────
    if (sub === 'toptracks' || sub === 'tt') {
      const fmUser = getFmUsername(db, message.author.id, args[1]);
      if (!fmUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`${lfEmoji} ${message.author}: No Last.fm account linked.`)] });
      const period = parsePeriod(args[2]);
      message.channel.sendTyping().catch(() => {});
      const data = await lfm({ method: 'user.gettoptracks', user: fmUser, period, limit: 10 });
      const tracks = data.toptracks.track;
      if (!tracks?.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No top tracks found.`)] });
      const desc = tracks.map((t, i) => `**${i + 1}.** [${t.name}](${t.url}) by **${t.artist.name}** — **${fmt(t.playcount)}** plays`).join('\n');
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setAuthor({ name: `${fmUser}'s Top Tracks`, iconURL: message.author.displayAvatarURL({ forceStatic: false }) }).setDescription(desc).setFooter({ text: `Period: ${period}` }).setTimestamp()] });
    }

    // ── TOPTENTRACKS (top 10 for artist) ─────────────────────────────────────
    if (sub === 'toptentracks') {
      const fmUser = getFmUsername(db, message.author.id, args[1]);
      if (!fmUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`${lfEmoji} ${message.author}: No Last.fm account linked.`)] });
      const artistName = args.slice(2).join(' ');
      message.channel.sendTyping().catch(() => {});
      const data = await lfm({ method: 'user.gettoptracks', user: fmUser, period: 'overall', limit: 200 });
      const tracks = (data.toptracks.track || []).filter(t => !artistName || t.artist.name.toLowerCase().includes(artistName.toLowerCase())).slice(0, 10);
      if (!tracks.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No tracks found${artistName ? ` for **${artistName}**` : ''}.`)] });
      const desc = tracks.map((t, i) => `**${i + 1}.** [${t.name}](${t.url}) — **${fmt(t.playcount)}** plays`).join('\n');
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setAuthor({ name: `${fmUser}'s Top 10 Tracks${artistName ? ` — ${artistName}` : ''}`, iconURL: message.author.displayAvatarURL({ forceStatic: false }) }).setDescription(desc).setTimestamp()] });
    }

    // ── TOPTENALBUMS ──────────────────────────────────────────────────────────
    if (sub === 'toptenalbums') {
      const fmUser = getFmUsername(db, message.author.id, args[1]);
      if (!fmUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`${lfEmoji} ${message.author}: No Last.fm account linked.`)] });
      const artistName = args.slice(2).join(' ');
      message.channel.sendTyping().catch(() => {});
      const data = await lfm({ method: 'user.gettopalbums', user: fmUser, period: 'overall', limit: 200 });
      const albums = (data.topalbums.album || []).filter(a => !artistName || a.artist.name.toLowerCase().includes(artistName.toLowerCase())).slice(0, 10);
      if (!albums.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No albums found${artistName ? ` for **${artistName}**` : ''}.`)] });
      const desc = albums.map((a, i) => `**${i + 1}.** [${a.name}](${a.url}) — **${fmt(a.playcount)}** plays`).join('\n');
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setAuthor({ name: `${fmUser}'s Top 10 Albums${artistName ? ` — ${artistName}` : ''}`, iconURL: message.author.displayAvatarURL({ forceStatic: false }) }).setDescription(desc).setTimestamp()] });
    }

    // ── COUNT ─────────────────────────────────────────────────────────────────
    if (sub === 'count') {
      const fmUser = getFmUsername(db, message.author.id, args[1]);
      if (!fmUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`${lfEmoji} ${message.author}: No Last.fm account linked.`)] });
      message.channel.sendTyping().catch(() => {});
      const data = await lfm({ method: 'user.getinfo', user: fmUser });
      const info = data.user;
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${lfEmoji} **${fmUser}** has **${fmt(info.playcount)}** total scrobbles.`)] });
    }

    // ── ARTIST ────────────────────────────────────────────────────────────────
    if (sub === 'artist') {
      const fmUser = getFmUsername(db, message.author.id, args[1]);
      if (!fmUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`${lfEmoji} ${message.author}: No Last.fm account linked.`)] });
      const artistName = args.slice(2).join(' ');
      message.channel.sendTyping().catch(() => {});
      let targetArtist = artistName;
      if (!targetArtist) {
        const { track } = await getNowPlaying(fmUser);
        targetArtist = track.artist?.['#text'] || track.artist?.name;
      }
      if (!targetArtist) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please provide an artist name.`)] });
      const data = await lfm({ method: 'artist.getinfo', artist: targetArtist, username: fmUser });
      const a = data.artist;
      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(a.name)
        .setURL(a.url)
        .setDescription((a.bio?.summary || '').replace(/<a href[^>]+>[^<]+<\/a>/gi, '').trim().slice(0, 400) || 'No bio available.')
        .addFields(
          { name: 'Listeners', value: fmt(a.stats?.listeners || 0), inline: true },
          { name: 'Scrobbles', value: fmt(a.stats?.playcount || 0), inline: true },
          { name: 'Your Plays', value: fmt(a.stats?.userplaycount || 0), inline: true }
        )
        .setFooter({ text: `Tags: ${(a.tags?.tag || []).slice(0, 3).map(t => t.name).join(', ') || 'None'}` });
      return message.channel.send({ embeds: [embed] });
    }

    // ── TRACK ─────────────────────────────────────────────────────────────────
    if (sub === 'track') {
      const fmUser = getFmUsername(db, message.author.id, args[1]);
      if (!fmUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`${lfEmoji} ${message.author}: No Last.fm account linked.`)] });
      message.channel.sendTyping().catch(() => {});
      let artistName, trackName;
      if (args[2]) {
        const rest = args.slice(2).join(' ');
        const sep = rest.indexOf(' - ');
        if (sep !== -1) { artistName = rest.slice(0, sep).trim(); trackName = rest.slice(sep + 3).trim(); }
        else { trackName = rest; }
      }
      if (!trackName) {
        const { track } = await getNowPlaying(fmUser);
        trackName = track.name;
        artistName = track.artist?.['#text'] || track.artist?.name;
      }
      const data = await lfm({ method: 'track.getinfo', artist: artistName || '', track: trackName, username: fmUser, autocorrect: 1 });
      const t = data.track;
      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${t.name}`)
        .setURL(t.url)
        .setDescription(`By [**${t.artist?.name}**](https://www.last.fm/music/${encodeURIComponent(t.artist?.name || '')})${t.album?.title ? ` — *${t.album.title}*` : ''}`)
        .addFields(
          { name: 'Listeners', value: fmt(t.listeners || 0), inline: true },
          { name: 'Scrobbles', value: fmt(t.playcount || 0), inline: true },
          { name: 'Your Plays', value: fmt(t.userplaycount || 0), inline: true }
        );
      if (t.album?.image?.[3]?.['#text']) embed.setThumbnail(t.album.image[3]['#text']);
      return message.channel.send({ embeds: [embed] });
    }

    // ── ALBUM ─────────────────────────────────────────────────────────────────
    if (sub === 'album') {
      const fmUser = getFmUsername(db, message.author.id, args[1]);
      if (!fmUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`${lfEmoji} ${message.author}: No Last.fm account linked.`)] });
      message.channel.sendTyping().catch(() => {});
      let artistName, albumName;
      if (args[2]) {
        const rest = args.slice(2).join(' ');
        const sep = rest.indexOf(' - ');
        if (sep !== -1) { artistName = rest.slice(0, sep).trim(); albumName = rest.slice(sep + 3).trim(); }
        else albumName = rest;
      }
      if (!albumName) {
        const { track } = await getNowPlaying(fmUser);
        albumName = track.album?.['#text'];
        artistName = track.artist?.['#text'] || track.artist?.name;
      }
      if (!albumName) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Could not determine album. Provide \`artist - album\`.`)] });
      const data = await lfm({ method: 'album.getinfo', artist: artistName || '', album: albumName, username: fmUser, autocorrect: 1 });
      const al = data.album;
      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(al.name)
        .setURL(al.url)
        .setDescription(`By [**${al.artist}**](https://www.last.fm/music/${encodeURIComponent(al.artist)})`)
        .addFields(
          { name: 'Listeners', value: fmt(al.listeners || 0), inline: true },
          { name: 'Scrobbles', value: fmt(al.playcount || 0), inline: true },
          { name: 'Your Plays', value: fmt(al.userplaycount || 0), inline: true },
          { name: 'Tracks', value: `${al.tracks?.track?.length || '?'}`, inline: true }
        );
      if (al.image?.[3]?.['#text']) embed.setThumbnail(al.image[3]['#text']);
      return message.channel.send({ embeds: [embed] });
    }

    // ── PLAYS (artist play count) ─────────────────────────────────────────────
    if (sub === 'plays') {
      const fmUser = getFmUsername(db, message.author.id, args[1]);
      if (!fmUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`${lfEmoji} ${message.author}: No Last.fm account linked.`)] });
      const artistName = args.slice(2).join(' ');
      message.channel.sendTyping().catch(() => {});
      let targetArtist = artistName;
      if (!targetArtist) {
        const { track } = await getNowPlaying(fmUser);
        targetArtist = track.artist?.['#text'] || track.artist?.name;
      }
      const data = await lfm({ method: 'artist.getinfo', artist: targetArtist, username: fmUser });
      const plays = data.artist?.stats?.userplaycount || 0;
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${lfEmoji} **${fmUser}** has **${fmt(plays)}** plays for **${data.artist.name}**.`)] });
    }

    // ── PLAYSTRACK ────────────────────────────────────────────────────────────
    if (sub === 'playstrack') {
      const fmUser = getFmUsername(db, message.author.id, args[1]);
      if (!fmUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`${lfEmoji} ${message.author}: No Last.fm account linked.`)] });
      const rest = args.slice(2).join(' ');
      const sep = rest.indexOf(' - ');
      let artistName, trackName;
      if (sep !== -1) { artistName = rest.slice(0, sep).trim(); trackName = rest.slice(sep + 3).trim(); }
      message.channel.sendTyping().catch(() => {});
      if (!trackName) {
        const { track } = await getNowPlaying(fmUser);
        trackName = track.name; artistName = track.artist?.['#text'] || track.artist?.name;
      }
      const data = await lfm({ method: 'track.getinfo', artist: artistName || '', track: trackName, username: fmUser, autocorrect: 1 });
      const plays = data.track?.userplaycount || 0;
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${lfEmoji} **${fmUser}** has **${fmt(plays)}** plays for **${data.track?.name}** by **${data.track?.artist?.name}**.`)] });
    }

    // ── PLAYSALBUM ────────────────────────────────────────────────────────────
    if (sub === 'playsalbum' || sub === 'playsall') {
      const fmUser = getFmUsername(db, message.author.id, args[1]);
      if (!fmUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`${lfEmoji} ${message.author}: No Last.fm account linked.`)] });
      const rest = args.slice(2).join(' ');
      const sep = rest.indexOf(' - ');
      let artistName, albumName;
      if (sep !== -1) { artistName = rest.slice(0, sep).trim(); albumName = rest.slice(sep + 3).trim(); }
      message.channel.sendTyping().catch(() => {});
      if (!albumName) {
        const { track } = await getNowPlaying(fmUser);
        albumName = track.album?.['#text']; artistName = track.artist?.['#text'] || track.artist?.name;
      }
      if (!albumName) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Provide \`artist - album\`.`)] });
      const data = await lfm({ method: 'album.getinfo', artist: artistName || '', album: albumName, username: fmUser, autocorrect: 1 });
      const plays = data.album?.userplaycount || 0;
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${lfEmoji} **${fmUser}** has **${fmt(plays)}** plays for **${data.album?.name}** by **${data.album?.artist}**.`)] });
    }

    // ── OVERVIEW ──────────────────────────────────────────────────────────────
    if (sub === 'overview') {
      const fmUser = getFmUsername(db, message.author.id, args[1]);
      if (!fmUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`${lfEmoji} ${message.author}: No Last.fm account linked.`)] });
      const artistName = args.slice(2).join(' ');
      message.channel.sendTyping().catch(() => {});
      let targetArtist = artistName;
      if (!targetArtist) {
        const { track } = await getNowPlaying(fmUser);
        targetArtist = track.artist?.['#text'] || track.artist?.name;
      }
      const [artistData, topTracks, topAlbums] = await Promise.all([
        lfm({ method: 'artist.getinfo', artist: targetArtist, username: fmUser }),
        lfm({ method: 'user.gettoptracks', user: fmUser, period: 'overall', limit: 200 }),
        lfm({ method: 'user.gettopalbums', user: fmUser, period: 'overall', limit: 200 }),
      ]);
      const a = artistData.artist;
      const filteredTracks = (topTracks.toptracks.track || []).filter(t => t.artist.name.toLowerCase() === a.name.toLowerCase()).slice(0, 5);
      const filteredAlbums = (topAlbums.topalbums.album || []).filter(al => al.artist.name.toLowerCase() === a.name.toLowerCase()).slice(0, 5);
      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`Overview: ${a.name}`)
        .setURL(a.url)
        .addFields(
          { name: 'Your Plays', value: fmt(a.stats?.userplaycount || 0), inline: true },
          { name: 'Global Scrobbles', value: fmt(a.stats?.playcount || 0), inline: true },
          { name: 'Listeners', value: fmt(a.stats?.listeners || 0), inline: true },
          { name: 'Top Tracks', value: filteredTracks.map((t, i) => `**${i+1}.** ${t.name} (${fmt(t.playcount)})`).join('\n') || 'None', inline: true },
          { name: 'Top Albums', value: filteredAlbums.map((al, i) => `**${i+1}.** ${al.name} (${fmt(al.playcount)})`).join('\n') || 'None', inline: true },
        )
        .setFooter({ text: `Last.fm Overview for ${fmUser}` });
      return message.channel.send({ embeds: [embed] });
    }

    // ── RECENT ────────────────────────────────────────────────────────────────
    if (sub === 'recent') {
      const fmUser = getFmUsername(db, message.author.id, args[1]);
      if (!fmUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`${lfEmoji} ${message.author}: No Last.fm account linked.`)] });
      const limit = Math.min(parseInt(args[2]) || 10, 20);
      message.channel.sendTyping().catch(() => {});
      const data = await lfm({ method: 'user.getrecenttracks', user: fmUser, limit });
      const tracks = data.recenttracks.track;
      const desc = tracks.map((t, i) => {
        const np = t['@attr']?.nowplaying;
        return `**${i + 1}.** [${t.name}](${t.url}) by **${t.artist['#text']}**${np ? ' 🎵' : ''}`;
      }).join('\n');
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setAuthor({ name: `${fmUser}'s Recent Tracks`, iconURL: message.author.displayAvatarURL({ forceStatic: false }) }).setDescription(desc).setTimestamp()] });
    }

    // ── RECENTFOR ─────────────────────────────────────────────────────────────
    if (sub === 'recentfor') {
      const fmUser = getFmUsername(db, message.author.id, args[1]);
      if (!fmUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`${lfEmoji} ${message.author}: No Last.fm account linked.`)] });
      const artistFilter = args.slice(2).join(' ');
      message.channel.sendTyping().catch(() => {});
      const data = await lfm({ method: 'user.getrecenttracks', user: fmUser, limit: 200 });
      const filtered = (data.recenttracks.track || []).filter(t => t.artist['#text'].toLowerCase().includes((artistFilter || '').toLowerCase())).slice(0, 10);
      if (!filtered.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No recent tracks found for **${artistFilter}**.`)] });
      const desc = filtered.map((t, i) => `**${i + 1}.** [${t.name}](${t.url}) — ${t.date ? new Date(t.date['#text']).toLocaleDateString() : 'Now Playing'}`).join('\n');
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setAuthor({ name: `${fmUser}'s Recent Tracks — ${artistFilter}`, iconURL: message.author.displayAvatarURL({ forceStatic: false }) }).setDescription(desc).setTimestamp()] });
    }

    // ── FAVORITES ─────────────────────────────────────────────────────────────
    if (sub === 'favorites' || sub === 'loved') {
      const fmUser = getFmUsername(db, message.author.id, args[1]);
      if (!fmUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`${lfEmoji} ${message.author}: No Last.fm account linked.`)] });
      message.channel.sendTyping().catch(() => {});
      const data = await lfm({ method: 'user.getlovedtracks', user: fmUser, limit: 10 });
      const tracks = data.lovedtracks.track;
      if (!tracks?.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} **${fmUser}** has no loved tracks.`)] });
      const desc = tracks.map((t, i) => `**${i + 1}.** [${t.name}](${t.url}) by **${t.artist.name}**`).join('\n');
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setAuthor({ name: `${fmUser}'s Loved Tracks`, iconURL: message.author.displayAvatarURL({ forceStatic: false }) }).setDescription(desc).setTimestamp()] });
    }

    // ── MILESTONE ─────────────────────────────────────────────────────────────
    if (sub === 'milestone') {
      const fmUser = getFmUsername(db, message.author.id, args[1]);
      if (!fmUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`${lfEmoji} ${message.author}: No Last.fm account linked.`)] });
      const num = parseInt(args[2]);
      if (isNaN(num) || num <= 0) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Provide a valid scrobble number.`)] });
      message.channel.sendTyping().catch(() => {});
      const userInfo = await lfm({ method: 'user.getinfo', user: fmUser });
      const total = parseInt(userInfo.user.playcount);
      if (num > total) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} **${fmUser}** only has **${fmt(total)}** scrobbles.`)] });
      const page = Math.ceil((total - num + 1) / 1);
      const data = await lfm({ method: 'user.getrecenttracks', user: fmUser, limit: 1, page: total - num + 1 });
      const track = data.recenttracks.track[0];
      if (!track) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Could not retrieve milestone track.`)] });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${lfEmoji} **${fmUser}**'s **#${fmt(num)}** scrobble was **${track.name}** by **${track.artist['#text']}**${track.date ? ` on ${new Date(parseInt(track.date.uts) * 1000).toLocaleDateString()}` : ''}.`)] });
    }

    // ── STREAK ────────────────────────────────────────────────────────────────
    if (sub === 'streak') {
      const fmUser = getFmUsername(db, message.author.id, args[1]);
      if (!fmUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`${lfEmoji} ${message.author}: No Last.fm account linked.`)] });
      message.channel.sendTyping().catch(() => {});
      const data = await lfm({ method: 'user.getrecenttracks', user: fmUser, limit: 200 });
      const tracks = (data.recenttracks.track || []).filter(t => t.date);
      const days = new Set(tracks.map(t => new Date(parseInt(t.date.uts) * 1000).toDateString()));
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${lfEmoji} **${fmUser}** has scrobbled on **${days.size}** unique days in their last 200 tracks.`)] });
    }

    // ── DISCOVERYDATE ─────────────────────────────────────────────────────────
    if (sub === 'discoverydate') {
      const fmUser = getFmUsername(db, message.author.id, args[1]);
      if (!fmUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`${lfEmoji} ${message.author}: No Last.fm account linked.`)] });
      const artistName = args.slice(2).join(' ');
      message.channel.sendTyping().catch(() => {});
      let targetArtist = artistName;
      if (!targetArtist) { const { track } = await getNowPlaying(fmUser); targetArtist = track.artist?.['#text'] || track.artist?.name; }
      const userInfo = await lfm({ method: 'user.getinfo', user: fmUser });
      const total = parseInt(userInfo.user.playcount);
      const data = await lfm({ method: 'user.getrecenttracks', user: fmUser, limit: 200, page: Math.ceil(total / 200) });
      const tracks = (data.recenttracks.track || []).filter(t => t.artist['#text'].toLowerCase() === targetArtist.toLowerCase() && t.date);
      if (!tracks.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No tracks found for **${targetArtist}** in your history.`)] });
      const oldest = tracks[tracks.length - 1];
      const date = new Date(parseInt(oldest.date.uts) * 1000);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${lfEmoji} **${fmUser}** first listened to **${targetArtist}** on **${date.toDateString()}** with *${oldest.name}*.`)] });
    }

    // ── WHOKNOWS ──────────────────────────────────────────────────────────────
    if (sub === 'whoknows' || sub === 'wk') {
      const artistName = args.slice(1).join(' ');
      message.channel.sendTyping().catch(() => {});
      const members = await getLinkedMembers(db, message.guild);
      if (!members.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No users with linked Last.fm accounts in this server.`)] });
      const myFmUser = getFmUsername(db, message.author.id, null);
      let targetArtist = artistName;
      if (!targetArtist && myFmUser) { const { track } = await getNowPlaying(myFmUser); targetArtist = track.artist?.['#text'] || track.artist?.name; }
      if (!targetArtist) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please provide an artist name.`)] });
      const results = [];
      await Promise.all(members.map(async m => {
        try {
          const data = await lfm({ method: 'artist.getinfo', artist: targetArtist, username: m.lfmUser });
          const plays = parseInt(data.artist?.stats?.userplaycount || 0);
          if (plays > 0) results.push({ name: m.member.user.username, plays });
        } catch {}
      }));
      results.sort((a, b) => b.plays - a.plays);
      if (!results.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No one in this server listens to **${targetArtist}**.`)] });
      const desc = results.slice(0, 15).map((r, i) => `**${i + 1}.** ${r.name} — **${fmt(r.plays)}** plays`).join('\n');
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Who knows ${targetArtist}?`).setDescription(desc).setTimestamp()] });
    }

    // ── WKTRACK ───────────────────────────────────────────────────────────────
    if (sub === 'wktrack') {
      const rest = args.slice(1).join(' ');
      const sep = rest.indexOf(' - ');
      let artistName, trackName;
      if (sep !== -1) { artistName = rest.slice(0, sep).trim(); trackName = rest.slice(sep + 3).trim(); }
      else trackName = rest;
      message.channel.sendTyping().catch(() => {});
      const members = await getLinkedMembers(db, message.guild);
      if (!members.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No linked users in this server.`)] });
      if (!trackName) {
        const myFmUser = getFmUsername(db, message.author.id, null);
        if (myFmUser) { const { track } = await getNowPlaying(myFmUser); trackName = track.name; artistName = track.artist?.['#text'] || track.artist?.name; }
      }
      if (!trackName) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Provide a track. Use \`artist - track\`.`)] });
      const results = [];
      await Promise.all(members.map(async m => {
        try {
          const data = await lfm({ method: 'track.getinfo', artist: artistName || '', track: trackName, username: m.lfmUser, autocorrect: 1 });
          const plays = parseInt(data.track?.userplaycount || 0);
          if (plays > 0) results.push({ name: m.member.user.username, plays });
        } catch {}
      }));
      results.sort((a, b) => b.plays - a.plays);
      if (!results.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No one in this server has listened to that track.`)] });
      const desc = results.slice(0, 15).map((r, i) => `**${i + 1}.** ${r.name} — **${fmt(r.plays)}** plays`).join('\n');
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Who knows ${trackName}?`).setDescription(desc).setTimestamp()] });
    }

    // ── WKALBUM ───────────────────────────────────────────────────────────────
    if (sub === 'wkalbum') {
      const rest = args.slice(1).join(' ');
      const sep = rest.indexOf(' - ');
      let artistName, albumName;
      if (sep !== -1) { artistName = rest.slice(0, sep).trim(); albumName = rest.slice(sep + 3).trim(); }
      else albumName = rest;
      message.channel.sendTyping().catch(() => {});
      const members = await getLinkedMembers(db, message.guild);
      if (!members.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No linked users in this server.`)] });
      if (!albumName) {
        const myFmUser = getFmUsername(db, message.author.id, null);
        if (myFmUser) { const { track } = await getNowPlaying(myFmUser); albumName = track.album?.['#text']; artistName = track.artist?.['#text'] || track.artist?.name; }
      }
      if (!albumName) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Provide an album. Use \`artist - album\`.`)] });
      const results = [];
      await Promise.all(members.map(async m => {
        try {
          const data = await lfm({ method: 'album.getinfo', artist: artistName || '', album: albumName, username: m.lfmUser, autocorrect: 1 });
          const plays = parseInt(data.album?.userplaycount || 0);
          if (plays > 0) results.push({ name: m.member.user.username, plays });
        } catch {}
      }));
      results.sort((a, b) => b.plays - a.plays);
      if (!results.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No one in this server has listened to that album.`)] });
      const desc = results.slice(0, 15).map((r, i) => `**${i + 1}.** ${r.name} — **${fmt(r.plays)}** plays`).join('\n');
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Who knows ${albumName}?`).setDescription(desc).setTimestamp()] });
    }

    // ── GLOBALWHOKNOWS ────────────────────────────────────────────────────────
    if (sub === 'globalwhoknows' || sub === 'gwk') {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Global who knows requires a global user database. This feature compares across all servers.`)] });
    }

    // ── GLOBALWKTRACK / GLOBALWKALBUM ─────────────────────────────────────────
    if (sub === 'globalwktrack' || sub === 'globalwkalbum') {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Global who knows requires a global user database across all servers.`)] });
    }

    // ── FRIENDWHOKNOWS / FRIENDWKTRACK / FRIENDWKALBUM ────────────────────────
    if (sub === 'friendwhoknows' || sub === 'friendwktrack' || sub === 'friendwkalbum') {
      const myFmUser = getFmUsername(db, message.author.id, null);
      if (!myFmUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`${lfEmoji} ${message.author}: No Last.fm account linked.`)] });
      const friends = db2.get(`lastfm.friends.${message.author.id}`) || [];
      if (!friends.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} You have no friends added. Use \`lastfm addfriends\`.`)] });
      const query = args.slice(1).join(' ');
      const rest = query; const sep = rest.indexOf(' - ');
      let part1 = sep !== -1 ? rest.slice(0, sep).trim() : '', part2 = sep !== -1 ? rest.slice(sep + 3).trim() : rest;
      message.channel.sendTyping().catch(() => {});
      const results = [];
      const method = sub === 'friendwhoknows' ? 'artist.getinfo' : sub === 'friendwktrack' ? 'track.getinfo' : 'album.getinfo';
      const paramKey = sub === 'friendwhoknows' ? 'artist' : sub === 'friendwktrack' ? 'track' : 'album';
      await Promise.all(friends.map(async lfUser => {
        try {
          const params = { method, username: lfUser, autocorrect: 1 };
          if (part1) params.artist = part1;
          params[paramKey] = part2 || part1;
          const data = await lfm(params);
          const obj = data.artist || data.track || data.album;
          const plays = parseInt(obj?.stats?.userplaycount || obj?.userplaycount || 0);
          if (plays > 0) results.push({ name: lfUser, plays });
        } catch {}
      }));
      results.sort((a, b) => b.plays - a.plays);
      if (!results.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} None of your friends have listened to that.`)] });
      const desc = results.map((r, i) => `**${i + 1}.** ${r.name} — **${fmt(r.plays)}** plays`).join('\n');
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Friends Who Know`).setDescription(desc).setTimestamp()] });
    }

    // ── SERVERTRACKS ──────────────────────────────────────────────────────────
    if (sub === 'servertracks') {
      message.channel.sendTyping().catch(() => {});
      const members = await getLinkedMembers(db, message.guild);
      if (!members.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No linked users in this server.`)] });
      const nowPlaying = [];
      await Promise.all(members.map(async m => {
        try {
          const { track, nowPlaying: np } = await getNowPlaying(m.lfmUser);
          if (np) nowPlaying.push({ name: m.member.user.username, track: track.name, artist: track.artist?.['#text'] || track.artist?.name });
        } catch {}
      }));
      if (!nowPlaying.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No one is currently scrobbling.`)] });
      const desc = nowPlaying.map(n => `**${n.name}** — [${n.track}](https://www.last.fm/music/${encodeURIComponent(n.artist)}/_/${encodeURIComponent(n.track)}) by **${n.artist}**`).join('\n');
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('🎵 Now Playing in Server').setDescription(desc).setTimestamp()] });
    }

    // ── SERVERARTISTS ─────────────────────────────────────────────────────────
    if (sub === 'serverartists') {
      message.channel.sendTyping().catch(() => {});
      const members = await getLinkedMembers(db, message.guild);
      if (!members.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No linked users in this server.`)] });
      const artistCounts = {};
      await Promise.all(members.map(async m => {
        try {
          const data = await lfm({ method: 'user.gettopartists', user: m.lfmUser, period: '7day', limit: 5 });
          for (const a of data.topartists.artist || []) {
            artistCounts[a.name] = (artistCounts[a.name] || 0) + parseInt(a.playcount);
          }
        } catch {}
      }));
      const sorted = Object.entries(artistCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
      if (!sorted.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No data available.`)] });
      const desc = sorted.map(([name, plays], i) => `**${i + 1}.** ${name} — **${fmt(plays)}** plays`).join('\n');
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('📊 Server Top Artists (7 days)').setDescription(desc).setTimestamp()] });
    }

    // ── SERVERALBUMS ──────────────────────────────────────────────────────────
    if (sub === 'serveralbums') {
      message.channel.sendTyping().catch(() => {});
      const members = await getLinkedMembers(db, message.guild);
      if (!members.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No linked users in this server.`)] });
      const albumCounts = {};
      await Promise.all(members.map(async m => {
        try {
          const data = await lfm({ method: 'user.gettopalbums', user: m.lfmUser, period: '7day', limit: 5 });
          for (const a of data.topalbums.album || []) {
            const key = `${a.name} by ${a.artist.name}`;
            albumCounts[key] = (albumCounts[key] || 0) + parseInt(a.playcount);
          }
        } catch {}
      }));
      const sorted = Object.entries(albumCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
      if (!sorted.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No data available.`)] });
      const desc = sorted.map(([name, plays], i) => `**${i + 1}.** ${name} — **${fmt(plays)}** plays`).join('\n');
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('📊 Server Top Albums (7 days)').setDescription(desc).setTimestamp()] });
    }

    // ── TASTE ─────────────────────────────────────────────────────────────────
    if (sub === 'taste') {
      const myFmUser = getFmUsername(db, message.author.id, null);
      if (!myFmUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`${lfEmoji} ${message.author}: No Last.fm account linked.`)] });
      const target = message.mentions.members.first() || message.guild.members.cache.get(args[1]);
      if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Mention a user to compare with.`)] });
      const theirFmUser = getFmUsername(db, target.id, null);
      if (!theirFmUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} **${target.user.username}** has no Last.fm linked.`)] });
      const period = parsePeriod(args[2]);
      message.channel.sendTyping().catch(() => {});
      const [myData, theirData] = await Promise.all([
        lfm({ method: 'user.gettopartists', user: myFmUser, period, limit: 50 }),
        lfm({ method: 'user.gettopartists', user: theirFmUser, period, limit: 50 }),
      ]);
      const myArtists = new Set((myData.topartists.artist || []).map(a => a.name.toLowerCase()));
      const theirArtists = (theirData.topartists.artist || []).map(a => a.name.toLowerCase());
      const shared = theirArtists.filter(a => myArtists.has(a));
      const compat = Math.round((shared.length / 50) * 100);
      const sharedDisplay = shared.slice(0, 8).map(a => a.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')).join(', ');
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`🎵 Music Taste Comparison`).addFields({ name: `${myFmUser} vs ${theirFmUser}`, value: `**Compatibility:** ${compat}%\n**Shared Artists:** ${sharedDisplay || 'None'}` }).setFooter({ text: `Period: ${period}` }).setTimestamp()] });
    }

    // ── AFFINITY ──────────────────────────────────────────────────────────────
    if (sub === 'affinity') {
      const myFmUser = getFmUsername(db, message.author.id, null);
      if (!myFmUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`${lfEmoji} ${message.author}: No Last.fm account linked.`)] });
      message.channel.sendTyping().catch(() => {});
      const members = await getLinkedMembers(db, message.guild);
      const myData = await lfm({ method: 'user.gettopartists', user: myFmUser, period: 'overall', limit: 50 });
      const myArtists = new Set((myData.topartists.artist || []).map(a => a.name.toLowerCase()));
      const results = [];
      await Promise.all(members.filter(m => m.userId !== message.author.id).map(async m => {
        try {
          const data = await lfm({ method: 'user.gettopartists', user: m.lfmUser, period: 'overall', limit: 50 });
          const shared = (data.topartists.artist || []).filter(a => myArtists.has(a.name.toLowerCase())).length;
          results.push({ name: m.member.user.username, compat: Math.round((shared / 50) * 100) });
        } catch {}
      }));
      results.sort((a, b) => b.compat - a.compat);
      if (!results.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Not enough linked users to compare.`)] });
      const desc = results.slice(0, 10).map((r, i) => `**${i + 1}.** ${r.name} — **${r.compat}%** compatible`).join('\n');
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`🎵 Music Affinity for ${myFmUser}`).setDescription(desc).setTimestamp()] });
    }

    // ── SCOREBOARD / PLAYLEADERBOARD / TIMELEADERBOARD ────────────────────────
    if (sub === 'scoreboard' || sub === 'playleaderboard' || sub === 'timeleaderboard') {
      message.channel.sendTyping().catch(() => {});
      const members = await getLinkedMembers(db, message.guild);
      if (!members.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No linked users in this server.`)] });
      const results = [];
      await Promise.all(members.map(async m => {
        try {
          const data = await lfm({ method: 'user.getinfo', user: m.lfmUser });
          results.push({ name: m.member.user.username, lfm: m.lfmUser, plays: parseInt(data.user.playcount) });
        } catch {}
      }));
      results.sort((a, b) => b.plays - a.plays);
      if (!results.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No data.`)] });
      const desc = results.slice(0, 15).map((r, i) => `**${i + 1}.** ${r.name} ([${r.lfm}](https://www.last.fm/user/${r.lfm})) — **${fmt(r.plays)}** scrobbles`).join('\n');
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('🏆 Server Scrobble Leaderboard').setDescription(desc).setTimestamp()] });
    }

    // ── CROWNS ────────────────────────────────────────────────────────────────
    if (sub === 'crowns') {
      const targetMember = message.mentions.members.first() || message.member;
      const crowns = db2.get(`lastfm.crowns.users.${message.guild.id}.${targetMember.id}`) || {};
      const crownList = Object.keys(crowns);
      if (!crownList.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} **${targetMember.user.username}** holds no crowns in this server.`)] });
      const desc = crownList.slice(0, 20).map((artist, i) => `**${i + 1}.** ${artist} — **${fmt(crowns[artist])}** plays`).join('\n');
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`👑 ${targetMember.user.username}'s Crowns`).setDescription(desc).setTimestamp()] });
    }

    // ── MOSTCROWNS ────────────────────────────────────────────────────────────
    if (sub === 'mostcrowns') {
      const crownData = db2.get(`lastfm.crowns.users.${message.guild.id}`) || {};
      const counts = Object.entries(crownData).map(([uid, artists]) => ({ uid, count: Object.keys(artists).length })).sort((a, b) => b.count - a.count);
      if (!counts.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No crowns have been claimed yet. Use \`lastfm whoknows\` to claim crowns.`)] });
      const lines = await Promise.all(counts.slice(0, 10).map(async (e, i) => {
        let name = e.uid;
        try { const u = await client.users.fetch(e.uid); name = u.username; } catch {}
        return `**${i + 1}.** ${name} — **${e.count}** crowns`;
      }));
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('👑 Most Crowns').setDescription(lines.join('\n')).setTimestamp()] });
    }

    // ── ADDFRIENDS ────────────────────────────────────────────────────────────
    if (sub === 'addfriends') {
      const toAdd = args.slice(1);
      if (!toAdd.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Provide Last.fm usernames to add.`)] });
      const current = db2.get(`lastfm.friends.${message.author.id}`) || [];
      const added = [];
      for (const u of toAdd) { if (!current.includes(u)) { current.push(u); added.push(u); } }
      db2.set(`lastfm.friends.${message.author.id}`, current);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Added **${added.length}** friend(s): ${added.join(', ')}`)] });
    }

    // ── REMOVEFRIENDS ─────────────────────────────────────────────────────────
    if (sub === 'removefriends') {
      const toRemove = args.slice(1);
      if (!toRemove.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Provide Last.fm usernames to remove.`)] });
      const current = db2.get(`lastfm.friends.${message.author.id}`) || [];
      const updated = current.filter(u => !toRemove.includes(u));
      db2.set(`lastfm.friends.${message.author.id}`, updated);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Removed **${current.length - updated.length}** friend(s).`)] });
    }

    // ── COLOR ─────────────────────────────────────────────────────────────────
    if (sub === 'color') {
      const colorVal = args[1];
      if (!colorVal) {
        db2.delete(`lastfm.color.${message.author.id}`);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Your Last.fm embed color has been reset.`)] });
      }
      const hex = colorVal.startsWith('#') ? colorVal : `#${colorVal}`;
      if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Invalid color. Use a hex code like \`#ff0000\`.`)] });
      db2.set(`lastfm.color.${message.author.id}`, hex);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(hex).setDescription(`${approve} ${message.author}: Your Last.fm embed color has been set to **${hex}**.`)] });
    }

    // ── MODE ──────────────────────────────────────────────────────────────────
    if (sub === 'mode') {
      const template = args.slice(1).join(' ');
      if (!template) {
        db2.delete(`lastfm.mode.${message.author.id}`);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Your Last.fm embed mode has been reset.`)] });
      }
      db2.set(`lastfm.mode.${message.author.id}`, template);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Your custom embed mode has been saved.`)] });
    }

    // ── CUSTOMCOMMAND ─────────────────────────────────────────────────────────
    if (sub === 'customcommand') {
      const cmd = args[1];
      if (!cmd) {
        db2.delete(`lastfm.customcmd.${message.author.id}`);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Custom command cleared.`)] });
      }
      db2.set(`lastfm.customcmd.${message.author.id}`, cmd);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Your custom fm command alias set to \`${cmd}\`.`)] });
    }

    // ── CUSTOMREACTIONS / REACT ───────────────────────────────────────────────
    if (sub === 'customreactions' || sub === 'react') {
      const upvote = args[1], downvote = args[2];
      if (!upvote && !downvote) {
        db2.delete(`lastfm.reactions.${message.author.id}`);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Custom reactions cleared.`)] });
      }
      db2.set(`lastfm.reactions.${message.author.id}`, { upvote: upvote || '👍', downvote: downvote || '👎' });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Custom reactions set to ${upvote || '👍'} / ${downvote || '👎'}.`)] });
    }

    // ── EMBED ─────────────────────────────────────────────────────────────────
    if (sub === 'embed') {
      const embedSub = (args[1] || '').toLowerCase();
      if (embedSub === 'reset') {
        db2.delete(`lastfm.color.${message.author.id}`);
        db2.delete(`lastfm.mode.${message.author.id}`);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Your Last.fm embed settings have been reset.`)] });
      }
      if (embedSub === 'view') {
        const embedColor = db2.get(`lastfm.color.${message.author.id}`) || color;
        const mode = db2.get(`lastfm.mode.${message.author.id}`) || 'Default';
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(embedColor).addFields({ name: 'Color', value: embedColor, inline: true }, { name: 'Mode', value: mode, inline: true })] });
      }
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Use \`lastfm embed reset\` or \`lastfm embed view\`.`)] });
    }

    // ── VARIABLES ─────────────────────────────────────────────────────────────
    if (sub === 'variables') {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Last.fm Embed Variables').setDescription('`{track}` — Track name\n`{artist}` — Artist name\n`{album}` — Album name\n`{plays}` — Track play count\n`{scrobbles}` — Total scrobbles\n`{username}` — Last.fm username\n`{url}` — Track URL')] });
    }

    // ── UPDATE ────────────────────────────────────────────────────────────────
    if (sub === 'update') {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Your Last.fm library is updated automatically with each scrobble.`)] });
    }

    // ── COLLAGE ───────────────────────────────────────────────────────────────
    if (sub === 'collage') {
      const fmUser = getFmUsername(db, message.author.id, args[1]);
      if (!fmUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`${lfEmoji} ${message.author}: No Last.fm account linked.`)] });
      const params = args[2] || '3x3';
      const period = parsePeriod(args[3] || '7day');
      const collageUrl = `https://www.tapmusic.net/collage.php?user=${encodeURIComponent(fmUser)}&type=${period}&size=${params}&caption=true`;
      const embed = new EmbedBuilder().setColor(color).setTitle(`${fmUser}'s Last.fm Collage`).setImage(collageUrl).setFooter({ text: `Period: ${period} | Size: ${params}` }).setURL(`https://www.last.fm/user/${fmUser}`);
      return message.channel.send({ embeds: [embed] });
    }

    // ── WHOIS ─────────────────────────────────────────────────────────────────
    if (sub === 'whois') {
      const target = message.mentions.members.first() || message.guild.members.cache.get(args[1]) || message.member;
      const fmUser = getFmUsername(db, target.id, args[1] && !args[1].startsWith('<') ? args[1] : null);
      if (!fmUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} That user has no Last.fm linked.`)] });
      message.channel.sendTyping().catch(() => {});
      const data = await lfm({ method: 'user.getinfo', user: fmUser });
      const u = data.user;
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(u.name).setURL(u.url).setThumbnail(u.image?.[3]?.['#text'] || '').addFields({ name: 'Scrobbles', value: fmt(u.playcount), inline: true }, { name: 'Artists', value: fmt(u.artist_count || 0), inline: true }, { name: 'Albums', value: fmt(u.album_count || 0), inline: true }, { name: 'Joined', value: new Date(parseInt(u.registered?.unixtime || 0) * 1000).toDateString(), inline: true }).setTimestamp()] });
    }

    // ── RECOMMENDATION ────────────────────────────────────────────────────────
    if (sub === 'recommendation') {
      const fmUser = getFmUsername(db, message.author.id, args[1]);
      if (!fmUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`${lfEmoji} ${message.author}: No Last.fm account linked.`)] });
      message.channel.sendTyping().catch(() => {});
      const topData = await lfm({ method: 'user.gettopartists', user: fmUser, period: 'overall', limit: 5 });
      const topArtists = topData.topartists.artist || [];
      if (!topArtists.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No top artists found.`)] });
      const pivot = topArtists[Math.floor(Math.random() * topArtists.length)];
      const simData = await lfm({ method: 'artist.getsimilar', artist: pivot.name, limit: 10 });
      const similar = (simData.similarartists?.artist || []).filter(a => !topArtists.find(t => t.name.toLowerCase() === a.name.toLowerCase())).slice(0, 5);
      if (!similar.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No recommendations found.`)] });
      const desc = similar.map((a, i) => `**${i + 1}.** [${a.name}](${a.url}) — Similar to **${pivot.name}**`).join('\n');
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('🎵 Music Recommendations').setDescription(desc).setFooter({ text: `Based on your love of ${pivot.name}` }).setTimestamp()] });
    }

    // ── YOUTUBE / SPOTIFY / SOUNDCLOUD / ITUNES ───────────────────────────────
    if (['youtube', 'spotify', 'soundcloud', 'itunes'].includes(sub)) {
      const fmUser = getFmUsername(db, message.author.id, args[1]);
      if (!fmUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`${lfEmoji} ${message.author}: No Last.fm account linked.`)] });
      message.channel.sendTyping().catch(() => {});
      const { track } = await getNowPlaying(fmUser);
      const trackName = track.name, artistName = track.artist?.['#text'] || track.artist?.name;
      const query = encodeURIComponent(`${artistName} ${trackName}`);
      const urls = {
        youtube: `https://www.youtube.com/results?search_query=${query}`,
        spotify: `https://open.spotify.com/search/${query}`,
        soundcloud: `https://soundcloud.com/search?q=${query}`,
        itunes: `https://music.apple.com/us/search?term=${query}`,
      };
      const labels = { youtube: 'YouTube', spotify: 'Spotify', soundcloud: 'SoundCloud', itunes: 'Apple Music' };
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${lfEmoji} **${trackName}** by **${artistName}**\n\n[Search on ${labels[sub]}](${urls[sub]})`)] });
    }

    // ── LOVE / UNLOVE ─────────────────────────────────────────────────────────
    if (sub === 'love' || sub === 'unlove') {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: The \`${sub}\` command requires Last.fm authentication (session key). This feature is not currently supported.`)] });
    }

    // ── DEFAULT ───────────────────────────────────────────────────────────────
    if (!sub) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: To set your Last.fm account: \`${prefix}lastfm set <username>\``)] });
    }

    return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Unknown subcommand \`${sub}\`. Use \`${prefix}help\` for the full list.`)] });
  }
};
