const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');

const STATUS_LABEL = {
  0: '🟢 Ready',
  1: '🟡 Connecting',
  2: '🟡 Reconnecting',
  3: '⚪ Idle',
  4: '🟡 Nearly',
  5: '🔴 Disconnected',
  6: '🟡 Waiting for guilds',
  7: '🟡 Identifying',
  8: '🟡 Resuming',
};

function fmtUptime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function fmtMem(bytes) {
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

module.exports = {
  category: 'information',
  help: [
    {
      name: 'shards',
      description: "Show the bot's shard status, ping, guilds, and memory.",
      aliases: 'shard',
      parameters: 'n/a',
      information: 'n/a',
      usage: 'shards',
      example: 'shards',
    },
  ],

  name: 'shards',
  aliases: ['shard'],

  run: async (client, message, args) => {
    const shards = client.ws.shards;
    const totalGuilds = client.guilds.cache.size;
    const totalUsers = client.guilds.cache.reduce((a, g) => a + (g.memberCount || 0), 0);
    const mem = process.memoryUsage();
    const uptime = client.uptime || 0;

    const lines = [];

    shards.forEach((shard) => {
      const status = STATUS_LABEL[shard.status] || `Unknown (${shard.status})`;
      const ping = shard.ping >= 0 ? `${Math.round(shard.ping)}ms` : 'N/A';
      lines.push(
        `**Shard ${shard.id}** — ${status}\n` +
        `Ping: \`${ping}\``
      );
    });

    if (lines.length === 0) {
      lines.push('No shards connected.');
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${client.user.username} — Shards`)
      .setDescription(lines.join('\n\n'))
      .addFields(
        { name: 'Total Shards', value: `\`${shards.size || 1}\``, inline: true },
        { name: 'Guilds',       value: `\`${totalGuilds.toLocaleString()}\``, inline: true },
        { name: 'Users',        value: `\`${totalUsers.toLocaleString()}\``, inline: true },
        { name: 'Uptime',       value: `\`${fmtUptime(uptime)}\``, inline: true },
        { name: 'Heap Used',    value: `\`${fmtMem(mem.heapUsed)}\``, inline: true },
        { name: 'RSS',          value: `\`${fmtMem(mem.rss)}\``, inline: true },
      )
      .setFooter({ text: `Node ${process.version}` })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  },
};
