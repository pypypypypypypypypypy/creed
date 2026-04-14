const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'use',
        description: 'Use an item from your inventory',
        aliases: 'n/a',
        parameters: '(item)',
        information: 'n/a',
        usage: 'use (item)',
        example: 'use item'
    }
],

    name: 'use',

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const guildId = message.guild.id;
    const userId = message.author.id;

    const itemName = args.join(' ');
    if (!itemName) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}use <item name>\``)] });

    const inv = db.get(`economy.${guildId}.inventory.${userId}`) || [];
    const idx = inv.findIndex(i => i.toLowerCase() === itemName.toLowerCase());

    if (idx === -1) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You don't have **${itemName}** in your inventory.`)] });

    inv.splice(idx, 1);
    db.set(`economy.${guildId}.inventory.${userId}`, inv);

    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: You used **${itemName}**!`)] });
  }
};
