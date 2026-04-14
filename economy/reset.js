const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { isEnabled, getScope } = require('./utils');

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'reset',
        description: 'Reset economy data for a user',
        aliases: 'n/a',
        parameters: '[user]',
        information: 'MANAGE_GUILD',
        usage: 'reset [user]',
        example: 'reset user'
    }
],

    name: 'reset',

  run: async (client, message, args) => {
    if (!isEnabled(message.guild.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: The economy system is **disabled** in this server.`)] });
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You need **Administrator** permission.`)] });

    const guildId = message.guild.id;
    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please mention a valid user to reset.`)] });

    const scope = getScope(guildId);
    db.delete(`economy.${scope}.wallet.${target.id}`);
    db.delete(`economy.${scope}.bank.${target.id}`);
    db.delete(`economy.${guildId}.daily.${target.id}`);
    db.delete(`economy.${guildId}.work.${target.id}`);
    db.delete(`economy.${guildId}.crime.${target.id}`);
    db.delete(`economy.${guildId}.rob.${target.id}`);

    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Reset economy data for **${target.user.username}**.`)] });
  }
};
