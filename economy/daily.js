const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve, cooldown } = require('../emojis.json');
const { fmt, getWallet, setWallet, isEnabled, openAccount, hasAccount, cooldownLeft, formatMs } = require('./utils');

const COOLDOWN = 24 * 60 * 60 * 1000;
const DAILY_AMOUNT = 200;

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'daily',
        description: 'Claim your daily coin reward',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'daily',
        example: 'daily'
    }
],

    name: 'daily',

  run: async (client, message, args) => {
    if (!isEnabled(message.guild.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: The economy system is **disabled** in this server.`)] });

    const userId = message.author.id;
    const guildId = message.guild.id;

    if (!hasAccount(guildId, userId)) openAccount(guildId, userId);

    const cdKey = `economy.${guildId}.daily.${userId}`;
    const left = cooldownLeft(cdKey, COOLDOWN);

    if (left > 0) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${cooldown} ${message.author}: Your daily reward resets in **${formatMs(left)}**.`)] });
    }

    db.set(cdKey, Date.now());
    const wallet = getWallet(guildId, userId);
    setWallet(guildId, userId, wallet + DAILY_AMOUNT);

    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: You claimed your daily reward of **${fmt(DAILY_AMOUNT)}**! Come back in **24 hours**.`)] });
  }
};
