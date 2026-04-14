const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve, deny } = require('../emojis.json');
const { fmt, getWallet, setWallet, isEnabled, hasAccount, openAccount, parseAmount } = require('./utils');

const RED = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const BLACK = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];

function spin() { return Math.floor(Math.random() * 37); }
function getColor(n) { if (n === 0) return 'green'; return RED.includes(n) ? 'red' : 'black'; }

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'roulette',
        description: 'Spin the roulette wheel and bet coins',
        aliases: 'n/a',
        parameters: '(amount)',
        information: 'n/a',
        usage: 'roulette (amount)',
        example: 'roulette amount'
    }
],

    name: 'roulette',

  run: async (client, message, args) => {
    if (!isEnabled(message.guild.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: The economy system is **disabled** in this server.`)] });

    const guildId = message.guild.id;
    const userId = message.author.id;
    if (!hasAccount(guildId, userId)) openAccount(guildId, userId);

    const betType = (args[0] || '').toLowerCase();
    const wallet = getWallet(guildId, userId);
    const amount = parseAmount(args[1], wallet);

    const valid = ['red', 'black', 'green', 'odd', 'even'];
    if (!betType || !valid.includes(betType)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Valid bet types: \`red\`, \`black\`, \`green\`, \`odd\`, \`even\`.`)] });
    if (!args[1] || isNaN(amount) || amount <= 0) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please provide a **valid** amount.`)] });
    if (amount > wallet) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You don't have enough. Wallet: **${fmt(wallet)}**`)] });

    const number = spin();
    const col = getColor(number);
    const colorEmoji = col === 'red' ? '🔴' : col === 'black' ? '⚫' : '🟢';
    let won = false, mult = 0;

    if (betType === 'red' && col === 'red') { won = true; mult = 2; }
    else if (betType === 'black' && col === 'black') { won = true; mult = 2; }
    else if (betType === 'green' && col === 'green') { won = true; mult = 14; }
    else if (betType === 'odd' && number !== 0 && number % 2 === 1) { won = true; mult = 2; }
    else if (betType === 'even' && number !== 0 && number % 2 === 0) { won = true; mult = 2; }

    if (won) {
      const winnings = Math.floor(amount * mult);
      setWallet(guildId, userId, wallet - amount + winnings);
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#2ecc71').setTitle('🎡 Roulette').setDescription(`The ball landed on **${colorEmoji} ${number}**!\n\n${approve} ${message.author}: You bet on **${betType}** and won **${fmt(winnings)}**! (${mult}x)`)] });
    } else {
      setWallet(guildId, userId, wallet - amount);
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#e74c3c').setTitle('🎡 Roulette').setDescription(`The ball landed on **${colorEmoji} ${number}**!\n\n${deny} ${message.author}: You bet on **${betType}** and lost **${fmt(amount)}**.`)] });
    }
  }
};
