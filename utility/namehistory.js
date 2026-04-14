const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn, deny } = require('../emojis.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'namehistory',
        description: 'View name history for a user',
        aliases: 'names, nh',
        parameters: '[user]',
        information: 'n/a',
        usage: 'namehistory [user]',
        example: 'namehistory user'
    }
],

    name: 'namehistory',
  aliases: ['names', 'nh'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]) || message.member;
    const history = db.get(`namehistory_${member.id}`) || [];

    if (history.length === 0)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: No name history found for **${member.user.tag}**.`)] });

    const desc = history.slice(-20).reverse().map((entry, i) => {
      const time = entry.timestamp ? `<t:${Math.floor(entry.timestamp / 1000)}:R>` : 'Unknown';
      return `**${i + 1}.** ${entry.name} — ${time}`;
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: `${member.user.tag}'s Name History`, iconURL: member.user.displayAvatarURL({ forceStatic: false }) })
      .setDescription(desc)
      .setFooter({ text: `${history.length} total entries` })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
