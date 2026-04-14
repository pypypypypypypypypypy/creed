const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { fmt, getWallet, getBank, isEnabled, hasAccount, openAccount } = require('./utils');

module.exports = {
  name: 'balance',
  aliases: ['bal', 'money'],
  category: 'economy',
  help: [
    { name: 'balance', description: 'Check your economy balance or another user\'s', aliases: 'bal, money', parameters: '[user]', information: 'n/a', usage: 'balance [user]', example: 'balance @user' },
  ],

  run: async (client, message, args) => {
    if (!isEnabled(message.guild.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: The economy system is **disabled** in this server.`)] });

    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || message.member;
    const user = target.user;

    if (!hasAccount(message.guild.id, user.id)) openAccount(message.guild.id, user.id);

    const wallet = getWallet(message.guild.id, user.id);
    const bank = getBank(message.guild.id, user.id);
    const total = wallet + bank;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: `${user.username}'s Balance`, iconURL: user.displayAvatarURL({ forceStatic: false }) })
      .addFields(
        { name: '💵 Wallet', value: fmt(wallet), inline: true },
        { name: '🏦 Bank', value: fmt(bank), inline: true },
        { name: '💰 Total', value: fmt(total), inline: true }
      )
      .setFooter({ text: 'Economy' })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
