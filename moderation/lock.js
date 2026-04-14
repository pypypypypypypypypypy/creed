const { PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'lock',
        description: 'Lock a channel to prevent messages',
        aliases: 'n/a',
        parameters: '[channel]',
        information: 'MANAGE_CHANNELS',
        usage: 'lock [channel]',
        example: 'lock channel'
    }
],

    name: 'lock',

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return;

    const channel = message.mentions.channels.first() || message.channel;
    const everyoneRole = message.guild.roles.everyone;

    await channel.permissionOverwrites.edit(everyoneRole, { SendMessages: false });
    message.react('🔒').catch(() => {});
  }
};
