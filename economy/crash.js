const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve, deny } = require('../emojis.json');
const { fmt, getWallet, setWallet, isEnabled, hasAccount, openAccount, parseAmount } = require('./utils');

function generateCrashPoint() {
  const r = Math.random();
  if (r < 0.05) return 1.0;
  return Math.max(1.0, (1 / (1 - r * 0.99)).toFixed(2));
}

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'crash',
        description: 'Play the crash game — cash out before it crashes',
        aliases: 'n/a',
        parameters: '(amount)',
        information: 'n/a',
        usage: 'crash (amount)',
        example: 'crash amount'
    }
],

    name: 'crash',

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

    const crashPoint = parseFloat(generateCrashPoint());
    let current = 1.0;
    let cashedOut = false;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('crash_out').setLabel('Cash Out 💰').setStyle(ButtonStyle.Success),
    );

    const buildEmbed = (mult, crashed = false) => new EmbedBuilder()
      .setColor(crashed ? '#e74c3c' : '#2ecc71')
      .setTitle('📈 Crash')
      .setDescription(
        crashed
          ? `${deny} ${message.author}: The multiplier crashed at **${mult}x**! You lost **${fmt(amount)}**.`
          : `**Multiplier:** ${mult}x\n**Potential win:** ${fmt(Math.floor(amount * mult))}\n\nPress **Cash Out** before it crashes!`
      )
      .setFooter({ text: `Bet: ${fmt(amount)}` });

    const msg = await message.channel.send({ embeds: [buildEmbed(current)], components: [row] });

    const interval = setInterval(async () => {
      if (cashedOut) return clearInterval(interval);
      current = parseFloat((current + (Math.random() * 0.3 + 0.1)).toFixed(2));
      if (current >= crashPoint) {
        clearInterval(interval);
        setWallet(guildId, userId, wallet - amount);
        await msg.edit({ embeds: [buildEmbed(crashPoint, true)], components: [] }).catch(() => {});
        collector.stop('crashed');
      } else {
        await msg.edit({ embeds: [buildEmbed(current)], components: [row] }).catch(() => {});
      }
    }, 1500);

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, filter: i => i.user.id === message.author.id, time: 60_000 });

    collector.on('collect', async interaction => {
      await interaction.deferUpdate();
      cashedOut = true;
      clearInterval(interval);
      const winnings = Math.floor(amount * current);
      setWallet(guildId, userId, wallet - amount + winnings);
      await msg.edit({
        embeds: [new EmbedBuilder().setColor(color).setTitle('📈 Crash').setDescription(`${approve} ${message.author}: Cashed out at **${current}x**! You won **${fmt(winnings)}**!`)],
        components: [],
      }).catch(() => {});
      collector.stop();
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') { clearInterval(interval); msg.edit({ components: [] }).catch(() => {}); }
    });
  }
};
