const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve, deny, cooldown } = require('../emojis.json');
const { fmt, getWallet, setWallet, isEnabled, hasAccount, openAccount, cooldownLeft, formatMs } = require('./utils');

const COOLDOWN = 2 * 60 * 60 * 1000;
const SUCCESS_CHANCE = 0.6;

const CRIMES = [
  { name: 'robbed a store', min: 100, max: 500 },
  { name: 'pickpocketed someone', min: 50, max: 200 },
  { name: 'hacked a bank', min: 200, max: 800 },
  { name: 'sold knockoffs', min: 80, max: 300 },
  { name: 'scammed a tourist', min: 60, max: 250 },
];

const FAILS = [
  'You slipped and dropped everything.',
  'A witness called the cops.',
  'The mark fought back.',
  'You got caught red-handed.',
  'Your escape route was blocked.',
];

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'crime',
        description: 'Commit a crime to earn or lose coins',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'crime',
        example: 'crime'
    }
],

    name: 'crime',

  run: async (client, message, args) => {
    if (!isEnabled(message.guild.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: The economy system is **disabled** in this server.`)] });

    const guildId = message.guild.id;
    const userId = message.author.id;
    if (!hasAccount(guildId, userId)) openAccount(guildId, userId);

    const cdKey = `economy.${guildId}.crime.${userId}`;
    const left = cooldownLeft(cdKey, COOLDOWN);
    if (left > 0) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${cooldown} ${message.author}: You can commit another crime in **${formatMs(left)}**.`)] });

    db.set(cdKey, Date.now());
    const crime = CRIMES[Math.floor(Math.random() * CRIMES.length)];
    const wallet = getWallet(guildId, userId);

    if (Math.random() < SUCCESS_CHANCE) {
      const earned = Math.floor(Math.random() * (crime.max - crime.min + 1)) + crime.min;
      setWallet(guildId, userId, wallet + earned);
      message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: You **${crime.name}** and got away with **${fmt(earned)}**!`)] });
    } else {
      const fine = Math.floor(Math.random() * 150) + 50;
      setWallet(guildId, userId, Math.max(0, wallet - fine));
      const failMsg = FAILS[Math.floor(Math.random() * FAILS.length)];
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#e74c3c').setDescription(`${deny} ${message.author}: You tried to **${crime.name}** but failed! ${failMsg} Fine: **${fmt(fine)}**.`)] });
    }
  }
};
