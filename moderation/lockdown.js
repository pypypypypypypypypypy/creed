const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn } = require('../emojis.json');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'lockdown',
        description: 'Lock all channels in the server',
        aliases: 'n/a',
        parameters: '[reason]',
        information: 'MANAGE_CHANNELS',
        usage: 'lockdown [reason]',
        example: 'lockdown reason'
    }
],

    name: 'lockdown',
  aliases: ['lock'],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_channels\``)] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`manage_channels\``)] });

    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    const channel = message.mentions.channels.first() || message.channel;

    const everyone = message.guild.roles.everyone;
    const overwrite = channel.permissionOverwrites.cache.get(everyone.id);
    if (overwrite && overwrite.deny.has(PermissionFlagsBits.SendMessages)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: ${channel} is already locked!`)] });
    }

    await channel.permissionOverwrites.edit(everyone, { SendMessages: false });

    message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`:lock: ${message.author}: ${channel} locked. Use \`${prefix}unlock\` to remove this lockdown`)] });
  }
};
