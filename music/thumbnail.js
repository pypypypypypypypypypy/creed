const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');

module.exports = {
  category: 'music',
  help: [{ name: 'thumbnail', description: 'Show the artwork of the currently playing track', aliases: 'art, cover', parameters: 'n/a', information: 'n/a', usage: 'thumbnail', example: 'thumbnail' }],
  name: 'thumbnail',
  aliases: ['art','cover'],
  run: async (client, message) => {
    const player = client.lavalink?.getPlayer(message.guild.id);
    const current = player?.queue?.current;
    if (!current) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Nothing is currently playing.`)] });
    const url = current.info.artworkUrl;
    if (!url) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: No artwork available for this track.`)] });
    return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(current.info.title).setURL(current.info.uri).setImage(url)] });
  }
};
