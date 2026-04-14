const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve, deny } = require('../emojis.json');
const { fmt, getWallet, setWallet, isEnabled, hasAccount, openAccount, parseAmount } = require('./utils');

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'coinflip',
        description: 'Flip a coin and bet on the outcome',
        aliases: 'cf, flip',
        parameters: '(h/t) (amount)',
        information: 'n/a',
        usage: 'coinflip (h/t) (amount)',
        example: 'coinflip h/t amount'
    }
],

    name: 'coinflip',
  aliases: ['cf', 'flip'],

  run: async (client, message, args) => {
    if (!isEnabled(message.guild.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: The economy system is **disabled** in this server.`)] });

    const guildId = message.guild.id;
    const userId = message.author.id;
    if (!hasAccount(guildId, userId)) openAccount(guildId, userId);

    const wallet = getWallet(guildId, userId);
    const amount = parseAmount(args[0], wallet);
    const side = (args[1] || '').toLowerCase();

    if (!args[0] || !args[1]) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Usage: \`coinflip <amount> <heads/tails>\``)] });
    if (!['heads', 'tails', 'h', 't'].includes(side)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Choose **heads** or **tails**.`)] });
    if (isNaN(amount) || amount <= 0) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please provide a **valid** amount.`)] });
    if (amount > wallet) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You don't have enough. Wallet: **${fmt(wallet)}**`)] });

    const normalizedSide = side === 'h' ? 'heads' : side === 't' ? 'tails' : side;
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const coin = result === 'heads' ? '🪙 Heads' : '🌑 Tails';
    const won = normalizedSide === result;

    if (won) {
      setWallet(guildId, userId, wallet + amount);
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#2ecc71').setDescription(`${approve} ${message.author}: The coin landed on **${coin}**! You won **${fmt(amount)}**!`)] });
    } else {
      setWallet(guildId, userId, wallet - amount);
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#e74c3c').setDescription(`${deny} ${message.author}: The coin landed on **${coin}**! You lost **${fmt(amount)}**.`)] });
    }
  }
};
