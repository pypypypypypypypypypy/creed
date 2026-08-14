const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { approve } = require('../emojis.json');
const { canRunOwnerCmd } = require('../utils/owners');

module.exports = {
  name: 'restart',
  aliases: ['reboot'],
  category: 'owner',
  help: [{
    name: 'restart',
    description: 'Gracefully restart the bot process',
    aliases: 'reboot',
    parameters: 'n/a',
    information: 'BOT_OWNER',
    usage: 'restart',
    example: 'restart',
  }],

  run: async (client, message) => {
    if (!canRunOwnerCmd(message.author.id, 'restart')) return;

    const confirmation = `${approve} Restarting the bot now. It should be back online shortly.`;
    try {
      await message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(color)
            .setDescription(confirmation),
        ],
      });
    } catch {
      // Fall back to plain content if the bot lacks Embed Links permission.
      await message.channel.send({ content: confirmation });
    }

    // index.js handles SIGTERM by flushing the database/backup before exiting.
    // Railway's ALWAYS restart policy then starts the bot again.
    setTimeout(() => {
      try { process.kill(process.pid, 'SIGTERM'); }
      catch { process.exit(0); }
    }, 750);
  },
};
