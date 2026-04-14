const { PermissionFlagsBits } = require('discord.js');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'unlock',
        description: 'Unlock a previously locked channel',
        aliases: 'n/a',
        parameters: '[channel]',
        information: 'MANAGE_CHANNELS',
        usage: 'unlock [channel]',
        example: 'unlock channel'
    }
],

    name: 'unlock',
  aliases: ['unlockdown'],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return;
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) return;

    const channel = message.mentions.channels.first() || message.channel;

    const everyone = message.guild.roles.everyone;
    const overwrite = channel.permissionOverwrites.cache.get(everyone.id);
    if (!overwrite || !overwrite.deny.has(PermissionFlagsBits.SendMessages)) return;

    await channel.permissionOverwrites.edit(everyone, { SendMessages: null });
    message.react('🔓').catch(() => {});
  }
};
