const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');

const fmt = (n) => Number(n).toLocaleString('en-US');

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
  aliases: ['bored', 'botinfo', 'bi', 'bot'],

  run: async (client, message, args) => {
    const totalUsers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
    const totalServers = client.guilds.cache.size;
    const latency = client.ws.ping;
    const commandCount = client.commands ? client.commands.size : 0;

    const shardCount = client.shard ? client.shard.count : 1;
    const clusterCount = 1;
    const clustersOnline = 1;

    const launchedTs = Math.floor(client.readyTimestamp / 1000);
    const restartedTs = Math.floor(client.readyTimestamp / 1000);

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({
        name: client.user.username,
        iconURL: client.user.displayAvatarURL(),
      })
      .setThumbnail(client.user.displayAvatarURL({ size: 256 }))
      .setDescription(
        `Utilizing **${fmt(commandCount)}** commands across **${fmt(shardCount)}** shards on **${fmt(clusterCount)}** clusters`
      )
      .addFields(
        {
          name: 'Bot',
          value: `**Users:** ${fmt(totalUsers)}\n**Servers:** ${fmt(totalServers)}`,
          inline: true,
        },
        {
          name: 'System',
          value: `**Latency:** ${latency}ms\n**Launched:** <t:${launchedTs}:R>`,
          inline: true,
        },
        {
          name: 'Clusters',
          value: `**Online:** ${clustersOnline}/${clusterCount}\n**Restarted:** <t:${restartedTs}:R>`,
          inline: true,
        }
      );

    message.channel.send({ embeds: [embed] });
  },
};