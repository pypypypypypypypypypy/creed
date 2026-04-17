const { ActivityType } = require('discord.js');
const { isOwner } = require('../utils/owners');

module.exports = {
  name: 'live',
  aliases: ['golive', 'stream'],
  category: 'owner',
  help: [
    {
      name: 'live',
      description: "Toggle the bot's streaming presence (purple ring + Live indicator)",
      aliases: 'golive, stream',
      parameters: 'n/a',
      information: 'BOT_OWNER',
      usage: 'live',
      example: 'live',
    },
  ],

  run: async (client, message, args) => {
    if (!isOwner(message.author.id)) return;

    const current = client.user.presence?.activities?.[0];
    const isStreaming = current?.type === ActivityType.Streaming;

    if (isStreaming) {
      client.user.setPresence({ activities: [], status: 'online' });
      return message.channel.send('📴 Stream ended. Bot is back to normal.');
    }

    client.user.setPresence({
      status: 'online',
      activities: [
        {
          name: 'Drown',
          type: ActivityType.Streaming,
          url: 'https://www.twitch.tv/discord',
        },
      ],
    });

    return message.channel.send('🟣 Now streaming **Drown** — bot is live with a purple ring.');
  },
};
