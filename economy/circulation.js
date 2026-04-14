const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { isEnabled, fmt, getScope } = require('./utils');

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'circulation',
        description: 'View the total coins in circulation',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'circulation',
        example: 'circulation'
    }
],

    name: 'circulation',

  run: async (client, message, args) => {
    if (!isEnabled(message.guild.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: The economy system is **disabled** in this server.`)] });

    const guildId = message.guild.id;
    const scope = getScope(guildId);
    const data = db.get(`economy.${scope}`) || {};

    let totalWallet = 0, totalBank = 0, accounts = 0;
    const wallets = data.wallet || {};
    const banks = data.bank || {};

    for (const userId of Object.keys(wallets)) {
      totalWallet += wallets[userId] || 0;
      accounts++;
    }
    for (const userId of Object.keys(banks)) {
      totalBank += banks[userId] || 0;
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('💹 Economy Circulation')
      .addFields(
        { name: '💵 Total in Wallets', value: fmt(totalWallet), inline: true },
        { name: '🏦 Total in Banks', value: fmt(totalBank), inline: true },
        { name: '💰 Total in Circulation', value: fmt(totalWallet + totalBank), inline: true },
        { name: '👤 Accounts', value: `${accounts}`, inline: true }
      )
      .setFooter({ text: `Mode: ${db.get(`economy.${guildId}.mode`) || 'guild'}` })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
