const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve, deny } = require('../emojis.json');
const { fmt, getWallet, setWallet, isEnabled, hasAccount, openAccount, parseAmount } = require('./utils');

function freshEmojis() {
  delete require.cache[require.resolve('../emojis.json')];
  return require('../emojis.json');
}

function getSpinningEmoji() {
  return freshEmojis().slots || '<a:loading:1496728277690089503>';
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
    const spinning = getSpinningEmoji();

    // Reveal beats — long enough that each reel clearly drops on its own.
    const REVEAL_DELAY_MS = 1400;

    const spinMsg = await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(color)
          .setTitle('🎰 Slot Machine')
          .setDescription(`${buildSlotDisplay(spinning, spinning, spinning)}\n\n*Spinning...*`)
      ]
    });

    const [a, b, c] = spin(fruits);

    await wait(REVEAL_DELAY_MS);

    await spinMsg.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(color)
          .setTitle('🎰 Slot Machine')
          .setDescription(`${buildSlotDisplay(a.emoji, spinning, spinning)}\n\n*Spinning...*`)
      ]
    });

    await wait(REVEAL_DELAY_MS);

    await spinMsg.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(color)
          .setTitle('🎰 Slot Machine')
          .setDescription(`${buildSlotDisplay(a.emoji, b.emoji, spinning)}\n\n*Spinning...*`)
      ]
    });

    await wait(REVEAL_DELAY_MS);

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
