const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { fmt, isEnabled, getScope } = require('./utils');

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'destroy',
        description: "Destroy another user's coins",
        aliases: 'n/a',
        parameters: '(user)',
        information: 'n/a',
        usage: 'destroy (user)',
        example: 'destroy user'
    }
],

    name: 'destroy',

  run: async (client, message, args) => {
    if (!isEnabled(message.guild.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: The economy system is **disabled** in this server.`)] });
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You need **Administrator** permission.`)] });

    const guildId = message.guild.id;
    const amount = parseInt(args[0]);
    if (isNaN(amount) || amount <= 0) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please provide a **valid** amount to destroy.`)] });

    const scope = getScope(guildId);
    const data = db.get(`economy.${scope}`) || {};
    const wallets = data.wallet || {};

    let destroyed = 0;
    let remaining = amount;
    for (const userId of Object.keys(wallets)) {
      if (remaining <= 0) break;
      const w = wallets[userId] || 0;
      const take = Math.min(remaining, w);
      wallets[userId] = w - take;
      destroyed += take;
      remaining -= take;
    }

    if (data.wallet) data.wallet = wallets;
    db.set(`economy.${scope}`, data);

    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Destroyed **${fmt(destroyed)}** from circulation.`)] });
  }
};
