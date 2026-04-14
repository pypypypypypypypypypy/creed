const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'fun',
  help: [
    {
        name: 'rate',
        description: 'Rate something out of 10',
        aliases: 'n/a',
        parameters: '(thing)',
        information: 'n/a',
        usage: 'rate (thing)',
        example: 'rate thing'
    }
],

    name: 'rate',

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    const thing = args.join(' ');
    if (!thing) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}rate <thing>\``)] });

    const combined = thing.toLowerCase();
    let hash = 0;
    for (let i = 0; i < combined.length; i++) hash = (hash * 31 + combined.charCodeAt(i)) % 101;
    const rating = hash;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('⭐ Rate')
      .setDescription(`I rate **${thing}** a **${rating}/100**!`)
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
