const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js')
const Discord = { MessageEmbed: EmbedBuilder };
const convert = require('parse-ms');
const emojis = require('../emojis.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'spotify',
        description: 'View what a user is listening to on Spotify',
        aliases: 'sp',
        parameters: '[user]',
        information: 'n/a',
        usage: 'spotify [user]',
        example: 'spotify user'
    }
],

      name: "spotify",
    aliases: ["sp"],
    category: "utility",

run: async (client, message, args) => {
    let user;
    if (message.mentions.users.first()) {
        user = message.mentions.users.first();
    } else {
        user = message.author;
    }

    let status;
    if (user.presence.activities.length === 1) status = user.presence.activities[0];
    else if (user.presence.activities.length > 1) status = user.presence.activities[1];

    if (user.presence.activities.length === 0 || status.name !== "Spotify" && status.type !== "LISTENING") {
      const spotifyEmbed = new EmbedBuilder()
      .setColor("#efa23a")
      .setDescription(`${emojis.warn} ${message.author}: User isn't playing anything on Spotify`)
        return message.channel.send({ embeds: [spotifyEmbed] });
    }

    if (status !== null && status.type === "LISTENING" && status.name === "Spotify" && status.assets !== null) {
        let image = `https://i.scdn.co/image/${status.assets.largeImage.slice(8)}`,
            url = `https://open.spotify.com/track${status.syncID}`,
            name = status.details,
            artist = status.state,
            album = status.assets.largeText,
            timeStart = status.timestamps.start,
            timeEnd = status.timestamps.end,
            timeConvert = convert(timeEnd - timeStart);

        let minutes = timeConvert.minutes < 10 ? `0${timeConvert.minutes}` : timeConvert.minutes;
        let seconds = timeConvert.seconds < 10 ? `0${timeConvert.seconds}` : timeConvert.seconds;
        let time = `${minutes}:${seconds}`;

        const embed = new EmbedBuilder()
        .setAuthor({ name: "Spotify", iconURL: "https://www.freepnglogos.com/uploads/spotify-logo-png/file-spotify-logo-png-4.png" })
        .setTitle(`**${name}**`)
        .setColor("GREEN")
        .setFooter(message.author.username, message.author.avatarURL({
            forceStatic: false
          }))
        .setTimestamp()
        .setThumbnail(image)
        .addFields({ name: "**Album**", value: album, inline: true })
        .addFields({ name: "**Artist**", value: artist, inline: true })
        .addFields({ name: "**Duration**", value: time, inline: true })
        .addFields({ name: "**Listen Now On Spotify**", value: `[${artist} - ${name}](${url})`, inline: true })

        return message.channel.send({ embeds: [embed] })
    }
}
}