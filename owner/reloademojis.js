const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const { color } = require('../config.json');
const { isOwner } = require('../utils/owners');

module.exports = {
  category: 'owner',
  help: [
    {
      name: 'reloademojis',
      description: 'Hot-reload emojis.json and re-require all commands so new emoji IDs take effect without restart.',
      aliases: 're',
      parameters: 'n/a',
      information: 'BOT_OWNER',
      usage: 'reloademojis',
      example: 'reloademojis',
    },
  ],

  name: 'reloademojis',
  aliases: ['re', 'remojis'],
  category: 'owner',

  run: async (client, message, args) => {
    if (!isOwner(message.author.id)) return;

    const emojisPath = path.join(__dirname, '..', 'emojis.json');
    let raw = {};
    try {
      raw = JSON.parse(fs.readFileSync(emojisPath, 'utf8'));
    } catch (e) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: failed to read \`emojis.json\` — ${e.message}`)],
      });
    }

    delete require.cache[require.resolve(emojisPath)];

    let reloaded = 0;
    let failed = 0;
    await new Promise((resolve) => {
      glob(`${path.join(__dirname, '..')}/**/*.js`, { ignore: '**/node_modules/**' }, (err, files) => {
        if (err) return resolve();
        client.commands.sweep(() => true);
        if (client.aliases) client.aliases.sweep(() => true);
        for (const file of files) {
          try {
            delete require.cache[require.resolve(file)];
            const mod = require(file);
            if (mod && mod.name) {
              client.commands.set(mod.name, mod);
              reloaded++;
              if (Array.isArray(mod.aliases) && client.aliases) {
                for (const a of mod.aliases) client.aliases.set(a, mod.name);
              }
            }
          } catch (e) {
            failed++;
          }
        }
        resolve();
      });
    });

    const stat = fs.statSync(emojisPath);
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('Emojis Reloaded')
      .setDescription(
        [
          `Reloaded \`emojis.json\` (${Object.keys(raw).length} keys)`,
          `Re-required ${reloaded} commands${failed ? ` (${failed} failed)` : ''}`,
          '',
          `**vm_lock:** ${raw.vm_lock || '*(missing)*'}`,
          `**vm_unlock:** ${raw.vm_unlock || '*(missing)*'}`,
          `**vm_ghost:** ${raw.vm_ghost || '*(missing)*'}`,
          `**vm_claim:** ${raw.vm_claim || '*(missing)*'}`,
        ].join('\n'),
      )
      .setFooter({ text: `mtime: ${stat.mtime.toISOString()}` });

    return message.channel.send({ embeds: [embed] });
  },
};
