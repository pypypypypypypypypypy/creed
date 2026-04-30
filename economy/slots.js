const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve, deny } = require('../emojis.json');
const { fmt, getWallet, setWallet, isEnabled, hasAccount, openAccount, parseAmount } = require('./utils');

function freshEmojis() {
  delete require.cache[require.resolve('../emojis.json')];
  return require('../emojis.json');
}

// Slot symbols use the bot's custom emoji pack uploaded via ,uploademojis.
// Multipliers: cherry/lemon/orange = 3x, grape/watermelon/bell = 5x, seven = 10x.
function getFruits() {
  const e = freshEmojis();
  return [
    { emoji: e.slot_cherry     || '🍒', key: 'cherry',     mult: 3  },
    { emoji: e.slot_lemon      || '🍋', key: 'lemon',      mult: 3  },
    { emoji: e.slot_orange     || '🍊', key: 'orange',     mult: 3  },
    { emoji: e.slot_grape      || '🍇', key: 'grape',      mult: 5  },
    { emoji: e.slot_watermelon || '🍉', key: 'watermelon', mult: 5  },
    { emoji: e.slot_bell       || '🔔', key: 'bell',       mult: 5  },
    { emoji: e.slot_seven      || '7️⃣', key: 'seven',      mult: 10 },
  ];
}

function spin(fruits) {
  return [
    fruits[Math.floor(Math.random() * fruits.length)],
    fruits[Math.floor(Math.random() * fruits.length)],
    fruits[Math.floor(Math.random() * fruits.length)],
  ];
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildSlotDisplay(a, b, c) {
  return `${a}  ${b}  ${c}`;
}

module.exports = {
  category: 'economy',
  help: [
    {
      name: 'slots',
      description: 'Spin the slot machine',
      aliases: 'n/a',
      parameters: '(amount)',
      information: 'n/a',
      usage: 'slots (amount)',
      example: 'slots 500'
    }
  ],
  name: 'slots',

  run: async (client, message, args) => {
    if (!isEnabled(message.guild.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: The economy system is **disabled** in this server.`)] });

    const guildId = message.guild.id;
    const userId = message.author.id;
    if (!hasAccount(guildId, userId)) openAccount(guildId, userId);

    const wallet = getWallet(guildId, userId);

    if (!args[0]) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please provide an amount to bet.`)] });
    const amount = parseAmount(args[0], wallet);
    if (isNaN(amount) || amount <= 0) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please provide a **valid** amount.`)] });
    if (amount > wallet) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You don't have enough. Wallet: **${fmt(wallet)}**`)] });

    const fruits = getFruits();
    const e = freshEmojis();
    const spinEmoji = e.slots || e.loading || '🎰';

    // Each reel shows the animated spin emoji, then switches to its fruit.
    // Keep interval >= 700ms to stay within Discord edit rate limits.
    const REEL_SPIN_MS = 1000;

    // Pick the final result up front so it's a fair, single roll — the
    // animation just hides the answer until each reel "lands".
    const [a, b, c] = spin(fruits);

    const renderEmbed = (left, mid, right, footer = '*Spinning...*') =>
      new EmbedBuilder()
        .setColor(color)
        .setTitle('🎰 Slot Machine')
        .setDescription(`${buildSlotDisplay(left, mid, right)}\n\n${footer}`);

    // Initial frame — all three reels showing the animated spin emoji.
    const spinMsg = await message.channel.send({
      embeds: [renderEmbed(spinEmoji, spinEmoji, spinEmoji)],
    });

    const safeEdit = (embed) => spinMsg.edit({ embeds: [embed] }).catch(() => {});

    // Reel 1 lands.
    await wait(REEL_SPIN_MS);
    await safeEdit(renderEmbed(a.emoji, spinEmoji, spinEmoji));

    // Reel 2 lands.
    await wait(REEL_SPIN_MS);
    await safeEdit(renderEmbed(a.emoji, b.emoji, spinEmoji));

    // Reel 3 lands.
    await wait(REEL_SPIN_MS);

    const display = buildSlotDisplay(a.emoji, b.emoji, c.emoji);

    if (a.key === b.key && b.key === c.key) {
      const mult = a.mult;
      const winnings = Math.floor(amount * mult);
      setWallet(guildId, userId, wallet - amount + winnings);
      await spinMsg.edit({
        embeds: [
          new EmbedBuilder()
            .setColor('#2ecc71')
            .setTitle('🎰 Slot Machine')
            .setDescription(`${display}\n\n${approve} ${message.author}: **Jackpot!** **${mult}x** multiplier — you won **${fmt(winnings)}**!`)
        ]
      });
    } else if (a.key === b.key || b.key === c.key || a.key === c.key) {
      const winnings = Math.floor(amount * 1.5);
      setWallet(guildId, userId, wallet - amount + winnings);
      await spinMsg.edit({
        embeds: [
          new EmbedBuilder()
            .setColor('#f39c12')
            .setTitle('🎰 Slot Machine')
            .setDescription(`${display}\n\n${approve} ${message.author}: Two of a kind! You won **${fmt(winnings)}**!`)
        ]
      });
    } else {
      setWallet(guildId, userId, wallet - amount);
      await spinMsg.edit({
        embeds: [
          new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('🎰 Slot Machine')
            .setDescription(`${display}\n\n${deny} ${message.author}: No match. You lost **${fmt(amount)}**.`)
        ]
      });
    }
  }
};
