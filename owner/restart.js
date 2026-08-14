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

    // Use plain content so the confirmation still works without Embed Links permission.
    await message.channel.send({
      content: `${approve} Restarting the bot now. It should be back online shortly.`,
    });

    // index.js handles SIGTERM by flushing the database/backup before exiting.
    // Railway's ALWAYS restart policy then starts the bot again.
    setTimeout(() => {
      try { process.kill(process.pid, 'SIGTERM'); }
      catch { process.exit(0); }
    }, 750);
  },
};
