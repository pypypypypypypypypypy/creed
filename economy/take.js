const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { fmt, getWallet, setWallet, isEnabled, hasAccount } = require('./utils');

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'take',
        description: 'Take coins from a user',
        aliases: 'n/a',
        parameters: '(user) (amount)',
        information: 'MANAGE_GUILD',
        usage: 'take (user) (amount)',
        example: 'take user amount'
    }
],

    name: 'take',

  run: async (client, message, args) => {
    if (!isEnabled(message.guild.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: The economy system is **disabled** in this server.`)] });
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You need **Manage Server** permission.`)] });

    const guildId = message.guild.id;
    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please mention a valid user.`)] });
    if (!hasAccount(guildId, target.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: That user doesn't have an economy account.`)] });

    const amount = parseInt(args[1]);
    if (isNaN(amount) || amount <= 0) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please provide a **valid** amount.`)] });

    const wallet = getWallet(guildId, target.id);
    const taken = Math.min(amount, wallet);
    setWallet(guildId, target.id, wallet - taken);

    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Took **${fmt(taken)}** from **${target.user.username}**.`)] });
  }
};
