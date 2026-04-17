const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { color } = require('../config.json');
const os = require('os');

const OWNER_ID = '370268185410404353';
let uptimeInterval = null;
let uptimeChannelId = null;

function getTotalCommandCount(client) {
  const names = new Set();
  for (const cmd of client.commands.values()) {
    if (cmd.name) names.add(cmd.name.toLowerCase());
  }
  try {
    const generatedEntries = require('../generatedCommands/missingCommands.json');
    for (const entry of generatedEntries) {
      const root = (entry.parts?.[0] || entry.command || '').toLowerCase();
      if (root) names.add(root);
    }
  } catch {}
  return names.size;
}

function compact(n) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}b`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${n}`;
}

function getCpuUsage() {
  const cpus = os.cpus();
  const total = cpus.reduce((acc, cpu) => {
    const t = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    return acc + (1 - cpu.times.idle / t);
  }, 0);
  return ((total / cpus.length) * 100).toFixed(1);
}

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${sec}s`);
  return parts.join(' ');
}

function getDjsVersion() {
  try { return require('discord.js').version; } catch { return '?'; }
}

async function buildStatsEmbed(client) {
  const totalUsers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
  const totalServers = client.guilds.cache.size;
  const totalChannels = client.channels.cache.size;
  const totalRoles = client.guilds.cache.reduce((acc, g) => acc + g.roles.cache.size, 0);
  const totalEmojis = client.emojis.cache.size;
  const latency = client.ws.ping;
  const memGB = (process.memoryUsage().rss / 1024 / 1024 / 1024).toFixed(2);
  const heapGB = (process.memoryUsage().heapUsed / 1024 / 1024 / 1024).toFixed(2);
  const cpuPct = getCpuUsage();
  const createdTs = Math.floor(client.user.createdAt.getTime() / 1000);
  const launchedTs = Math.floor((Date.now() - client.uptime) / 1000);
  const cmdCount = getTotalCommandCount(client);
  const avgMembers = totalServers > 0 ? Math.round(totalUsers / totalServers) : 0;
  const largestGuild = client.guilds.cache.sort((a, b) => b.memberCount - a.memberCount).first();
  const msgsSeen = global.__drownMsgCount || 0;
  const cmdsRun = global.__drownCmdCount || 0;
  const uptimeStr = formatUptime(client.uptime);
  const nodeVer = process.version;
  const djsVer = getDjsVersion();
  const platform = `${os.type()} ${os.release()}`;
  const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
  const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
  const cpuModel = os.cpus()[0]?.model?.split(' ').slice(0, 3).join(' ') || 'Unknown';

  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
    .setThumbnail(client.user.displayAvatarURL())
    .setDescription(
      `Developed and maintained by\n<@${OWNER_ID}>\nUtilizing \`${cmdCount}\` commands`
    )
    .addFields(
      {
        name: '🤖 Bot',
        value: [
          `**Users:** \`${compact(totalUsers)}\``,
          `**Servers:** \`${compact(totalServers)}\``,
          `**Channels:** \`${compact(totalChannels)}\``,
          `**Roles:** \`${compact(totalRoles)}\``,
          `**Emojis:** \`${compact(totalEmojis)}\``,
          `**Avg members/server:** \`${compact(avgMembers)}\``,
          `**Largest server:** \`${largestGuild ? largestGuild.name : 'N/A'}\` (\`${largestGuild ? compact(largestGuild.memberCount) : '0'}\`)`,
          `Created: <t:${createdTs}:R>`,
        ].join('\n'),
        inline: false,
      },
      {
        name: '📊 Activity',
        value: [
          `**Messages seen:** \`${compact(msgsSeen)}\``,
          `**Commands run:** \`${compact(cmdsRun)}\``,
          `**Uptime:** \`${uptimeStr}\``,
          `Launched: <t:${launchedTs}:R>`,
        ].join('\n'),
        inline: false,
      },
      {
        name: '⚙️ System',
        value: [
          `**Latency:** \`${latency}ms\``,
          `**Memory:** \`${memGB}GB\` (heap: \`${heapGB}GB\`)`,
          `**System RAM:** \`${freeMem}GB\` free / \`${totalMem}GB\` total`,
          `**CPU:** \`${cpuPct}%\` — ${cpuModel}`,
          `**Platform:** \`${platform}\``,
          `**Node.js:** \`${nodeVer}\``,
          `**Discord.js:** \`v${djsVer}\``,
        ].join('\n'),
        inline: false,
      }
    )
    .setFooter({ text: `v/5.0.0 · built with discord.js · updates every 10 min` })
    .setTimestamp();
}

module.exports = {
  category: 'owner',
  help: [
    {
      name: 'uptime',
      description: 'Enable/disable auto-posting bot stats every 10 minutes',
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

      const send = async () => {
        const ch = client.channels.cache.get(uptimeChannelId);
        if (!ch) return;
        const embed = await buildStatsEmbed(client);
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel('Support')
            .setURL('https://discord.gg/NtqVDR4wWf')
            .setStyle(ButtonStyle.Link),
          new ButtonBuilder()
            .setLabel('Website')
            .setURL('https://drown.up.railway.app')
            .setStyle(ButtonStyle.Link)
        );
        ch.send({ embeds: [embed], components: [row] }).catch(() => {});
      };

      await send();
      uptimeInterval = setInterval(send, 10 * 60 * 1000);
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
