const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve, cooldown } = require('../emojis.json');
const { fmt, getWallet, setWallet, isEnabled, openAccount, hasAccount, cooldownLeft, formatMs } = require('./utils');

const COOLDOWN = 30 * 24 * 60 * 60 * 1000;
const AMOUNT = 5000;

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'monthly',
        description: 'Claim your monthly coin reward',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'monthly',
        example: 'monthly'
    }
],

    name: 'monthly',

  run: async (client, message, args) => {
    if (!isEnabled(message.guild.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: The economy system is **disabled** in this server.`)] });

    const userId = message.author.id;
    const guildId = message.guild.id;

    if (!hasAccount(guildId, userId)) openAccount(guildId, userId);

    const cdKey = `economy.${guildId}.monthly.${userId}`;
    const left = cooldownLeft(cdKey, COOLDOWN);

    if (left > 0) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${cooldown} ${message.author}: Your monthly reward resets in **${formatMs(left)}**.`)] });
    }

    db.set(cdKey, Date.now());
    setWallet(guildId, userId, getWallet(guildId, userId) + AMOUNT);

    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: You claimed your monthly reward of **${fmt(AMOUNT)}**! Come back in **30 days**.`)] });
  }
};
