const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn, deny, approve } = require('../emojis.json');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'reason',
        description: 'Update the reason for a moderation case',
        aliases: 'n/a',
        parameters: '(case id) (reason)',
        information: 'MANAGE_GUILD',
        usage: 'reason (case id) (reason)',
        example: 'reason case id'
    }
],

    name: 'reason',
  aliases: [],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_messages\``)] });

    if (!args[0] || !args[1])
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Usage: \`${prefix}reason <case_id> <new reason>\``)] });

    const caseId = args[0];
    const newReason = args.slice(1).join(' ');

    const cases = db.get(`cases_${message.guild.id}`) || [];
    const modCase = cases.find(c => String(c.id) === String(caseId));

    if (!modCase)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: Case **#${caseId}** not found.`)] });

    modCase.reason = newReason;
    db.set(`cases_${message.guild.id}`, cases);

    message.channel.send({
      embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Updated reason for case **#${caseId}** to: ${newReason}`)]
    });
  }
};
