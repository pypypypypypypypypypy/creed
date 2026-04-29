const { isOwner } = require('../utils/owners');

const STATUS_MAP = {
  online: 'online',
  on: 'online',
  green: 'online',
  idle: 'idle',
  away: 'idle',
  yellow: 'idle',
  dnd: 'dnd',
  donotdisturb: 'dnd',
  red: 'dnd',
  invisible: 'invisible',
  invis: 'invisible',
  offline: 'invisible',
  off: 'invisible',
};

const LABELS = {
  online: '🟢 Online',
  idle: '🟡 Idle',
  dnd: '🔴 Do Not Disturb',
  invisible: '⚫ Invisible',
};

module.exports = {
  category: 'owner',
  help: [
    {
      name: 'status',
      description: "Change the bot's presence status (the bubble)",
      aliases: 'n/a',
      parameters: '(online | idle | dnd | invisible)',
      information: 'BOT_OWNER',
      usage: 'status (status)',
      example: 'status dnd'
    }
  ],

  name: 'status',
  aliases: ['presence', 'setstatus'],

  run: async (client, message, args) => {
    if (!isOwner(message.author.id)) return;

    const input = (args[0] || '').toLowerCase();
    if (!input) {
      return message.channel.send(
        '❌ Usage: `,status [online | idle | dnd | invisible]`'
      );
    }

    const status = STATUS_MAP[input];
    if (!status) {
      return message.channel.send(
        '❌ Valid statuses: `online` `idle` `dnd` `invisible`'
      );
    }

    // Preserve any current activity, only swap the presence bubble.
    const currentActivities = client.user.presence?.activities || [];
    const activitiesPayload = currentActivities.map(a => ({
      name: a.name,
      type: a.type,
      url: a.url,
      state: a.state,
    }));

    await client.user.setPresence({ activities: activitiesPayload, status });
    return message.channel.send(`✅ Status set to **${LABELS[status]}**.`);
  }
};
