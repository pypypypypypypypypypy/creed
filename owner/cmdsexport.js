const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');
const { color } = require('../config.json');
const { isOwner } = require('../utils/owners');

module.exports = {
  category: 'owner',
  help: [
    {
      name: 'cmdsexport',
      description: 'Export the full command list grouped by category to a text file.',
      aliases: 'exportcmds, dumpcmds',
      parameters: 'n/a',
      information: 'BOT_OWNER',
      usage: 'cmdsexport',
      example: 'cmdsexport',
    },
  ],

  name: 'cmdsexport',
  aliases: ['exportcmds', 'dumpcmds'],
  category: 'owner',

  run: async (client, message) => {
    if (!isOwner(message.author.id)) return;

    const root = path.join(__dirname, '..');
    const skipDirs = new Set(['node_modules', '.git', 'utils', 'events', 'data', 'assets', 'scripts', 'handlers']);

    const files = globSync(`${root}/**/*.js`, { ignore: '**/node_modules/**' });
    const byCategory = {};
    const seen = new Set();
    let total = 0;

    const push = (cat, label) => {
      const key = `${cat}:${label.toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(label);
      total++;
    };

    for (const file of files) {
      const rel = path.relative(root, file);
      const top = rel.split(path.sep)[0];
      if (skipDirs.has(top) || rel.includes(path.sep) === false) continue;

      let mod;
      try { mod = require(file); } catch { continue; }
      if (!mod || !mod.name) continue;

      const cat = (mod.category || top || 'uncategorized').toLowerCase();
      const aliases = Array.isArray(mod.aliases) && mod.aliases.length ? ` [${mod.aliases.join(', ')}]` : '';
      if (Array.isArray(mod.help) && mod.help.length) {
        for (const h of mod.help) {
          if (!h?.name) continue;
          const isRoot = h.name.trim().toLowerCase() === mod.name.toLowerCase();
          push(cat, `${h.name}${isRoot ? aliases : ''}`);
        }
      } else {
        push(cat, `${mod.name}${aliases}`);
      }
    }

    let generatedEntries = [];
    try { generatedEntries = require('../generatedCommands/missingCommands.json'); } catch {}
    for (const entry of generatedEntries) {
      const cat = (entry.category || 'uncategorized').toLowerCase();
      const label = (entry.command || (entry.parts || []).join(' ')).trim();
      if (label) push(cat, label);
    }

    const lines = [];
    lines.push(`bored — command export`);
    lines.push(`generated: ${new Date().toISOString()}`);
    lines.push(`total commands: ${total}`);
    lines.push(`categories: ${Object.keys(byCategory).length}`);
    lines.push('');
    for (const cat of Object.keys(byCategory).sort()) {
      const cmds = byCategory[cat].sort((a, b) => a.localeCompare(b));
      lines.push(`[${cat}] (${cmds.length})`);
      for (const c of cmds) lines.push(`  - ${c}`);
      lines.push('');
    }

    const buf = Buffer.from(lines.join('\n'), 'utf8');
    const file = new AttachmentBuilder(buf, { name: `bored-commands-${Date.now()}.txt` });

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('Command Export')
      .setDescription(`Exported **${total}** commands across **${Object.keys(byCategory).length}** categories.`);

    return message.channel.send({ embeds: [embed], files: [file] });
  },
};
