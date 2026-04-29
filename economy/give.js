const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, deny, approve } = require('../emojis.json');
const {
  fmt, getWallet, setWallet, isEnabled, hasAccount, openAccount, parseAmount,
} = require('./utils');

module.exports = {
  category: 'economy',
  help: [
    {
      name: 'give',
      description: 'Give coins from your wallet to another user',
      aliases: 'pay',
      parameters: '(user) (amount)',
      information: 'Supports abbreviations (5k, 10m, 1b) and commas (50,000). You cannot give to yourself or to bots, and you must have enough in your wallet.',
      usage: 'give (user) (amount)',
      example: 'give @user 5k',
    },
  ],

  name: 'give',
  aliases: ['pay'],

  run: async (client, message, args) => {
    if (!isEnabled(message.guild.id)) {
      return message.channel.send({ embeds: [
        new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: The economy system is **disabled** in this server.`),
      ] });
    }

    const guildId = message.guild.id;

    const target =
      message.mentions.members.first() ||
      (args[0] && message.guild.members.cache.get(args[0].replace(/[<@!>]/g, '')));

    if (!target) {
      return message.channel.send({ embeds: [
        new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please mention a valid user. \`,give @user 5k\``),
      ] });
    }

    if (target.id === message.author.id) {
      return message.channel.send({ embeds: [
        new EmbedBuilder().setColor(color).setDescription(`${deny} ${message.author}: You **cannot** give to **yourself**.`),
      ] });
    }

    if (target.user.bot) {
      return message.channel.send({ embeds: [
        new EmbedBuilder().setColor(color).setDescription(`${deny} ${message.author}: You **cannot** give to a **bot**.`),
      ] });
    }

    if (!hasAccount(guildId, message.author.id)) openAccount(guildId, message.author.id);
    const senderWallet = getWallet(guildId, message.author.id);

    const amount = parseAmount(args[1], senderWallet);
    if (!isFinite(amount) || isNaN(amount) || amount <= 0) {
      return message.channel.send({ embeds: [
        new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please provide a **valid** amount. Examples: \`500\`, \`5k\`, \`1.5m\`, \`50,000\`, \`all\`, \`half\`.`),
      ] });
    }

    if (amount > senderWallet) {
      return message.channel.send({ embeds: [
        new EmbedBuilder().setColor(color).setDescription(
          `${deny} ${message.author}: You don't have enough in your wallet to give **${fmt(amount)}**. Your wallet has **${fmt(senderWallet)}**.`
        ),
      ] });
    }

    if (!hasAccount(guildId, target.id)) openAccount(guildId, target.id);

    setWallet(guildId, message.author.id, senderWallet - amount);
    setWallet(guildId, target.id, getWallet(guildId, target.id) + amount);

    return message.channel.send({ embeds: [
      new EmbedBuilder().setColor(color).setDescription(
        `${approve} ${message.author}: Gave **${fmt(amount)}** to **${target.user.username}**.`
      ),
    ] });
  },
};
