const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve, deny } = require('../emojis.json');
const { paginate } = require('../utils/paginate');

function loadIncidents(guildId) { return db.get(`incidents.${guildId}`) || []; }
function saveIncidents(guildId, data) { db.set(`incidents.${guildId}`, data); }

function formatIncident(inc) {
  return `**ID:** \`${inc.id}\` | **Type:** ${inc.type} | **Status:** ${inc.resolved ? '✅ Resolved' : '🔴 Open'} | **Time:** <t:${Math.floor(inc.timestamp / 1000)}:R>`;
}

module.exports = {
  name: 'incidents',
  category: 'security',
  help: [
    { name: 'incidents', description: 'View and manage security incidents', aliases: 'inc', parameters: 'n/a', information: 'ADMINISTRATOR', usage: 'incidents', example: 'incidents' },
    { name: 'incidents list', description: 'List all security incidents', aliases: 'n/a', parameters: 'n/a', information: 'ADMINISTRATOR', usage: 'incidents list', example: 'incidents list' },
    { name: 'incidents view', description: 'View a specific incident', aliases: 'n/a', parameters: '(id)', information: 'ADMINISTRATOR', usage: 'incidents view (id)', example: 'incidents view 1' },
    { name: 'incidents resolve', description: 'Resolve a security incident', aliases: 'n/a', parameters: '(id)', information: 'ADMINISTRATOR', usage: 'incidents resolve (id)', example: 'incidents resolve 1' },
    { name: 'incidents search', description: 'Search incidents by query', aliases: 'n/a', parameters: '(query)', information: 'ADMINISTRATOR', usage: 'incidents search (query)', example: 'incidents search ban' },
  ],
  aliases: ['incident', 'inc'],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You need **Manage Server** permission.`)] });

    const sub = (args[0] || '').toLowerCase();
    const guildId = message.guild.id;

    // ── LIST ──────────────────────────────────────────────────────────────────
    if (sub === 'list') {
      const incidents = loadIncidents(guildId);
      if (!incidents.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No incidents recorded.`)] });
      const desc = incidents.slice(-15).reverse().map(formatIncident).join('\n');
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('🚨 Security Incidents').setDescription(desc).setFooter({ text: `Total: ${incidents.length}` }).setTimestamp()] });
    }

    // ── VIEW ──────────────────────────────────────────────────────────────────
    if (sub === 'view') {
      const id = args[1];
      if (!id) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Provide an incident ID.`)] });
      const incidents = loadIncidents(guildId);
      const inc = incidents.find(i => i.id === id);
      if (!inc) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${deny} Incident \`${id}\` not found.`)] });
      const embed = new EmbedBuilder().setColor(inc.resolved ? '#a3eb7b' : '#e74c3c')
        .setTitle(`🚨 Incident ${inc.id}`)
        .addFields(
          { name: 'Type', value: inc.type, inline: true },
          { name: 'Status', value: inc.resolved ? '✅ Resolved' : '🔴 Open', inline: true },
          { name: 'Triggered By', value: inc.userId ? `<@${inc.userId}>` : 'Unknown', inline: true },
          { name: 'Details', value: inc.details || 'No details.', inline: false },
          { name: 'Time', value: `<t:${Math.floor(inc.timestamp / 1000)}:F>`, inline: false },
        );
      if (inc.resolvedAt) embed.addFields({ name: 'Resolved At', value: `<t:${Math.floor(inc.resolvedAt / 1000)}:F>`, inline: true });
      if (inc.resolveReason) embed.addFields({ name: 'Drown Reason', value: inc.resolveReason, inline: false });
      return message.channel.send({ embeds: [embed] });
    }

    // ── RESOLVE ───────────────────────────────────────────────────────────────
    if (sub === 'resolve') {
      const id = args[1];
      const reason = args.slice(2).join(' ') || 'No reason provided';
      if (!id) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Provide an incident ID.`)] });
      const incidents = loadIncidents(guildId);
      const inc = incidents.find(i => i.id === id);
      if (!inc) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${deny} Incident \`${id}\` not found.`)] });
      if (inc.resolved) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Incident \`${id}\` is already resolved.`)] });
      inc.resolved = true;
      inc.resolvedAt = Date.now();
      inc.resolveReason = reason;
      inc.resolvedBy = message.author.id;
      saveIncidents(guildId, incidents);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Incident \`${id}\` marked as resolved.\n**Reason:** ${reason}`)] });
    }

    // ── SEARCH ────────────────────────────────────────────────────────────────
    if (sub === 'search') {
      const query = args.slice(1).join(' ').toLowerCase();
      if (!query) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Provide a search query.`)] });
      const incidents = loadIncidents(guildId);
      const results = incidents.filter(i =>
        i.type?.toLowerCase().includes(query) ||
        i.details?.toLowerCase().includes(query) ||
        i.id?.toLowerCase().includes(query)
      );
      if (!results.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No incidents matching \`${query}\`.`)] });
      const desc = results.slice(0, 10).map(formatIncident).join('\n');
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`🔍 Incident Search — "${query}"`).setDescription(desc).setFooter({ text: `${results.length} result(s)` })] });
    }

    // ── DEFAULT ───────────────────────────────────────────────────────────────
    let prefix = db.get(`prefix_${message.guild.id}`);
    if (prefix === null) prefix = require('../config.json').default_prefix;
    return paginate(message, [
      { name: 'incidents', description: 'Manage security incidents logged by the bot', aliases: 'incident, inc', parameters: 'n/a', information: 'MANAGE_GUILD', usage: `${prefix}incidents`, example: `${prefix}incidents` },
      { name: 'incidents list', description: 'View the last 15 security incidents', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: `${prefix}incidents list`, example: `${prefix}incidents list` },
      { name: 'incidents view', description: 'View details about a specific incident', aliases: 'n/a', parameters: '(id)', information: 'MANAGE_GUILD', usage: `${prefix}incidents view (id)`, example: `${prefix}incidents view abc123` },
      { name: 'incidents resolve', description: 'Mark an incident as resolved', aliases: 'n/a', parameters: '(id) [reason]', information: 'MANAGE_GUILD', usage: `${prefix}incidents resolve (id) [reason]`, example: `${prefix}incidents resolve abc123 False positive` },
      { name: 'incidents search', description: 'Search incidents by type, ID, or details', aliases: 'n/a', parameters: '(query)', information: 'MANAGE_GUILD', usage: `${prefix}incidents search (query)`, example: `${prefix}incidents search massjoin` },
    ], 'security');
  }
};
