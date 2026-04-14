const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve, deny } = require('../emojis.json');
const { fmt, getWallet, setWallet, isEnabled, hasAccount, openAccount, parseAmount } = require('./utils');

const OUTCOMES = [
  { label: 'Lost it all', mult: 0, chance: 20 },
  { label: '0.5x loss', mult: 0.5, chance: 25 },
  { label: 'Break even', mult: 1, chance: 10 },
  { label: '1.5x win', mult: 1.5, chance: 25 },
  { label: '2x win', mult: 2, chance: 15 },
  { label: '3x win', mult: 3, chance: 4 },
  { label: '5x win', mult: 5, chance: 1 },
];

function pickOutcome() {
  const roll = Math.random() * 100;
  let cum = 0;
  for (const o of OUTCOMES) {
    cum += o.chance;
    if (roll < cum) return o;
  }
  return OUTCOMES[0];
}

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'gamble',
        description: 'Gamble coins for a chance to multiply them',
        aliases: 'n/a',
        parameters: '(amount)',
        information: 'n/a',
        usage: 'gamble (amount)',
        example: 'gamble amount'
    }
],

    name: 'gamble',

  run: async (client, message, args) => {
    if (!isEnabled(message.guild.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: The economy system is **disabled** in this server.`)] });

    const guildId = message.guild.id;
    const userId = message.author.id;
    if (!hasAccount(guildId, userId)) openAccount(guildId, userId);

    const wallet = getWallet(guildId, userId);
    const amount = parseAmount(args[0], wallet);

    if (!args[0]) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please provide an amount to gamble.`)] });
    if (isNaN(amount) || amount <= 0) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please provide a **valid** amount.`)] });
    if (amount > wallet) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You don't have enough. Wallet: **${fmt(wallet)}**`)] });

    const outcome = pickOutcome();
    const result = Math.floor(amount * outcome.mult);
    const net = result - amount;

    setWallet(guildId, userId, wallet - amount + result);

    const won = net >= 0;
    const embed = new EmbedBuilder()
      .setColor(won ? '#2ecc71' : '#e74c3c')
      .setTitle('🎲 Gamble')
      .setDescription(
        `**Outcome:** ${outcome.label}\n` +
        `**Bet:** ${fmt(amount)}\n` +
        `**Result:** ${fmt(result)}\n` +
        `**Net:** ${net >= 0 ? '+' : ''}${fmt(net)}\n\n` +
        (won ? `${approve} ${message.author}: You came out **ahead**!` : `${deny} ${message.author}: Better luck next time.`)
      );

    message.channel.send({ embeds: [embed] });
  }
};
