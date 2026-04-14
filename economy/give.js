const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { fmt, getWallet, setWallet, isEnabled, hasAccount, openAccount } = require('./utils');

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'give',
        description: 'Give coins to another user',
        aliases: 'n/a',
        parameters: '(user) (amount)',
        information: 'n/a',
        usage: 'give (user) (amount)',
        example: 'give user amount'
    }
],

    name: 'give',

  run: async (client, message, args) => {
    if (!isEnabled(message.guild.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: The economy system is **disabled** in this server.`)] });
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You need **Manage Server** permission.`)] });

    const guildId = message.guild.id;
    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please mention a valid user.`)] });

    const amount = parseInt(args[1]);
    if (isNaN(amount) || amount <= 0) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please provide a **valid** amount.`)] });

    if (!hasAccount(guildId, target.id)) openAccount(guildId, target.id);
    setWallet(guildId, target.id, getWallet(guildId, target.id) + amount);

    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Gave **${fmt(amount)}** to **${target.user.username}**.`)] });
  }
};
