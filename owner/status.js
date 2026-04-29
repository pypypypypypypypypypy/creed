const { ActivityType } = require('discord.js');
const { canRunOwnerCmd } = require('../utils/owners');

module.exports = {
  category: 'owner',
  help: [
    {
      name: 'status',
      description: "Set the bot's custom status (the text shown under its name on its profile).",
      aliases: 'n/a',
      parameters: '(text)  |  clear',
      information: 'BOT_OWNER',
      usage: 'status (text) | status clear',
      example: 'status Hit a high score in...'
    }
  ],

  name: 'status',
  aliases: ['setstatus', 'customstatus'],

  run: async (client, message, args) => {
    if (!canRunOwnerCmd(message.author.id, 'status')) return;

    if (!args.length) {
      return message.channel.send(
        '❌ Usage: `,status <text>`  •  `,status clear` to remove'
      );
    }

    const presenceStatus = client.user.presence?.status || 'online';

    const first = args[0].toLowerCase();
    if (first === 'clear' || first === 'off' || first === 'none' || first === 'remove') {
      await client.user.setPresence({ activities: [], status: presenceStatus });
      return message.channel.send('✅ Custom status **cleared**.');
    }

    const text = args.join(' ').slice(0, 128);

    await client.user.setPresence({
      activities: [{ name: 'Custom Status', type: ActivityType.Custom, state: text }],
      status: presenceStatus,
    });

    return message.channel.send(`✅ Custom status set to: **${text}**`);
  }
};
