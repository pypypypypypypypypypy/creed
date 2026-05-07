const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { color } = require('../config.json');
const { canRunOwnerCmd } = require('../utils/owners');

function getEmojis() {
  try { delete require.cache[require.resolve('../emojis.json')]; return require('../emojis.json'); } catch { return {}; }
}

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
    if (!canRunOwnerCmd(message.author.id, 'delete')) return;

    const sub = args[0];

    if (sub === 'channels') {
      if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
        const e = getEmojis();
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${e.warn} ${message.author}: I'm **missing** permission: \`manage_channels\``)]
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
