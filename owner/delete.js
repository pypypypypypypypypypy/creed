const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { owners, color } = require('../config.json');

module.exports = {
  name: 'delete',
  category: 'owner',
  aliases: [],
  help: [
    {
      name: 'delete channels',
      description: 'Deletes every channel in the server',
      aliases: 'n/a',
      parameters: 'channels',
      information: 'BOT_OWNER',
      usage: 'delete channels',
      example: 'delete channels'
    }
  ],

  run: async (client, message, args) => {
    if (!owners.includes(message.author.id)) return;

    const sub = args[0];

    if (sub === 'channels') {
      if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription('I am missing the **Manage Channels** permission.')]
        });
      }

      const channels = message.guild.channels.cache;
      let deleted = 0;
      let failed = 0;

      for (const [, channel] of channels) {
        try {
          await channel.delete('delete channels command');
          deleted++;
        } catch {
          failed++;
        }
      }

      return;
    }
  }
};
