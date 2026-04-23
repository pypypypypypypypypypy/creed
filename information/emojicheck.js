const { EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const { color } = require('../config.json');

module.exports = {
  category: 'information',
  help: [
    {
      name: 'emojicheck',
      description: 'Show which emoji IDs the running bot has loaded (debug).',
      aliases: 'ec',
      parameters: 'n/a',
      information: 'Bot Owner',
      usage: 'emojicheck',
      example: 'emojicheck',
    },
  ],

  name: 'emojicheck',
  aliases: ['ec'],

  run: async (client, message, args) => {
    const { owners = [], owner } = require('../config.json');
    const ownerSet = new Set([...(owners || []), owner].filter(Boolean));
    if (!ownerSet.has(message.author.id)) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: this command is restricted to the bot owner.`)],
      });
    }

    const emojisPath = path.join(__dirname, '..', 'emojis.json');
    let raw = {};
    try { raw = JSON.parse(fs.readFileSync(emojisPath, 'utf8')); } catch {}

    const keysOfInterest = [
      'vm_lock', 'vm_unlock', 'vm_ghost', 'vm_reveal', 'vm_claim',
      'vm_disconnect', 'vm_activity', 'vm_info', 'vm_increase', 'vm_decrease',
      'approve', 'deny', 'warn', 'previous', 'next', 'navigate', 'cancel',
    ];

    const lines = keysOfInterest.map(k => {
      const v = raw[k];
      if (!v) return `\`${k}\` → *(missing)*`;
      const m = v.match(/^<a?:([a-zA-Z0-9_]+):(\d+)>$/);
      const id = m ? m[2] : 'n/a';
      return `${v} \`${k}\` → \`${id}\``;
    });

    const stat = fs.statSync(emojisPath);
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('Loaded Emoji IDs')
      .setDescription(lines.join('\n'))
      .setFooter({ text: `emojis.json mtime: ${stat.mtime.toISOString()} | ${Object.keys(raw).length} total keys` });

    return message.channel.send({ embeds: [embed] });
  },
};
