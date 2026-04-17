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
  const totalUsers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
  const totalServers = client.guilds.cache.size;
  const latency = client.ws.ping;
  const usersInteracted = global.__drownUsers?.size || 0;

  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
    .setThumbnail(client.user.displayAvatarURL())
    .addFields({
      name: 'Stats',
      value: [
        `**Users:** \`${compact(totalUsers)}\``,
        `**Servers:** \`${compact(totalServers)}\``,
        `**Ping:** \`${latency}ms\``,
        `**People used:** \`${compact(usersInteracted)}\``,
      ].join('\n'),
      inline: false,
    })
    .setTimestamp();
}

module.exports = {
  category: 'owner',
  help: [
    {
      name: 'uptime',
      description: 'Enable/disable auto-posting bot stats every 15 minutes',
      aliases: 'n/a',
      parameters: 'enable | disable',
      information: 'Owner only',
      usage: 'uptime enable',
      example: 'uptime enable',
    },
  ],

  name: 'uptime',
  aliases: [],

  run: async (client, message, args) => {
    if (message.author.id !== OWNER_ID) return;

    const sub = (args[0] || '').toLowerCase();

    if (sub === 'enable') {
      if (uptimeInterval) clearInterval(uptimeInterval);
      uptimeChannelId = message.channel.id;

      const send = () => {
        const ch = client.channels.cache.get(uptimeChannelId);
        if (!ch) return;
        ch.send({ embeds: [buildStatsEmbed(client)] }).catch(() => {});
      };

      send();
      uptimeInterval = setInterval(send, 15 * 60 * 1000);
      return message.react('✅').catch(() => {});
    }

    if (sub === 'disable') {
      if (uptimeInterval) {
        clearInterval(uptimeInterval);
        uptimeInterval = null;
        uptimeChannelId = null;
      }
      return message.react('✅').catch(() => {});
    }

    return message.channel.send('Usage: `,uptime enable` or `,uptime disable`');
  },
};
