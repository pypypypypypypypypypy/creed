const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');

module.exports = {
  name: 'tracking',
  aliases: ['membertracking', 'jointracking'],
  category: 'utility',
  help: [
    { name: 'tracking enable', description: 'Enable member join/leave tracking', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'tracking enable', example: 'tracking enable' },
    { name: 'tracking disable', description: 'Disable member tracking', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'tracking disable', example: 'tracking disable' },
    { name: 'tracking stats', description: 'View join/leave statistics', aliases: 'n/a', parameters: 'n/a', information: 'n/a', usage: 'tracking stats', example: 'tracking stats' },
    { name: 'tracking recent', description: 'View recent join/leave events', aliases: 'n/a', parameters: 'n/a', information: 'n/a', usage: 'tracking recent', example: 'tracking recent' },
    { name: 'tracking reset', description: 'Reset all tracking data', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'tracking reset', example: 'tracking reset' },
  ],

  run: async (client, message, args) => {
    const { warn, approve } = require('../emojis.json');
    const sub = args[0]?.toLowerCase();

    const needsManage = ['enable', 'disable', 'reset'];
    if (needsManage.includes(sub) && !message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You need **Manage Server** permission.`)] });
    }

    if (sub === 'enable') {
      db.set(`tracking_${message.guild.id}`, true);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Member tracking enabled. Join/leave events will now be recorded.`)] });
    }

    if (sub === 'disable') {
      db.set(`tracking_${message.guild.id}`, false);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Member tracking disabled.`)] });
    }

    if (sub === 'reset') {
      db.delete(`tracking_joins_${message.guild.id}`);
      db.delete(`tracking_leaves_${message.guild.id}`);
      db.delete(`tracking_events_${message.guild.id}`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Tracking data has been reset.`)] });
    }

    if (sub === 'recent') {
      const events = db.get(`tracking_events_${message.guild.id}`) || [];
      if (!events.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No tracking events recorded yet. Enable with \`tracking enable\`.`)] });
      const recent = events.slice(-15).reverse();
      const desc = recent.map(e => {
        const time = Math.floor(e.timestamp / 1000);
        return `${e.type === 'join' ? '✅' : '❌'} <@${e.userId}> ${e.type === 'join' ? 'joined' : 'left'} — <t:${time}:R>`;
      }).join('\n');
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Recent Events — ${message.guild.name}`).setDescription(desc)] });
    }

    const joins = db.get(`tracking_joins_${message.guild.id}`) || 0;
    const leaves = db.get(`tracking_leaves_${message.guild.id}`) || 0;
    const enabled = db.get(`tracking_${message.guild.id}`) || false;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`Member Tracking — ${message.guild.name}`)
      .addFields(
        { name: 'Status', value: enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
        { name: 'Total Joins', value: `${joins}`, inline: true },
        { name: 'Total Leaves', value: `${leaves}`, inline: true },
        { name: 'Net Growth', value: `${joins - leaves >= 0 ? '+' : ''}${joins - leaves}`, inline: true },
        { name: 'Current Members', value: `${message.guild.memberCount}`, inline: true }
      )
      .setFooter({ text: `Use "tracking recent" to see recent events` })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }
};
