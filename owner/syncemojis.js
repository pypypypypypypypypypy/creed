const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { color } = require('../config.json');
const { canRunOwnerCmd } = require('../utils/owners');

module.exports = {
  category: 'owner',
  help: [
    {
      name: 'syncemojis',
      description: 'Sync emojis across guilds',
      aliases: 'n/a',
      parameters: 'n/a',
      information: 'BOT_OWNER',
      usage: 'syncemojis',
      example: 'syncemojis',
    },
  ],

  name: 'syncemojis',
  aliases: ['syncvm'],

  run: async (client, message, args) => {
    if (!canRunOwnerCmd(message.author.id, 'syncemojis')) return;

    const guildEmojis = await message.guild.emojis.fetch();

    const targets = [
      'vm_lock', 'vm_unlock', 'vm_ghost', 'vm_reveal', 'vm_claim',
      'vm_disconnect', 'vm_activity', 'vm_info', 'vm_increase', 'vm_decrease',
    ];

    const emojiPath = path.join(__dirname, '..', 'emojis.json');
    const current = JSON.parse(fs.readFileSync(emojiPath, 'utf8'));

    const results = [];
    let found = 0;

    for (const name of targets) {
      const match = guildEmojis.find(e => e.name === name);
      if (match) {
        current[name] = `<:${match.name}:${match.id}>`;
        results.push(`✅ \`${name}\` → \`${match.id}\``);
        found++;
      } else {
        results.push(`❌ \`${name}\` — not found in this server`);
      }
    }

    fs.writeFileSync(emojiPath, JSON.stringify(current, null, 2));
    delete require.cache[require.resolve('../emojis.json')];

    await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(color)
          .setTitle('Emoji Sync')
          .setDescription(results.join('\n'))
          .setFooter({ text: `${found}/10 emojis synced — restart the bot to apply` }),
      ],
    });
  },
};
