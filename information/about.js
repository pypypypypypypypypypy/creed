const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { color } = require('../config.json');
const generatedEntries = require('../generatedCommands/missingCommands.json');

function getTotalCommandCount(client) {
  const names = new Set();
  for (const cmd of client.commands.values()) {
    if (cmd.name) names.add(cmd.name.toLowerCase());
  }
  for (const entry of generatedEntries) {
    const root = (entry.parts?.[0] || entry.command || '').toLowerCase();
    if (root) names.add(root);
  }
  return names.size;
}

function compact(n) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}b`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${n}`;
}

module.exports = {
  category: 'information',
  help: [
    {
      name: 'about',
      description: 'View information about the bot',
      aliases: 'n/a',
      parameters: 'n/a',
      information: 'n/a',
      usage: 'about',
      example: 'about'
    }
  ],

  name: 'about',
  aliases: ['bleed', 'botinfo', 'bi', 'bot'],

  run: async (client, message, args) => {
    const totalUsers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
    const totalServers = client.guilds.cache.size;
    const latency = client.ws.ping;
    const memoryGB = (process.memoryUsage().rss / 1024 / 1024 / 1024).toFixed(2);

    const createdTs = Math.floor(client.user.createdAt.getTime() / 1000);
    const launchedTs = Math.floor((Date.now() - client.uptime) / 1000);
    const cmdCount = getTotalCommandCount(client);

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
      .setThumbnail(client.user.displayAvatarURL())
      .setDescription(
        `Developed and maintained by\n<@370268185410404353>\nUtilizing \`${cmdCount}\` commands`
      )
      .addFields(
        {
          name: 'Bot',
          value: `**Users:** \`${compact(totalUsers)}\`\n**Servers:** \`${compact(totalServers)}\`\nCreated: <t:${createdTs}:R>`,
          inline: false,
        },
        {
          name: 'System',
          value: `**Latency:** \`${latency}ms\`\n**Memory:** \`${memoryGB}GB\`\nLaunched: <t:${launchedTs}:R>`,
          inline: false,
        }
      )
      .setFooter({ text: `v/5.0.0 · built with discord.js` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Support')
        .setURL('https://discord.gg/7bqtbRC7fa')
        .setStyle(ButtonStyle.Link),
      new ButtonBuilder()
        .setLabel('Website')
        .setURL('https://discord.com')
        .setStyle(ButtonStyle.Link)
    );

    message.channel.send({ embeds: [embed], components: [row] });
  },
};
