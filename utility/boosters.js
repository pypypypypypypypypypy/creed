const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'boosters',
        description: 'View all current server boosters',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'boosters',
        example: 'boosters'
    }
],

    name: 'boosters',

  run: async (client, message, args) => {
    await message.guild.members.fetch().catch(() => {});

    const boosters = message.guild.members.cache
      .filter(m => m.premiumSince)
      .sort((a, b) => a.premiumSinceTimestamp - b.premiumSinceTimestamp);

    if (!boosters.size) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription('No one is currently boosting this server.')] });
    }

    const list = boosters.map(m => `${m.user.tag} — since <t:${Math.floor(m.premiumSinceTimestamp / 1000)}:R>`).join('\n');
    const embed = new EmbedBuilder()
      .setColor('#FFFFFF')
      .setTitle(`🚀 Server Boosters (${boosters.size})`)
      .setDescription(list.slice(0, 2048))
      .setFooter({ text: `Boost Tier: ${message.guild.premiumTier}` })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
