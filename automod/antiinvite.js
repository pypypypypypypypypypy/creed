const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'automod',
  help: [
    {
        name: 'antiinvite',
        description: 'Toggle anti-invite link protection',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'antiinvite',
        example: 'antiinvite'
    }
],

    name: 'antiinvite',

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
    }

    const sub = args[0]?.toLowerCase();
    const guildId = message.guild.id;

    if (!sub || !['toggle', 'enable', 'disable'].includes(sub)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Usage: \`${prefix}antiinvite toggle\``)] });
    }

    const current = db.get(`automod.${guildId}.antiinvite`) ?? false;
    let newVal;
    if (sub === 'toggle') newVal = !current;
    else if (sub === 'enable') newVal = true;
    else newVal = false;

    db.set(`automod.${guildId}.antiinvite`, newVal);
    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Anti-invite has been **${newVal ? 'enabled' : 'disabled'}**.`)] });
  }
};
