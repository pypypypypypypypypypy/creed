const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'music',
  help: [
    {
        name: 'volume',
        description: 'Set the music volume',
        aliases: 'vol',
        parameters: '(1-100)',
        information: 'n/a',
        usage: 'volume (1-100)',
        example: 'volume 1-100'
    }
],

    name: 'volume',
  aliases: ['vol'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.voice.channel) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You need to be in a voice channel.`)] });
    }

    const vol = parseInt(args[0]);
    if (isNaN(vol) || vol < 0 || vol > 200) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}volume <0-200>\``)] });
    }

    if (client.musicQueue && client.musicQueue.get(message.guild.id)) {
      client.musicQueue.get(message.guild.id).volume = vol;
    }

    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: 🔊 Volume set to **${vol}%**.`)] });
  }
};
