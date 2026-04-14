const { ActivityType } = require('discord.js');
const { isOwner } = require('../utils/owners');

const ACTIVITY_MAP = {
  playing: ActivityType.Playing,
  watching: ActivityType.Watching,
  listening: ActivityType.Listening,
  competing: ActivityType.Competing,
  streaming: ActivityType.Streaming,
};

const LABELS = {
  playing: 'Playing',
  watching: 'Watching',
  listening: 'Listening to',
  competing: 'Competing in',
  streaming: 'Streaming',
};

module.exports = {
  category: 'owner',
  help: [
    {
        name: 'status',
        description: "Change the bot's status or activity",
        aliases: 'n/a',
        parameters: '(status)',
        information: 'BOT_OWNER',
        usage: 'status (status)',
        example: 'status status'
    }
],

    name: 'status',
  aliases: ['activity', 'setstatus'],
  category: 'owner',

  run: async (client, message, args) => {
    if (!isOwner(message.author.id)) return;

    const type = (args.shift() || '').toLowerCase();

    if (!type || type === 'clear') {
      client.user.setPresence({ activities: [], status: 'online' });
      return message.channel.send('✅ Activity cleared.');
    }

    if (!ACTIVITY_MAP[type]) {
      return message.channel.send('❌ Types: `playing` `watching` `listening` `competing` `streaming` `clear`');
    }

    const text = args.join(' ');
    if (!text) return message.channel.send('❌ Example: `,status playing drown`');

    client.user.setPresence({ activities: [{ name: text, type: ACTIVITY_MAP[type] }], status: 'online' });
    return message.channel.send(`✅ Status set to **${LABELS[type]} ${text}**.`);
  }
};
