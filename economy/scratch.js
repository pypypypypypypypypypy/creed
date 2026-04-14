const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve, deny } = require('../emojis.json');
const { fmt, getWallet, setWallet, isEnabled, hasAccount, openAccount, parseAmount } = require('./utils');

const SYMBOLS = ['💎', '⭐', '🍀', '💰', '🎯', '🔔', '🍒', '❌'];
const WEIGHTS =  [ 1,    3,    5,   8,    10,   12,   15,   46];

function weightedRandom() {
  const total = WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < SYMBOLS.length; i++) {
    r -= WEIGHTS[i];
    if (r <= 0) return SYMBOLS[i];
  }
  return SYMBOLS[SYMBOLS.length - 1];
}

function getMult(s) {
  const m = { '💎': 15, '⭐': 8, '🍀': 5, '💰': 3, '🎯': 2, '🔔': 1.5, '🍒': 1.2, '❌': 0 };
  return m[s] || 0;
}

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'scratch',
        description: 'Scratch a lottery card to win coins',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'scratch',
        example: 'scratch'
    }
],

    name: 'scratch',

  run: async (client, message, args) => {
    if (!isEnabled(message.guild.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: The economy system is **disabled** in this server.`)] });

    const guildId = message.guild.id;
    const userId = message.author.id;
    if (!hasAccount(guildId, userId)) openAccount(guildId, userId);

    const wallet = getWallet(guildId, userId);
    const amount = parseAmount(args[0], wallet);

    if (!args[0]) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please provide an amount to bet.`)] });
    if (isNaN(amount) || amount <= 0) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please provide a **valid** amount.`)] });
    if (amount > wallet) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You don't have enough. Wallet: **${fmt(wallet)}**`)] });

    const grid = Array.from({ length: 9 }, () => weightedRandom());
    const counts = {};
    for (const s of grid) counts[s] = (counts[s] || 0) + 1;

    let bestMult = 0;
    for (const [sym, cnt] of Object.entries(counts)) {
      if (cnt >= 3) {
        const m = getMult(sym) * (cnt >= 6 ? 2 : 1);
        if (m > bestMult) bestMult = m;
      }
    }

    const display = `${grid.slice(0, 3).join(' ')}  |  ${grid.slice(3, 6).join(' ')}  |  ${grid.slice(6).join(' ')}`;

    if (bestMult > 0) {
      const winnings = Math.floor(amount * bestMult);
      setWallet(guildId, userId, wallet - amount + winnings);
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#2ecc71').setTitle('🎟️ Scratch Card').setDescription(`${display}\n\n${approve} ${message.author}: **${bestMult}x multiplier!** You won **${fmt(winnings)}**!`)] });
    } else {
      setWallet(guildId, userId, wallet - amount);
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#e74c3c').setTitle('🎟️ Scratch Card').setDescription(`${display}\n\n${deny} ${message.author}: No match. You lost **${fmt(amount)}**.`)] });
    }
  }
};
