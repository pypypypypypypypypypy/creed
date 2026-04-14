const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { fmt, getScope } = require('./utils');

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'leaderboard',
        description: 'View the richest users in the server',
        aliases: 'lb, top',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'leaderboard',
        example: 'leaderboard'
    }
],

    name: 'leaderboard',
  aliases: ['lb', 'top'],

  run: async (client, message, args) => {
    const guildId = message.guild.id;
    const scope = getScope(guildId);

    await message.guild.members.fetch().catch(() => {});

    const walletData = db.get(`economy.${scope}.wallet`) || {};
    const bankData = db.get(`economy.${scope}.bank`) || {};

    const entries = Object.keys(walletData).map(userId => ({
      userId,
      total: (walletData[userId] || 0) + (bankData[userId] || 0)
    })).sort((a, b) => b.total - a.total).slice(0, 10);

    if (!entries.length) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: No economy data found.`)] });
    }

    const lines = entries.map((e, i) => {
      const member = message.guild.members.cache.get(e.userId);
      const name = member ? member.user.username : `<@${e.userId}>`;
      return `**${i + 1}.** ${name} — ${fmt(e.total)}`;
    });

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`💰 Economy Leaderboard — ${message.guild.name}`)
      .setDescription(lines.join('\n'))
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
