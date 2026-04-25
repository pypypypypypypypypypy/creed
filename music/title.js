const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');

module.exports = {
  category: 'music',
  help: [{ name: 'title', description: 'Show the title of the currently playing track', aliases: 'n/a', parameters: 'n/a', information: 'n/a', usage: 'title', example: 'title' }],
  name: 'title',
  run: async (client, message) => {
    const player = client.lavalink?.getPlayer(message.guild.id);
    const current = player?.queue?.current;
    if (!current) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Nothing is currently playing.`)] });
    return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`Now playing: **[${current.info.title}](${current.info.uri})** by *${current.info.author || 'unknown'}*`)] });
  }
};
