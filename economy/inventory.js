const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'inventory',
        description: "View your or another user's inventory",
        aliases: 'inv, bag',
        parameters: '[user]',
        information: 'n/a',
        usage: 'inventory [user]',
        example: 'inventory user'
    }
],

    name: 'inventory',
  aliases: ['inv', 'bag'],

  run: async (client, message, args) => {
    const target = message.mentions.members.first() || message.member;
    const guildId = message.guild.id;
    const userId = target.id;

    const inv = db.get(`economy.${guildId}.inventory.${userId}`) || [];

    if (!inv.length) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${target.user.tag}'s inventory is empty.`)] });
    }

    const counts = {};
    for (const item of inv) counts[item] = (counts[item] || 0) + 1;
    const lines = Object.entries(counts).map(([item, count]) => `**${item}** × ${count}`);

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`🎒 ${target.user.username}'s Inventory`)
      .setDescription(lines.join('\n'))
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
