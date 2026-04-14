const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve, deny } = require('../emojis.json');
const { fmt, getWallet, setWallet, isEnabled, hasAccount, openAccount, parseAmount } = require('./utils');

const SIZE = 5;
const BOMBS = 5;

function generateBoard() {
  const cells = Array(SIZE * SIZE).fill(false);
  let placed = 0;
  while (placed < BOMBS) {
    const idx = Math.floor(Math.random() * cells.length);
    if (!cells[idx]) { cells[idx] = true; placed++; }
  }
  return cells;
}

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'bombs',
        description: 'Play a bomb game to win or lose coins',
        aliases: 'n/a',
        parameters: '(amount)',
        information: 'n/a',
        usage: 'bombs (amount)',
        example: 'bombs amount'
    }
],

    name: 'bombs',

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

    const board = generateBoard();
    const revealed = Array(SIZE * SIZE).fill(false);
    let safeRevealed = 0;
    let alive = true;

    const SAFE_TOTAL = SIZE * SIZE - BOMBS;
    const multPerSafe = (5 / SAFE_TOTAL);

    function getCurrentMult() { return parseFloat((1 + safeRevealed * multPerSafe).toFixed(2)); }

    function buildComponents(disabled = false) {
      const rows = [];
      for (let r = 0; r < SIZE; r++) {
        const row = new ActionRowBuilder();
        for (let c = 0; c < SIZE; c++) {
          const idx = r * SIZE + c;
          let label = '?', style = ButtonStyle.Secondary, dis = disabled;
          if (revealed[idx]) {
            label = board[idx] ? '💣' : '✅';
            style = board[idx] ? ButtonStyle.Danger : ButtonStyle.Success;
            dis = true;
          }
          row.addComponents(new ButtonBuilder().setCustomId(`bomb_${idx}`).setLabel(label).setStyle(style).setDisabled(dis));
        }
        rows.push(row);
      }
      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('bomb_cashout').setLabel(`Cash Out (${getCurrentMult()}x)`).setStyle(ButtonStyle.Primary).setDisabled(disabled || safeRevealed === 0)
      );
      rows.push(actionRow);
      return rows;
    }

    function buildEmbed(ended = false, hit = false) {
      return new EmbedBuilder()
        .setColor(hit ? '#e74c3c' : ended ? '#2ecc71' : color)
        .setTitle('💣 Minesweeper')
        .setDescription(hit ? `${deny} ${message.author}: **BOOM!** You hit a bomb and lost **${fmt(amount)}**!` : ended ? `${approve} ${message.author}: Cashed out at **${getCurrentMult()}x** — won **${fmt(Math.floor(amount * getCurrentMult()))}**!` : `Avoid the bombs! Safe tiles found: **${safeRevealed}/${SAFE_TOTAL}**\nCurrent multiplier: **${getCurrentMult()}x** | Potential: **${fmt(Math.floor(amount * getCurrentMult()))}**`)
        .setFooter({ text: `Bet: ${fmt(amount)} | ${BOMBS} bombs hidden` });
    }

    const msg = await message.channel.send({ embeds: [buildEmbed()], components: buildComponents() });

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, filter: i => i.user.id === message.author.id, time: 120_000 });

    collector.on('collect', async interaction => {
      await interaction.deferUpdate();

      if (interaction.customId === 'bomb_cashout') {
        const winnings = Math.floor(amount * getCurrentMult());
        setWallet(guildId, userId, wallet - amount + winnings);
        await msg.edit({ embeds: [buildEmbed(true, false)], components: buildComponents(true) });
        collector.stop();
        return;
      }

      const idx = parseInt(interaction.customId.split('_')[1]);
      if (revealed[idx]) return;
      revealed[idx] = true;

      if (board[idx]) {
        alive = false;
        setWallet(guildId, userId, wallet - amount);
        await msg.edit({ embeds: [buildEmbed(false, true)], components: buildComponents(true) });
        collector.stop();
      } else {
        safeRevealed++;
        if (safeRevealed === SAFE_TOTAL) {
          const winnings = Math.floor(amount * getCurrentMult());
          setWallet(guildId, userId, wallet - amount + winnings);
          await msg.edit({ embeds: [buildEmbed(true, false)], components: buildComponents(true) });
          collector.stop();
        } else {
          await msg.edit({ embeds: [buildEmbed()], components: buildComponents() });
        }
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time' && alive) msg.edit({ components: buildComponents(true) }).catch(() => {});
    });
  }
};
