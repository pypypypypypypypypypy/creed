const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve, deny } = require('../emojis.json');
const { fmt, getWallet, setWallet, isEnabled, hasAccount, openAccount, parseAmount } = require('./utils');

const RUNGS = [1.2, 1.5, 2.0, 3.0, 5.0, 8.0, 15.0];
const FAIL_CHANCE = [0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6];

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'ladder',
        description: 'Climb the coin ladder game',
        aliases: 'n/a',
        parameters: '(amount)',
        information: 'n/a',
        usage: 'ladder (amount)',
        example: 'ladder amount'
    }
],

    name: 'ladder',

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

    let step = 0;

    const buildEmbed = () => {
      const rungDisplay = RUNGS.map((m, i) => {
        if (i < step) return `~~${m}x~~`;
        if (i === step) return `**→ ${m}x** ← current`;
        return `${m}x`;
      }).join('\n');
      return new EmbedBuilder()
        .setColor(color)
        .setTitle('🪜 Ladder')
        .setDescription(`**Rungs:**\n${rungDisplay}\n\nPress **Climb** to go up (${Math.round(FAIL_CHANCE[step] * 100)}% fail chance), or **Cash Out** to take your winnings.`)
        .setFooter({ text: `Bet: ${fmt(amount)} | Current: ${fmt(Math.floor(amount * RUNGS[step]))}` });
    };

    const buildRow = () => new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ladder_climb').setLabel('Climb 🪜').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('ladder_cash').setLabel('Cash Out 💰').setStyle(ButtonStyle.Success),
    );

    const msg = await message.channel.send({ embeds: [buildEmbed()], components: [buildRow()] });

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, filter: i => i.user.id === message.author.id, time: 60_000 });

    collector.on('collect', async interaction => {
      await interaction.deferUpdate();

      if (interaction.customId === 'ladder_cash') {
        const winnings = Math.floor(amount * RUNGS[step]);
        setWallet(guildId, userId, wallet - amount + winnings);
        await msg.edit({ embeds: [new EmbedBuilder().setColor(color).setTitle('🪜 Ladder').setDescription(`${approve} ${message.author}: Cashed out at **${RUNGS[step]}x** — won **${fmt(winnings)}**!`)], components: [] });
        collector.stop();
        return;
      }

      if (interaction.customId === 'ladder_climb') {
        if (Math.random() < FAIL_CHANCE[step]) {
          setWallet(guildId, userId, wallet - amount);
          await msg.edit({ embeds: [new EmbedBuilder().setColor('#e74c3c').setTitle('🪜 Ladder').setDescription(`${deny} ${message.author}: You fell off the ladder at **${RUNGS[step]}x**! You lost **${fmt(amount)}**.`)], components: [] });
          collector.stop();
          return;
        }
        step++;
        if (step >= RUNGS.length) {
          const winnings = Math.floor(amount * RUNGS[RUNGS.length - 1]);
          setWallet(guildId, userId, wallet - amount + winnings);
          await msg.edit({ embeds: [new EmbedBuilder().setColor('#2ecc71').setTitle('🪜 Ladder').setDescription(`${approve} ${message.author}: You reached the **top** of the ladder! You won **${fmt(winnings)}**!`)], components: [] });
          collector.stop();
          return;
        }
        await msg.edit({ embeds: [buildEmbed()], components: [buildRow()] });
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') msg.edit({ components: [] }).catch(() => {});
    });
  }
};
