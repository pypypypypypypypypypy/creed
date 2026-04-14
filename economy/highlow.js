const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve, deny } = require('../emojis.json');
const { fmt, getWallet, setWallet, isEnabled, hasAccount, openAccount, parseAmount } = require('./utils');

const SUITS = ['♠️', '♥️', '♦️', '♣️'];

function randomCard() {
  const val = Math.floor(Math.random() * 13) + 1;
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  const label = val === 1 ? 'A' : val === 11 ? 'J' : val === 12 ? 'Q' : val === 13 ? 'K' : `${val}`;
  return { value: val, display: `${label}${suit}` };
}

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'highlow',
        description: 'Guess if the next number is higher or lower',
        aliases: 'hl',
        parameters: '(amount)',
        information: 'n/a',
        usage: 'highlow (amount)',
        example: 'highlow amount'
    }
],

    name: 'highlow',
  aliases: ['hl'],

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

    const current = randomCard();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('hl_higher').setLabel('Higher ⬆️').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('hl_lower').setLabel('Lower ⬇️').setStyle(ButtonStyle.Danger),
    );

    const msg = await message.channel.send({
      embeds: [new EmbedBuilder().setColor(color).setTitle('🃏 High or Low').setDescription(`Current card: **${current.display}**\n\nWill the next card be **higher** or **lower**?`)],
      components: [row],
    });

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, filter: i => i.user.id === message.author.id, time: 30_000 });

    collector.on('collect', async interaction => {
      await interaction.deferUpdate();
      const guess = interaction.customId === 'hl_higher' ? 'higher' : 'lower';
      const next = randomCard();
      const actuallyHigher = next.value > current.value;
      const correct = (guess === 'higher' && actuallyHigher) || (guess === 'lower' && !actuallyHigher);

      if (correct) {
        setWallet(guildId, userId, getWallet(guildId, userId) + amount);
        await msg.edit({ embeds: [new EmbedBuilder().setColor('#2ecc71').setTitle('🃏 High or Low').setDescription(`Current: **${current.display}** → Next: **${next.display}**\n\n${approve} ${message.author}: Correct! You won **${fmt(amount)}**!`)], components: [] });
      } else {
        setWallet(guildId, userId, Math.max(0, getWallet(guildId, userId) - amount));
        await msg.edit({ embeds: [new EmbedBuilder().setColor('#e74c3c').setTitle('🃏 High or Low').setDescription(`Current: **${current.display}** → Next: **${next.display}**\n\n${deny} ${message.author}: Wrong! You lost **${fmt(amount)}**.`)], components: [] });
      }
      collector.stop();
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') msg.edit({ components: [] }).catch(() => {});
    });
  }
};
