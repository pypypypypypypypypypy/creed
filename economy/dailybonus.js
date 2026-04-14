const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve, cooldown } = require('../emojis.json');
const { fmt, getWallet, setWallet, isEnabled, openAccount, hasAccount, cooldownLeft, formatMs } = require('./utils');

const COOLDOWN = 24 * 60 * 60 * 1000;
const AMOUNT = 200;

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'dailybonus',
        description: 'Claim a bonus daily reward',
        aliases: 'daily2',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'dailybonus',
        example: 'dailybonus'
    }
],

    name: 'dailybonus',
  aliases: ['daily2'],

  run: async (client, message, args) => {
    if (!isEnabled(message.guild.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: The economy system is **disabled** in this server.`)] });

    const userId = message.author.id;
    const guildId = message.guild.id;

    if (!hasAccount(guildId, userId)) openAccount(guildId, userId);

    const cdKey = `economy.${guildId}.dailybonus.${userId}`;
    const left = cooldownLeft(cdKey, COOLDOWN);

    if (left > 0) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${cooldown} ${message.author}: Your daily bonus resets in **${formatMs(left)}**.`)] });
    }

    db.set(cdKey, Date.now());
    setWallet(guildId, userId, getWallet(guildId, userId) + AMOUNT);

    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: You claimed your daily bonus of **${fmt(AMOUNT)}**! Come back in **24 hours**.`)] });
  }
};
