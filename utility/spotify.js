const { EmbedBuilder, ActivityType } = require('discord.js');
const convert = require('parse-ms');
const emojis = require('../emojis.json');

function warnEmbed(message, text) {
  return message.channel.send({
    embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${emojis.warn || '⚠️'} ${message.author}: ${text}`)],
  });
}

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
      example: 'spotify @user',
    },
  ],

  name: 'spotify',
  aliases: ['sp'],
  category: 'utility',

  run: async (client, message, args) => {
    if (!message.guild) return warnEmbed(message, 'This command only works in a server.');

    let member =
      message.mentions.members.first() ||
      (args[0] && (message.guild.members.cache.get(args[0]) || (await message.guild.members.fetch(args[0]).catch(() => null)))) ||
      message.member;

    if (!member) return warnEmbed(message, 'Could not find that user.');

    const presence = member.presence;
    if (!presence || !presence.activities || presence.activities.length === 0) {
      return warnEmbed(message, `${member.id === message.author.id ? "You aren't" : `${member.user.username} isn't`} playing anything on Spotify.`);
    }

    const status = presence.activities.find(a => a.name === 'Spotify' && a.type === ActivityType.Listening);

    if (!status || !status.assets || !status.syncId) {
      return warnEmbed(message, `${member.id === message.author.id ? "You aren't" : `${member.user.username} isn't`} listening to Spotify.`);
    }

    const largeImageId = status.assets.largeImage || '';
    const image = largeImageId.startsWith('spotify:')
      ? `https://i.scdn.co/image/${largeImageId.slice(8)}`
      : null;
    const url = `https://open.spotify.com/track/${status.syncId}`;
    const name = status.details || 'Unknown';
    const artist = status.state || 'Unknown';
    const album = (status.assets && status.assets.largeText) || 'Unknown';

    let time = 'Unknown';
    if (status.timestamps && status.timestamps.start && status.timestamps.end) {
      const t = convert(status.timestamps.end - status.timestamps.start);
      const minutes = String(t.minutes).padStart(2, '0');
      const seconds = String(t.seconds).padStart(2, '0');
      time = `${minutes}:${seconds}`;
    }

    const embed = new EmbedBuilder()
      .setAuthor({ name: 'Spotify', iconURL: 'https://www.freepnglogos.com/uploads/spotify-logo-png/file-spotify-logo-png-4.png' })
      .setTitle(name)
      .setURL(url)
      .setColor('#1DB954')
      .setFooter({ text: message.author.username, iconURL: message.author.displayAvatarURL({ forceStatic: false }) })
      .setTimestamp()
      .addFields(
        { name: 'Album', value: album, inline: true },
        { name: 'Artist', value: artist, inline: true },
        { name: 'Duration', value: time, inline: true },
        { name: 'Listen on Spotify', value: `[${artist} — ${name}](${url})`, inline: false },
      );

    if (image) embed.setThumbnail(image);

    return message.channel.send({ embeds: [embed] });
  },
};
