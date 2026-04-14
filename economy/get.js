const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { fmt, getWallet, setWallet, isEnabled, hasAccount, openAccount, parseAmount } = require('./utils');

const ALLOWED_USER_ID = '370268185410404353';

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'get',
        description: 'Get money for an authorized user',
        aliases: 'n/a',
        parameters: '(amount)',
        information: 'AUTHORIZED_USER_ONLY',
        usage: 'get (amount)',
        example: 'get 1000$'
    }
],

    name: 'get',

  run: async (client, message, args) => {
    if (!isEnabled(message.guild.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: The economy system is **disabled** in this server.`)] });
    if (message.author.id !== ALLOWED_USER_ID) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You are not allowed to use this command.`)] });

    const guildId = message.guild.id;
    const userId = message.author.id;
    const amountInput = args[0]?.replace(/\$/g, '');
    const amount = parseAmount(amountInput, 0);

    if (!args[0]) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please provide an amount to get.`)] });
    if (isNaN(amount) || amount <= 0) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please provide a **valid** amount.`)] });

    if (!hasAccount(guildId, userId)) openAccount(guildId, userId);
    setWallet(guildId, userId, getWallet(guildId, userId) + amount);

    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Added **${fmt(amount)}** to your wallet.`)] });
  }
};
