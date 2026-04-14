const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn, deny } = require('../emojis.json');
const { paginate } = require('../utils/paginate');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'history',
        description: 'View moderation history for a user',
        aliases: 'n/a',
        parameters: '(user)',
        information: 'n/a',
        usage: 'history (user)',
        example: 'history user'
    }
],

    name: 'history',
  aliases: ['modhistory', 'mh'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_messages\``)] });

    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!member)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Usage: \`${prefix}history <member>\``)] });

    const cases = db.get(`cases_${message.guild.id}`) || [];
    const userCases = cases.filter(c => c.userId === member.id);

    if (userCases.length === 0)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: No moderation history found for **${member.user.tag}**.`)] });

    const desc = userCases.map(c =>
      `**Case #${c.id}** — ${c.type}\nModerator: <@${c.moderator}>\nReason: ${c.reason || 'No reason'}\n<t:${Math.floor(c.timestamp / 1000)}:R>`
    ).join('\n\n');

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: `${member.user.tag}'s Moderation History`, iconURL: member.user.displayAvatarURL({ forceStatic: false }) })
      .setDescription(desc)
      .setFooter({ text: `${userCases.length} total case(s)` })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
