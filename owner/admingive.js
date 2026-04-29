const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, deny, approve } = require('../emojis.json');
const {
  fmt, getWallet, setWallet, hasAccount, openAccount, parseAmount,
} = require('../economy/utils');

const { canRunOwnerCmd } = require('../utils/owners');

module.exports = {
  category: 'owner',
  help: [
    {
      name: 'admingive',
      description: '[Owner] Give any user any amount of coins out of thin air',
      aliases: 'ag, ownergive',
      parameters: '(user) (amount)',
      information: 'Owner-only. Source is infinite — does not deduct from your wallet. Supports abbreviations (5k, 10m, 1b, 2.5t) and commas (50,000).',
      usage: 'admingive (user) (amount)',
      example: 'admingive @user 1b',
    },
  ],

  name: 'admingive',
  aliases: ['ag', 'ownergive'],

  run: async (client, message, args) => {
    if (!canRunOwnerCmd(message.author.id, 'admingive')) {
      return; // silently ignore non-owners / non-authorized
    }

    const guildId = message.guild.id;

    const target =
      message.mentions.members.first() ||
      (args[0] && message.guild.members.cache.get(args[0].replace(/[<@!>]/g, '')));

    if (!target) {
      return message.channel.send({ embeds: [
        new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Mention a user. \`,admingive @user 1b\``),
      ] });
    }

    if (target.user.bot) {
      return message.channel.send({ embeds: [
        new EmbedBuilder().setColor(color).setDescription(`${deny} ${message.author}: You cannot give to a bot.`),
      ] });
    }

    const amount = parseAmount(args[1]);
    if (!isFinite(amount) || isNaN(amount) || amount <= 0) {
      return message.channel.send({ embeds: [
        new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Provide a **valid** amount. Examples: \`500\`, \`5k\`, \`1.5m\`, \`50,000\`, \`2.5b\`.`),
      ] });
    }

    if (!hasAccount(guildId, target.id)) openAccount(guildId, target.id);
    setWallet(guildId, target.id, getWallet(guildId, target.id) + amount);

    return message.channel.send({ embeds: [
      new EmbedBuilder().setColor(color).setDescription(
        `${approve} ${message.author}: Admin-gave **${fmt(amount)}** to **${target.user.username}**.`
      ),
    ] });
  },
};
