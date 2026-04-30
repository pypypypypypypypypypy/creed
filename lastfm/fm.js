const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const request = require("superagent");
const fs = require('fs');
const path = require('path');
var rp = require('request-promise');
var commaNumber = require('comma-number');
let db2 = require('../db');
const { default_prefix } = require("../config.json");
const { color } = require("../config.json");
const { lastfm } = require("../emojis.json");

module.exports = {
  category: 'lastfm',
  help: [
    {
        name: 'fm',
        description: 'View your Last.fm now playing',
        aliases: 'lfm',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'fm',
        example: 'fm'
    }
],

    name: "fm",
  aliases: ["lfm"],
  usage: "fm",
  category: "lastfm",

  run: (client, message, args) => {
    let member = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || message.member;

    let prefix2 = db2.get(`prefix_${message.guild.id}`);
    if (prefix2 === null) { prefix2 = default_prefix; }

    const FM_FILE = path.join(__dirname, '..', 'fmuser.json');
    const fmData = (() => { try { return JSON.parse(fs.readFileSync(FM_FILE, 'utf8')); } catch { return { users: [] }; } })();
    let [fmUser] = args;

    if (!fmUser) {
      const dbUser = (fmData.users || []).find(u => u.userID === message.author.id);
      if (message.author.bot) return;
      if (!dbUser) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(
            `${lastfm} ${message.author}: Looks like you dont have your username set.\nYou can connect your **Last.fm** using \`${prefix2}lastfm set <username>\``
          )]
        });
      }
      fmUser = dbUser.lastFM;
    }

    var options = {
      uri: "http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=" + fmUser + "&api_key=43693facbb24d1ac893a7d33846b15cc&format=json&extended=1",
      headers: { 'Connection': 'keep-alive', 'Accept-Encoding': '', 'Accept-Language': 'en-US,en;q=0.8' },
      json: true
    };

    rp(options).then(function (lastfmData) {
      var trackName = lastfmData.recenttracks.track[0].name.replace(/ /g, "+");
      var artistName = lastfmData.recenttracks.track[0].artist.name.replace(' ', '+');
      var trackURL = "http://ws.audioscrobbler.com/2.0/?method=track.getInfo&username=" + fmUser + "&api_key=43693facbb24d1ac893a7d33846b15cc&artist=" + artistName + "&track=" + trackName + "&format=json&autocorrect=1";

      var options2 = {
        uri: trackURL,
        headers: { 'Connection': 'keep-alive', 'Accept-Encoding': '', 'Accept-Language': 'en-US,en;q=0.8' },
        json: true
      };

      message.channel.sendTyping().catch(() => {});

      rp(options2).then(function (track) {
        var playCount = '?';
        try {
          if (track.track.userplaycount !== undefined) playCount = track.track.userplaycount;
        } catch (error) {
          playCount = '?';
        }

        const result = request.get(`http://ws.audioscrobbler.com/2.0/?method=user.getRecentTracks&user=${fmUser}&api_key=43693facbb24d1ac893a7d33846b15cc&format=json&limit=1`);
        result.then(res => {
          const latestTrack = res.body.recenttracks.track[0];
          const artist = latestTrack.artist["#text"];
          const artistURL2 = "https://www.last.fm/music/" + artistName;
          const trackNameClean = latestTrack.name;
          const album = latestTrack.album["#text"];
          const cover = latestTrack.image[0]["#text"];
          const trackName2 = lastfmData.recenttracks.track[0].name.replace(/ /g, "+");
          const artistName2 = lastfmData.recenttracks.track[0].artist.name.replace(/ /g, '+');
          const spacer = "/_/";
          const url = "https://www.last.fm/user/" + fmUser;
          const trackURL2 = "https://www.last.fm/music/" + artistName2 + spacer + trackName2;
          const format = commaNumber.bindWith(',', '.');
          const result1 = format(playCount);
          const result2 = format(lastfmData.recenttracks['@attr'].total);

          try {
            const embed = new EmbedBuilder()
              .setAuthor({ name: `Last.fm: ${fmUser}`, iconURL: message.author.displayAvatarURL({ forceStatic: false }), url })
              .setColor(member.displayHexColor || color)
              .setThumbnail(latestTrack.image[3]["#text"])
              .setDescription(`[**${trackNameClean}**](${trackURL2})\nBy [**${artist}**](${artistURL2})・**${album}**`)
              .setFooter({ text: `Plays: ${result1}・Total Scrobbles: ${result2}` })
              .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('fm_like')
                .setEmoji('👍')
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId('fm_dislike')
                .setEmoji('👎')
                .setStyle(ButtonStyle.Danger)
            );

            message.channel.send({ embeds: [embed], components: [row] });
          } catch (error) {
            console.log(error);
            message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`${lastfm} **Last.fm**: Operation failed - The backend service most likely failed, please try again`)] });
          }
        });
      });
    });
  }
};
