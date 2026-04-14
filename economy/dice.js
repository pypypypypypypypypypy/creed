const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve, deny } = require('../emojis.json');
const { fmt, getWallet, setWallet, isEnabled, hasAccount, openAccount, parseAmount } = require('./utils');

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'dice',
        description: 'Roll dice and bet coins on the outcome',
        aliases: 'n/a',
        parameters: '(amount)',
        information: 'n/a',
        usage: 'dice (amount)',
        example: 'dice amount'
    }
],

    name: 'dice',

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

    const playerRoll = Math.floor(Math.random() * 6);
    const botRoll = Math.floor(Math.random() * 6);
    const playerFace = DICE_FACES[playerRoll];
    const botFace = DICE_FACES[botRoll];
    const playerVal = playerRoll + 1;
    const botVal = botRoll + 1;

    let desc;
    if (playerVal > botVal) {
      setWallet(guildId, userId, wallet + amount);
      desc = `${approve} ${message.author}: You rolled **${playerFace} ${playerVal}** vs bot's **${botFace} ${botVal}**. You won **${fmt(amount)}**!`;
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#2ecc71').setDescription(desc)] });
    } else if (botVal > playerVal) {
      setWallet(guildId, userId, wallet - amount);
      desc = `${deny} ${message.author}: You rolled **${playerFace} ${playerVal}** vs bot's **${botFace} ${botVal}**. You lost **${fmt(amount)}**.`;
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#e74c3c').setDescription(desc)] });
    } else {
      desc = `${warn} ${message.author}: You rolled **${playerFace} ${playerVal}** vs bot's **${botFace} ${botVal}**. It's a **tie** — no money exchanged.`;
      message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(desc)] });
    }
  }
};
