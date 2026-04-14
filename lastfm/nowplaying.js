const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const rp = require('request-promise');
const fs = require('fs');
const path = require('path');
const commaNumber = require('comma-number');
const db2 = require('../db');
const { default_prefix, lfkey, color } = require('../config.json');
const { lastfm: lfEmoji } = require('../emojis.json');

const APIKEY = lfkey || '43693facbb24d1ac893a7d33846b15cc';
const fmt = commaNumber.bindWith(',', '.');

module.exports = {
  category: 'lastfm',
  help: [
    {
        name: 'nowplaying',
        description: 'View your current Last.fm track',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'nowplaying',
        example: 'nowplaying'
    }
],

    name: 'nowplaying',
  aliases: ['np2'],
  category: 'lastfm',

  run: async (client, message, args) => {
    const FM_FILE = path.join(__dirname, '..', 'fmuser.json');
    const fmData = (() => { try { return JSON.parse(fs.readFileSync(FM_FILE, 'utf8')); } catch { return { users: [] }; } })();

    let prefix = db2.get(`prefix_${message.guild.id}`);
    if (prefix === null) { const { default_prefix: dp } = require('../config.json'); prefix = dp; }

    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || message.member;
    const dbUser = (fmData.users || []).find(u => u.userID === target.id);

    if (!dbUser) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#d1202a').setDescription(`${lfEmoji} ${message.author}: ${target.id === message.author.id ? "You don't" : `**${target.user.username}** doesn't`} have a Last.fm account linked.\nUse \`${prefix}lastfm set <username>\``)] });
    }

    const fmUser = dbUser.lastFM;
    message.channel.sendTyping().catch(() => {});

    try {
      const data = await rp({
        uri: `http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${fmUser}&api_key=${APIKEY}&format=json&extended=1&limit=1`,
        json: true, headers: { 'User-Agent': 'bleed-bot/1.0' }
      });

      const track = data.recenttracks.track[0];
      const nowPlaying = track['@attr']?.nowplaying;
      const total = data.recenttracks['@attr'].total;
      const artist = track.artist?.['#text'] || track.artist?.name || 'Unknown';
      const album = track.album?.['#text'] || '';
      const cover = track.image?.[3]?.['#text'] || '';
      const artistEnc = encodeURIComponent(artist);
      const trackEnc = encodeURIComponent(track.name);
      const url = `https://www.last.fm/user/${fmUser}`;
      const trackUrl = `https://www.last.fm/music/${artistEnc}/_/${trackEnc}`;

      const embedColor = db2.get(`lastfm.color.${target.id}`) || target.displayHexColor || color;
      const embed = new EmbedBuilder()
        .setAuthor({ name: `Last.fm: ${fmUser}`, iconURL: target.user.displayAvatarURL({ forceStatic: false }), url })
        .setColor(embedColor)
        .setDescription(`[**${track.name}**](${trackUrl})\nBy [**${artist}**](https://www.last.fm/music/${artistEnc})${album ? `・**${album}**` : ''}`)
        .setFooter({ text: `Total Scrobbles: ${fmt(total)}${nowPlaying ? ' • Now Playing 🎵' : ' • Last Played'}` })
        .setTimestamp();

      if (cover) embed.setThumbnail(cover);

      const reactions = db2.get(`lastfm.reactions.${message.author.id}`) || { upvote: '👍', downvote: '👎' };
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('np_like').setEmoji(reactions.upvote).setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('np_dislike').setEmoji(reactions.downvote).setStyle(ButtonStyle.Danger)
      );

      message.channel.send({ embeds: [embed], components: [row] });
    } catch (err) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#d1202a').setDescription(`${lfEmoji} **Last.fm**: Failed to fetch data — the API may be unavailable. Try again shortly.`)] });
    }
  }
};
