const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve, deny, cooldown } = require('../emojis.json');
const { fmt, getWallet, setWallet, isEnabled, hasAccount, openAccount, cooldownLeft, formatMs } = require('./utils');

const COOLDOWN = 3 * 60 * 60 * 1000;
const SUCCESS_CHANCE = 0.45;
const MIN_WALLET = 100;

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'rob',
        description: "Attempt to rob another user's coins",
        aliases: 'n/a',
        parameters: '(user)',
        information: 'n/a',
        usage: 'rob (user)',
        example: 'rob user'
    }
],

    name: 'rob',

  run: async (client, message, args) => {
    if (!isEnabled(message.guild.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: The economy system is **disabled** in this server.`)] });

    const guildId = message.guild.id;
    const userId = message.author.id;
    if (!hasAccount(guildId, userId)) openAccount(guildId, userId);

    const cdKey = `economy.${guildId}.rob.${userId}`;
    const left = cooldownLeft(cdKey, COOLDOWN);
    if (left > 0) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${cooldown} ${message.author}: You can rob again in **${formatMs(left)}**.`)] });

    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please mention a valid user to rob.`)] });
    if (target.id === message.author.id) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You can't rob yourself.`)] });
    if (target.user.bot) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You can't rob a bot.`)] });

    if (!hasAccount(guildId, target.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: That user doesn't have an economy account.`)] });

    const targetWallet = getWallet(guildId, target.id);
    if (targetWallet < MIN_WALLET) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: **${target.user.username}** doesn't have enough to rob (minimum **${fmt(MIN_WALLET)}** in wallet).`)] });

    db.set(cdKey, Date.now());

    if (Math.random() < SUCCESS_CHANCE) {
      const stolen = Math.floor(targetWallet * (Math.random() * 0.3 + 0.1));
      setWallet(guildId, target.id, targetWallet - stolen);
      setWallet(guildId, userId, getWallet(guildId, userId) + stolen);
      message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: You robbed **${target.user.username}** and stole **${fmt(stolen)}**!`)] });
    } else {
      const fine = Math.floor(targetWallet * 0.1);
      setWallet(guildId, userId, Math.max(0, getWallet(guildId, userId) - fine));
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#e74c3c').setDescription(`${deny} ${message.author}: You got caught trying to rob **${target.user.username}**! You paid a fine of **${fmt(fine)}**.`)] });
    }
  }
};
