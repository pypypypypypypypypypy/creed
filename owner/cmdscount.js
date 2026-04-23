const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { isOwner } = require('../utils/owners');

module.exports = {
  category: 'owner',
  help: [
    {
      name: 'cmdscount',
      description: 'Show how many commands are loaded per category.',
      aliases: 'countcmds, cmdcount',
      parameters: 'n/a',
      information: 'BOT_OWNER',
      usage: 'cmdscount',
      example: 'cmdscount',
    },
  ],

  name: 'cmdscount',
  aliases: ['countcmds', 'cmdcount'],
  category: 'owner',

  run: async (client, message) => {
    if (!isOwner(message.author.id)) return;

    const counts = {};
    let total = 0;
    const seen = new Set();
    for (const [, cmd] of client.commands) {
      if (!cmd || !cmd.name || seen.has(cmd.name)) continue;
      seen.add(cmd.name);
      const cat = (cmd.category || 'uncategorized').toLowerCase();
      counts[cat] = (counts[cat] || 0) + 1;
      total++;
    }

    const cats = Object.keys(counts).sort();
    const pad = Math.max(...cats.map(c => c.length));
    const lines = cats.map(c => `\`${c.padEnd(pad)}\` — **${counts[c]}**`);

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('Command Counts')
      .setDescription(lines.join('\n') || '*(no commands loaded)*')
      .setFooter({ text: `${total} commands across ${cats.length} categories` });

    return message.channel.send({ embeds: [embed] });
  },
};
