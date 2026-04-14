const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { fmt, getWallet, setWallet, hasAccount, openAccount } = require('./utils');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'sell',
        description: 'Sell an item from your inventory',
        aliases: 'n/a',
        parameters: '(item) [amount]',
        information: 'n/a',
        usage: 'sell (item) [amount]',
        example: 'sell item amount'
    }
],

    name: 'sell',

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const guildId = message.guild.id;
    const userId = message.author.id;

    const itemName = args.join(' ');
    if (!itemName) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}sell <item name>\``)] });

    const inv = db.get(`economy.${guildId}.inventory.${userId}`) || [];
    const idx = inv.findIndex(i => i.toLowerCase() === itemName.toLowerCase());

    if (idx === -1) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You don't have **${itemName}** in your inventory.`)] });

    const shop = db.get(`economy.${guildId}.shop`) || {};
    const item = shop[itemName.toLowerCase()];
    const sellPrice = item ? Math.floor((item.price || 0) * 0.5) : 10;

    if (!hasAccount(guildId, userId)) openAccount(guildId, userId);

    inv.splice(idx, 1);
    db.set(`economy.${guildId}.inventory.${userId}`, inv);
    setWallet(guildId, userId, getWallet(guildId, userId) + sellPrice);

    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Sold **${itemName}** for ${fmt(sellPrice)}.`)] });
  }
};
