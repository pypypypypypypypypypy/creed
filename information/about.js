const { EmbedBuilder, PermissionsBitField } = require('discord.js');
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
  aliases: ['bleed', 'botinfo', 'bi', 'bot'],

  run: async (client, message, args) => {
    const totalUsers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
    const totalServers = client.guilds.cache.size;
    const latency = client.ws.ping;

    const launchedTs = Math.floor((Date.now() - client.uptime) / 1000);

    const inviteURL = client.generateInvite({
      scopes: ['bot', 'applications.commands'],
      permissions: [PermissionsBitField.Flags.Administrator],
    });

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({
        name: client.user.username,
        iconURL: client.user.displayAvatarURL(),
      })
      .setThumbnail(client.user.displayAvatarURL())
      .setURL(inviteURL)
      .setTitle('invite')
      .setDescription(`<:uptime:1496708571109396591> <t:${launchedTs}:R>`)
      .addFields(
        {
          name: '__**Client**__',
          value: `**Latency:** ${latency}\n**Guilds:** ${fmt(totalServers)}`,
          inline: false,
        },
        {
          name: '__**Statistics**__',
          value: `**Users:** ${fmt(totalUsers)}`,
          inline: false,
        }
      );

    message.channel.send({ embeds: [embed] });
  },
};
