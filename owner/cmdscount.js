const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { isOwner } = require('../utils/owners');
let generatedEntries = [];
try { generatedEntries = require('../generatedCommands/missingCommands.json'); } catch {}

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
    const seenCmds = new Set();
    for (const [, cmd] of client.commands) {
      if (!cmd || !cmd.name || seenCmds.has(cmd.name)) continue;
      seenCmds.add(cmd.name);
      const cat = (cmd.category || 'uncategorized').toLowerCase();
      const entries = (Array.isArray(cmd.help) && cmd.help.length)
        ? cmd.help.map(h => (h?.name || '').trim().toLowerCase()).filter(Boolean)
        : [cmd.name.toLowerCase()];
      for (const fullName of entries) {
        const key = `${cat}:${fullName}`;
        if (seen.has(key)) continue;
        seen.add(key);
        counts[cat] = (counts[cat] || 0) + 1;
        total++;
      }
    }
    for (const entry of generatedEntries) {
      const cat = (entry.category || 'uncategorized').toLowerCase();
      const fullName = (entry.command || (entry.parts || []).join(' ')).toLowerCase().trim();
      if (!fullName) continue;
      const key = `${cat}:${fullName}`;
      if (seen.has(key)) continue;
      seen.add(key);
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
