const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { fmt, getWallet, setWallet, getBank, setBank, isEnabled, hasAccount, openAccount, parseAmount } = require('./utils');

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'withdraw',
        description: 'Withdraw coins from your bank',
        aliases: 'with',
        parameters: '(amount / all)',
        information: 'n/a',
        usage: 'withdraw (amount / all)',
        example: 'withdraw amount /'
    }
],

    name: 'withdraw',
  aliases: ['with'],

  run: async (client, message, args) => {
    if (!isEnabled(message.guild.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: The economy system is **disabled** in this server.`)] });

    const guildId = message.guild.id;
    const userId = message.author.id;
    if (!hasAccount(guildId, userId)) openAccount(guildId, userId);

    const bank = getBank(guildId, userId);
    const amount = parseAmount(args[0], bank);

    if (!args[0]) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please specify an amount to withdraw. Use \`all\` or \`half\`.`)] });
    if (isNaN(amount) || amount <= 0) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please provide a **valid** amount.`)] });
    if (amount > bank) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You don't have enough in your bank. Balance: **${fmt(bank)}**`)] });

    setBank(guildId, userId, bank - amount);
    setWallet(guildId, userId, getWallet(guildId, userId) + amount);

    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Withdrew **${fmt(amount)}** from your bank.`)] });
  }
};
