const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve, deny } = require('../emojis.json');
const { fmt, getWallet, setWallet, isEnabled, hasAccount, openAccount, parseAmount } = require('./utils');

const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function makeCard() {
  const rank = RANKS[Math.floor(Math.random() * 13)];
  const suit = SUITS[Math.floor(Math.random() * 4)];
  return { rank, suit, display: `${rank}${suit}` };
}

function cardValue(card) {
  if (['J', 'Q', 'K'].includes(card.rank)) return 10;
  if (card.rank === 'A') return 11;
  return parseInt(card.rank);
}

function handValue(hand) {
  let total = hand.reduce((s, c) => s + cardValue(c), 0);
  let aces = hand.filter(c => c.rank === 'A').length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function displayHand(hand) {
  return hand.map(c => c.display).join(' ');
}

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'blackjack',
        description: 'Play a game of blackjack for coins',
        aliases: 'bj',
        parameters: '(amount)',
        information: 'n/a',
        usage: 'blackjack (amount)',
        example: 'blackjack amount'
    }
],

    name: 'blackjack',
  aliases: ['bj'],

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

    const playerHand = [makeCard(), makeCard()];
    const dealerHand = [makeCard(), makeCard()];

    async function buildEmbed(playerH, dealerH, hideDealer = true) {
      const pv = handValue(playerH);
      const dv = hideDealer ? cardValue(dealerH[0]) : handValue(dealerH);
      return new EmbedBuilder()
        .setColor(color)
        .setTitle('🃏 Blackjack')
        .addFields(
          { name: `Your Hand (${pv})`, value: displayHand(playerH), inline: true },
          { name: `Dealer Hand (${hideDealer ? '?' : dv})`, value: hideDealer ? `${dealerH[0].display} 🂠` : displayHand(dealerH), inline: true }
        )
        .setFooter({ text: `Bet: ${fmt(amount)}` });
    }

    const playerVal = handValue(playerHand);
    if (playerVal === 21) {
      const winnings = Math.floor(amount * 1.5);
      setWallet(guildId, userId, wallet + winnings);
      return message.channel.send({ embeds: [(await buildEmbed(playerHand, dealerHand, false)).setColor('#2ecc71').setDescription(`${approve} ${message.author}: **Blackjack!** You win **${fmt(winnings)}**!`)] });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('bj_hit').setLabel('Hit 🃏').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('bj_stand').setLabel('Stand ✋').setStyle(ButtonStyle.Secondary),
    );

    const msg = await message.channel.send({ embeds: [await buildEmbed(playerHand, dealerHand)], components: [row] });

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, filter: i => i.user.id === message.author.id, time: 60_000 });

    collector.on('collect', async interaction => {
      await interaction.deferUpdate();

      if (interaction.customId === 'bj_hit') {
        playerHand.push(makeCard());
        const pv = handValue(playerHand);
        if (pv > 21) {
          setWallet(guildId, userId, wallet - amount);
          await msg.edit({ embeds: [(await buildEmbed(playerHand, dealerHand, false)).setColor('#e74c3c').setDescription(`${deny} ${message.author}: **Bust!** You went over 21 and lost **${fmt(amount)}**.`)], components: [] });
          collector.stop();
        } else if (pv === 21) {
          interaction.customId = 'bj_stand';
        } else {
          await msg.edit({ embeds: [await buildEmbed(playerHand, dealerHand)], components: [row] });
          return;
        }
      }

      if (interaction.customId === 'bj_stand') {
        while (handValue(dealerHand) < 17) dealerHand.push(makeCard());
        const pv = handValue(playerHand);
        const dv = handValue(dealerHand);
        let desc, col;
        if (dv > 21 || pv > dv) {
          setWallet(guildId, userId, wallet + amount);
          desc = `${approve} ${message.author}: You win! Your **${pv}** beat dealer's **${dv}** — you won **${fmt(amount)}**!`;
          col = '#2ecc71';
        } else if (pv === dv) {
          desc = `${warn} ${message.author}: **Push!** You tied with **${pv}**. Bet returned.`;
          col = color;
        } else {
          setWallet(guildId, userId, wallet - amount);
          desc = `${deny} ${message.author}: Dealer wins! Dealer's **${dv}** beat your **${pv}** — you lost **${fmt(amount)}**.`;
          col = '#e74c3c';
        }
        await msg.edit({ embeds: [(await buildEmbed(playerHand, dealerHand, false)).setColor(col).setDescription(desc)], components: [] });
        collector.stop();
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') msg.edit({ components: [] }).catch(() => {});
    });
  }
};
