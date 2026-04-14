const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { fmt, getWallet, setWallet, getBank, setBank, isEnabled, hasAccount, openAccount, parseAmount } = require('./utils');

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'deposit',
        description: 'Deposit coins into your bank',
        aliases: 'dep',
        parameters: '(amount / all)',
        information: 'n/a',
        usage: 'deposit (amount / all)',
        example: 'deposit amount /'
    }
],

    name: 'deposit',
  aliases: ['dep'],

  run: async (client, message, args) => {
    if (!isEnabled(message.guild.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: The economy system is **disabled** in this server.`)] });

    const guildId = message.guild.id;
    const userId = message.author.id;
    if (!hasAccount(guildId, userId)) openAccount(guildId, userId);

    const wallet = getWallet(guildId, userId);
    const amount = parseAmount(args[0], wallet);

    if (!args[0]) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please specify an amount to deposit. Use \`all\` or \`half\`.`)] });
    if (isNaN(amount) || amount <= 0) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please provide a **valid** amount.`)] });
    if (amount > wallet) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You don't have enough in your wallet. Balance: **${fmt(wallet)}**`)] });

    setWallet(guildId, userId, wallet - amount);
    setBank(guildId, userId, getBank(guildId, userId) + amount);

    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Deposited **${fmt(amount)}** into your bank.`)] });
  }
};
