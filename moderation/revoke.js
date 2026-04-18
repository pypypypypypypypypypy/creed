const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn, deny, approve } = require('../emojis.json');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'revoke',
        description: 'Revoke a specific invite',
        aliases: 'n/a',
        parameters: '(invite code)',
        information: 'MANAGE_GUILD',
        usage: 'revoke (invite code)',
        example: 'revoke invite code'
    }
],

    name: 'revoke',
  aliases: [],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_messages\``)] });

    if (!args[0])
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Usage: \`${prefix}revoke <case_id>\``)] });

    const caseId = args[0];
    let cases = db.get(`cases_${message.guild.id}`) || [];
    const idx = cases.findIndex(c => String(c.id) === String(caseId));

    if (idx === -1)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: Case **#${caseId}** not found.`)] });

    const modCase = cases[idx];
    cases.splice(idx, 1);
    db.set(`cases_${message.guild.id}`, cases);

    message.channel.send({
      embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Revoked case **#${caseId}** (${modCase.type} — ${modCase.user || 'Unknown'})`)]
    });
  }
};
