const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve, cooldown } = require('../emojis.json');
const { fmt, getWallet, setWallet, isEnabled, hasAccount, openAccount, cooldownLeft, formatMs } = require('./utils');

const COOLDOWN = 60 * 60 * 1000;

const DEFAULT_JOBS = [
  { name: 'programmer', min: 100, max: 300, messages: ['You fixed a nasty bug and got paid!', 'You shipped a feature. Ka-ching!'] },
  { name: 'chef', min: 80, max: 200, messages: ['You cooked an amazing meal!', 'Your cooking got great reviews.'] },
  { name: 'artist', min: 50, max: 250, messages: ['You sold a painting!', 'Your artwork was commissioned.'] },
  { name: 'driver', min: 60, max: 150, messages: ['You completed 10 trips!', 'A customer gave you a tip.'] },
  { name: 'teacher', min: 70, max: 180, messages: ['You tutored a student.', 'You graded papers and got paid.'] },
];

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'work',
        description: 'Work your job to earn coins',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'work',
        example: 'work'
    }
],

    name: 'work',

  run: async (client, message, args) => {
    if (!isEnabled(message.guild.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: The economy system is **disabled** in this server.`)] });

    const guildId = message.guild.id;
    const userId = message.author.id;
    if (!hasAccount(guildId, userId)) openAccount(guildId, userId);

    const cdKey = `economy.${guildId}.work.${userId}`;
    const left = cooldownLeft(cdKey, COOLDOWN);
    if (left > 0) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${cooldown} ${message.author}: You can work again in **${formatMs(left)}**.`)] });

    const customJobs = db.get(`economy.${guildId}.jobs`) || [];
    const allJobs = [...DEFAULT_JOBS, ...customJobs.map(j => ({ name: j.name, min: j.min, max: j.max, messages: [j.description || `You worked as a ${j.name}.`] }))];

    const jobArg = (args[0] || '').toLowerCase();
    let job = jobArg ? allJobs.find(j => j.name.toLowerCase() === jobArg) : allJobs[Math.floor(Math.random() * allJobs.length)];

    if (jobArg && !job) {
      const list = allJobs.map(j => `\`${j.name}\``).join(', ');
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Unknown job. Available: ${list}`)] });
    }

    db.set(cdKey, Date.now());
    const earned = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;
    setWallet(guildId, userId, getWallet(guildId, userId) + earned);
    const msg = job.messages[Math.floor(Math.random() * job.messages.length)];

    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: **${job.name.charAt(0).toUpperCase() + job.name.slice(1)}** — ${msg} You earned **${fmt(earned)}**! (1 hour cooldown)`)] });
  }
};
