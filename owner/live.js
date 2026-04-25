const { ActivityType } = require('discord.js');
const { isOwner } = require('../utils/owners');

let isLive = false;

module.exports = {
  name: 'live',
  aliases: ['golive'],
  category: 'owner',
  help: [
    {
      name: 'live',
      description: "Toggle the bot's streaming presence (purple ring + Live indicator)",
      aliases: 'golive',
      parameters: 'n/a',
      information: 'BOT_OWNER',
      usage: 'live',
      example: 'live',
    },
  ],

  run: async (client, message, args) => {
    if (!isOwner(message.author.id)) return;

    if (isLive) {
      isLive = false;
      await client.user.setPresence({ activities: [], status: 'online' });
      return message.channel.send('📴 Stream ended.');
    }

    isLive = true;
    await client.user.setPresence({
      status: 'online',
      activities: [
        {
          name: 'Bored',
          type: ActivityType.Streaming,
          url: 'https://www.twitch.tv/discord',
        },
      ],
    });

    return message.channel.send('🟣 Now live — streaming **Bored**.');
  },
};
