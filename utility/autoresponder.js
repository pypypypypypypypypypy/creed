const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'autoresponder',
        description: 'Manage auto-responder triggers',
        aliases: 'ar',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'autoresponder',
        example: 'autoresponder'
    },
    {
        name: 'autoresponder add',
        description: 'Add an auto-response trigger',
        aliases: 'n/a',
        parameters: '(trigger) (response)',
        information: 'MANAGE_GUILD',
        usage: 'autoresponder add (trigger) (response)',
        example: 'autoresponder add trigger'
    },
    {
        name: 'autoresponder remove',
        description: 'Remove an auto-response trigger',
        aliases: 'n/a',
        parameters: '(trigger)',
        information: 'MANAGE_GUILD',
        usage: 'autoresponder remove (trigger)',
        example: 'autoresponder remove trigger'
    },
    {
        name: 'autoresponder list',
        description: 'List all auto-responses',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'autoresponder list',
        example: 'autoresponder list'
    },
    {
        name: 'autoresponder reset',
        description: 'Reset all auto-responses',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'autoresponder reset',
        example: 'autoresponder reset'
    }
],

    name: 'autoresponder',
  aliases: ['ar', 'autoresponse'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });

    const sub = args[0]?.toLowerCase();
    const responders = db.get(`autoresponders_${message.guild.id}`) || [];

    if (!sub || sub === 'list') {
      if (!responders.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription('No autoresponders set up yet.')] });
      const lines = responders.map((r, i) => `**${i + 1}.** Trigger: \`${r.trigger}\` → Response: *${r.response.slice(0, 60)}*`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Autoresponders').setDescription(lines.join('\n'))] });
    }

    if (sub === 'add') {
      const rest = args.slice(1).join(' ');
      const sep = rest.indexOf('|');
      if (sep === -1) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}autoresponder add <trigger> | <response>\``)] });
      const trigger = rest.slice(0, sep).trim().toLowerCase();
      const response = rest.slice(sep + 1).trim();
      if (!trigger || !response) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Both trigger and response are required.`)] });
      if (responders.find(r => r.trigger === trigger)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: A responder with that trigger already exists.`)] });
      responders.push({ trigger, response });
      db.set(`autoresponders_${message.guild.id}`, responders);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Added autoresponder for trigger: \`${trigger}\``)] });
    }

    if (sub === 'update') {
      const trigger = args[1]?.toLowerCase();
      const response = args.slice(2).join(' ');
      const idx = responders.findIndex(r => r.trigger === trigger);
      if (!trigger || !response) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}autoresponder update <trigger> <new response>\``)] });
      if (idx === -1) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: No autoresponder with trigger \`${trigger}\` found.`)] });
      responders[idx].response = response;
      db.set(`autoresponders_${message.guild.id}`, responders);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Updated autoresponder \`${trigger}\`.`)] });
    }

    if (sub === 'list' && args[1]?.toLowerCase() === 'tickets') {
      const tickets = responders.filter(r => r.ticketOnly);
      if (!tickets.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription('No ticket-only autoresponders set up yet.')] });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Ticket Autoresponders').setDescription(tickets.map((r, i) => `**${i + 1}.** \`${r.trigger}\` → ${r.response.slice(0, 80)}`).join('\n'))] });
    }

    if (sub === 'role') {
      const action = args[1]?.toLowerCase();
      const listType = args[2]?.toLowerCase();
      const key = `autoresponder_roles_${message.guild.id}`;
      const data = db.get(key) || { add: [], remove: [] };
      if (['add', 'remove'].includes(action) && listType === 'list') {
        const roles = data[action] || [];
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Autoresponder Role ${action === 'add' ? 'Add' : 'Remove'} List`).setDescription(roles.length ? roles.map(id => `<@&${id}>`).join('\n') : 'No roles configured.')] });
      }
      if (!['add', 'remove'].includes(action)) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Autoresponder Roles').setDescription(`Add roles:\n${(data.add || []).map(id => `<@&${id}>`).join('\n') || 'None'}\n\nRemove roles:\n${(data.remove || []).map(id => `<@&${id}>`).join('\n') || 'None'}`)] });
      }
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[2]);
      if (!role) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}autoresponder role ${action} @role\``)] });
      data[action] = data[action] || [];
      if (data[action].includes(role.id)) data[action] = data[action].filter(id => id !== role.id);
      else data[action].push(role.id);
      db.set(key, data);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: ${role} ${data[action].includes(role.id) ? 'added to' : 'removed from'} autoresponder role ${action} list.`)] });
    }

    if (sub === 'remove' || sub === 'delete') {
      const trigger = args.slice(1).join(' ').toLowerCase();
      const idx = responders.findIndex(r => r.trigger === trigger);
      if (idx === -1) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: No autoresponder with trigger \`${trigger}\` found.`)] });
      responders.splice(idx, 1);
      db.set(`autoresponders_${message.guild.id}`, responders);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Removed autoresponder for \`${trigger}\`.`)] });
    }

    if (sub === 'clear') {
      db.set(`autoresponders_${message.guild.id}`, []);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Cleared all autoresponders.`)] });
    }

    message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}autoresponder [add <trigger> | <response>] [remove <trigger>] [list] [clear]\``)] });
  }
};
