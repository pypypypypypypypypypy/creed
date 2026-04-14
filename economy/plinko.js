const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve, deny } = require('../emojis.json');
const { fmt, getWallet, setWallet, isEnabled, hasAccount, openAccount, parseAmount } = require('./utils');

const BUCKETS = [0.2, 0.5, 1.0, 1.5, 3.0, 1.5, 1.0, 0.5, 0.2];

function dropChip() {
  let pos = 4;
  for (let i = 0; i < 8; i++) {
    pos += Math.random() < 0.5 ? -1 : 1;
    pos = Math.max(0, Math.min(8, pos));
  }
  return pos;
}

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'plinko',
        description: 'Play plinko and win coins',
        aliases: 'n/a',
        parameters: '(amount)',
        information: 'n/a',
        usage: 'plinko (amount)',
        example: 'plinko amount'
    }
],

    name: 'plinko',

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

    const slot = dropChip();
    const mult = BUCKETS[slot];
    const result = Math.floor(amount * mult);
    const net = result - amount;

    setWallet(guildId, userId, wallet - amount + result);

    const bucketDisplay = BUCKETS.map((m, i) => i === slot ? `[${m}x]` : `${m}x`).join(' ');
    const won = net >= 0;
    const embed = new EmbedBuilder()
      .setColor(won ? '#2ecc71' : '#e74c3c')
      .setTitle('🎳 Plinko')
      .setDescription(
        `\`${bucketDisplay}\`\n\n` +
        `**Multiplier:** ${mult}x\n**Result:** ${fmt(result)}\n**Net:** ${net >= 0 ? '+' : ''}${fmt(net)}\n\n` +
        (won ? `${approve} ${message.author}: Great drop!` : `${deny} ${message.author}: Bad luck this time.`)
      )
      .setFooter({ text: `Bet: ${fmt(amount)}` });

    message.channel.send({ embeds: [embed] });
  }
};
