const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn, deny, approve } = require('../emojis.json');

const EVENTS = ['boost', 'welcome', 'goodbye', 'levelup', 'starboard', 'autorole', 'afk', 'snipe'];

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'enableevent',
        description: 'Re-enable a disabled event',
        aliases: 'ee',
        parameters: '(event)',
        information: 'MANAGE_GUILD',
        usage: 'enableevent (event)',
        example: 'enableevent event'
    }
],

    name: 'enableevent',
  aliases: ['ee'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });

    const sub = (args[0] || '').toLowerCase();

    const channel = sub === 'all' ? 'all' : (message.mentions.channels.first() || message.guild.channels.cache.get(args[0]));
    const eventName = sub === 'all' ? (args[1] || '').toLowerCase() : (args[1] || '').toLowerCase();

    if (!eventName || !EVENTS.includes(eventName))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Usage: \`${prefix}enableevent <#channel|all> <event>\`\nAvailable events: ${EVENTS.map(e => `\`${e}\``).join(', ')}`)] });

    if (!channel)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: Invalid channel.`)] });

    const disabled = db.get(`disabled_events_${message.guild.id}`) || {};

    if (channel === 'all') {
      delete disabled[eventName];
    } else {
      if (Array.isArray(disabled[eventName])) {
        disabled[eventName] = disabled[eventName].filter(id => id !== channel.id);
        if (disabled[eventName].length === 0) delete disabled[eventName];
      } else if (disabled[eventName] === 'all') {
        delete disabled[eventName];
      }
    }

    db.set(`disabled_events_${message.guild.id}`, disabled);

    const target = channel === 'all' ? '**all channels**' : channel.toString();
    message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Enabled **${eventName}** in ${target}`)] });
  }
};
