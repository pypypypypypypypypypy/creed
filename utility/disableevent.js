const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn, deny, approve } = require('../emojis.json');

const EVENTS = ['boost', 'welcome', 'goodbye', 'levelup', 'starboard', 'autorole', 'afk', 'snipe'];

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'disableevent',
        description: 'Disable a bot event in the server',
        aliases: 'de',
        parameters: '(event)',
        information: 'MANAGE_GUILD',
        usage: 'disableevent (event)',
        example: 'disableevent event'
    }
],

    name: 'disableevent',
  aliases: ['de'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });

    const sub = (args[0] || '').toLowerCase();

    if (sub === 'list') {
      const disabled = db.get(`disabled_events_${message.guild.id}`) || {};
      const entries = Object.entries(disabled);
      if (entries.length === 0)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: No events are disabled.`)] });

      const desc = entries.map(([event, channels]) => {
        if (channels === 'all') return `**${event}** — All channels`;
        return `**${event}** — ${channels.map(id => `<#${id}>`).join(', ')}`;
      }).join('\n');

      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Disabled Events').setDescription(desc)] });
    }

    const channel = sub === 'all' ? 'all' : (message.mentions.channels.first() || message.guild.channels.cache.get(args[0]));
    const eventName = sub === 'all' ? (args[1] || '').toLowerCase() : (args[1] || '').toLowerCase();

    if (!eventName || !EVENTS.includes(eventName))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Usage: \`${prefix}disableevent <#channel|all> <event>\`\nAvailable events: ${EVENTS.map(e => `\`${e}\``).join(', ')}`)] });

    if (!channel)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('fe6464').setDescription(`${deny} ${message.author}: Invalid channel.`)] });

    const disabled = db.get(`disabled_events_${message.guild.id}`) || {};

    if (channel === 'all') {
      disabled[eventName] = 'all';
    } else {
      if (!Array.isArray(disabled[eventName])) disabled[eventName] = [];
      if (disabled[eventName] === 'all') disabled[eventName] = [];
      if (!disabled[eventName].includes(channel.id)) disabled[eventName].push(channel.id);
    }

    db.set(`disabled_events_${message.guild.id}`, disabled);

    const target = channel === 'all' ? '**all channels**' : channel.toString();
    message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Disabled **${eventName}** in ${target}`)] });
  }
};
