const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { fmt, getWallet, setWallet, isEnabled, hasAccount, openAccount, parseAmount } = require('./utils');

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'transfer',
        description: 'Transfer coins to another user',
        aliases: 'pay',
        parameters: '(user) (amount)',
        information: 'n/a',
        usage: 'transfer (user) (amount)',
        example: 'transfer user amount'
    }
],

    name: 'transfer',
  aliases: ['pay'],

  run: async (client, message, args) => {
    if (!isEnabled(message.guild.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: The economy system is **disabled** in this server.`)] });

    const guildId = message.guild.id;
    const userId = message.author.id;
    if (!hasAccount(guildId, userId)) openAccount(guildId, userId);

    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please mention a valid user.`)] });
    if (target.id === userId) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You can't transfer money to yourself.`)] });
    if (target.user.bot) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You can't transfer money to a bot.`)] });

    const wallet = getWallet(guildId, userId);
    const amount = parseAmount(args[1], wallet);

    if (!args[1] || isNaN(amount) || amount <= 0) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please provide a **valid** amount.`)] });
    if (amount > wallet) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You don't have enough. Wallet: **${fmt(wallet)}**`)] });

    if (!hasAccount(guildId, target.id)) openAccount(guildId, target.id);

    setWallet(guildId, userId, wallet - amount);
    setWallet(guildId, target.id, getWallet(guildId, target.id) + amount);

    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Transferred **${fmt(amount)}** to **${target.user.username}**.`)] });
  }
};
