const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'case',
        description: 'View a specific moderation case',
        aliases: 'n/a',
        parameters: '(case number)',
        information: 'n/a',
        usage: 'case (case number)',
        example: 'case case number'
    }
],

    name: 'case',

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`moderate_members\``)] });

    const caseId = parseInt(args[0]);
    if (isNaN(caseId)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}case <id>\``)] });

    const cases = db.get(`cases_${message.guild.id}`) || [];
    const c = cases[caseId - 1];
    if (!c) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Case **#${caseId}** not found.`)] });

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`Case #${caseId}`)
      .addFields(
        { name: 'Type', value: c.type, inline: true },
        { name: 'User', value: `<@${c.userId}> (\`${c.userId}\`)`, inline: true },
        { name: 'Moderator', value: `<@${c.moderatorId}>`, inline: true },
        { name: 'Reason', value: c.reason, inline: false },
        { name: 'Date', value: `<t:${Math.floor(c.timestamp / 1000)}:F>`, inline: false }
      )
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
