const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'serverstats',
        description: 'View detailed server statistics',
        aliases: 'sstats',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'serverstats',
        example: 'serverstats'
    }
],

    name: 'serverstats',
  aliases: ['sstats'],

  run: async (client, message, args) => {
    const guild = message.guild;
    await guild.members.fetch().catch(() => {});

    const total = guild.memberCount;
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humans = total - bots;
    const online = guild.members.cache.filter(m => m.presence?.status && m.presence.status !== 'offline').size;
    const channels = guild.channels.cache.size;
    const roles = guild.roles.cache.size - 1;
    const emojis = guild.emojis.cache.size;
    const boosters = guild.premiumSubscriptionCount || 0;
    const boostTier = guild.premiumTier;
    const verif = guild.verificationLevel;
    const createdAt = Math.floor(guild.createdTimestamp / 1000);

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${guild.name} — Server Stats`)
      .setThumbnail(guild.iconURL({ forceStatic: false }))
      .addFields(
        { name: '👥 Members', value: `Total: **${total}**\nHumans: **${humans}** | Bots: **${bots}**`, inline: true },
        { name: '🟢 Online', value: `**${online}**`, inline: true },
        { name: '📢 Channels', value: `**${channels}**`, inline: true },
        { name: '🏷️ Roles', value: `**${roles}**`, inline: true },
        { name: '😄 Emojis', value: `**${emojis}**`, inline: true },
        { name: '🚀 Boosts', value: `**${boosters}** (Tier ${boostTier})`, inline: true },
        { name: '🔒 Verification', value: `**${verif}**`, inline: true },
        { name: '📅 Created', value: `<t:${createdAt}:R>`, inline: true }
      )
      .setFooter({ text: `ID: ${guild.id}` })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
