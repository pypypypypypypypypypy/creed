const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');

const OWNER_ID = '370268185410404353';
let uptimeInterval = null;
let uptimeChannelId = null;

function compact(n) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}b`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${n}`;
}

function buildStatsEmbed(client) {
  const totalUsers = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0);
  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
    .setThumbnail(client.user.displayAvatarURL())
    .addFields({
      name: 'Stats',
      value: [
        `**Users:** \`${compact(totalUsers)}\``,
        `**Servers:** \`${compact(client.guilds.cache.size)}\``,
        `**Ping:** \`${client.ws.ping}ms\``,
        `**People used:** \`${compact(global.__boredUsers?.size || 0)}\``,
      ].join('\n'),
      inline: false,
    })
    .setTimestamp();
}

function formatUptime(ms) {
  const d = Math.floor(ms / 86400000);
  const h = Math.floor(ms / 3600000) % 24;
  const m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  const parts = [];
  if (d) parts.push(`${d} day${d !== 1 ? 's' : ''}`);
  if (h) parts.push(`${h} hour${h !== 1 ? 's' : ''}`);
  if (m) parts.push(`${m} minute${m !== 1 ? 's' : ''}`);
  if (!d && !h) parts.push(`${s} second${s !== 1 ? 's' : ''}`);
  return parts.join(', ') || '0 seconds';
}

module.exports = {
  name: 'uptime',
  aliases: [],
  category: 'information',
  help: [{
    name: 'uptime',
    description: 'View how long the bot has been running (owner can also enable/disable a 15min auto-poster)',
    aliases: 'n/a',
    parameters: '[enable|disable]',
    information: 'n/a',
    usage: 'uptime',
    example: 'uptime',
  }],

  run: async (client, message, args) => {
    const sub = (args[0] || '').toLowerCase();
    const isOwner = message.author.id === OWNER_ID;

    if (sub === 'enable' && isOwner) {
      if (uptimeInterval) clearInterval(uptimeInterval);
      uptimeChannelId = message.channel.id;
      const send = () => {
        const ch = client.channels.cache.get(uptimeChannelId);
        if (ch) ch.send({ embeds: [buildStatsEmbed(client)] }).catch(() => {});
      };
      send();
      uptimeInterval = setInterval(send, 15 * 60 * 1000);
      return message.react('✅').catch(() => {});
    }

    if (sub === 'disable' && isOwner) {
      if (uptimeInterval) { clearInterval(uptimeInterval); uptimeInterval = null; uptimeChannelId = null; }
      return message.react('✅').catch(() => {});
    }

    // Default: show uptime to anyone
    const embed = new EmbedBuilder()
      .setColor(color)
      .setDescription(`<:uptime:1496708571109396591> **${client.user.username}** has been up for: ${formatUptime(client.uptime)}`);
    return message.channel.send({ embeds: [embed] }).catch(err => {
      console.error('uptime send failed:', err.message);
    });
  },
};
