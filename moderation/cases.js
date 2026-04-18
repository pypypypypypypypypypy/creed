const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'cases',
        description: 'View all moderation cases for a user',
        aliases: 'n/a',
        parameters: '(user)',
        information: 'n/a',
        usage: 'cases (user)',
        example: 'cases user'
    }
],

    name: 'cases',

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`moderate_members\``)] });

    if (!args[0]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}cases <member>\``)] });

    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!member) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Member not found.`)] });

    const cases = db.get(`cases_${message.guild.id}`) || [];
    const userCases = cases.filter(c => c.userId === member.id);

    if (!userCases.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`**${member.user.tag}** has no moderation cases.`)] });

    const lines = userCases.map((c, i) => {
      const globalIdx = cases.indexOf(c) + 1;
      return `**Case #${globalIdx}** — \`${c.type}\` | ${c.reason} | <t:${Math.floor(c.timestamp / 1000)}:R>`;
    });

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`Cases for ${member.user.tag}`)
      .setDescription(lines.join('\n').slice(0, 2048))
      .setFooter({ text: `Total: ${userCases.length} case(s)` })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
