const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { fmt } = require('./utils');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'iteminfo',
        description: 'View information about a shop item',
        aliases: 'item',
        parameters: '(item name)',
        information: 'n/a',
        usage: 'iteminfo (item name)',
        example: 'iteminfo item name'
    }
],

    name: 'iteminfo',
  aliases: ['item'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const guildId = message.guild.id;
    const itemName = args.join(' ');

    if (!itemName) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}iteminfo <item name>\``)] });

    const shop = db.get(`economy.${guildId}.shop`) || {};
    const item = shop[itemName.toLowerCase()];

    if (!item) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Item **${itemName}** not found in the shop.`)] });

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`🛍️ ${item.name || itemName}`)
      .addFields(
        { name: 'Price', value: fmt(item.price || 0), inline: true },
        { name: 'Description', value: item.description || 'No description.', inline: false }
      )
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
