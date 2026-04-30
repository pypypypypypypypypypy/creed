const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { color } = require('../config.json');

const FRUIT_KEYS = [
  { key: 'slot_cherry',  name: 'slot_cherry'  },
  { key: 'slot_lemon',   name: 'slot_lemon'   },
  { key: 'slot_orange',  name: 'slot_orange'  },
  { key: 'slot_grape',   name: 'slot_grape'   },
  { key: 'slot_star',    name: 'slot_star'    },
  { key: 'slot_diamond', name: 'slot_diamond' },
];

module.exports = {
  category: 'owner',
  help: [
    {
      name: 'newfruits',
      description: 'Delete old slot fruit emojis and re-upload them at 128x128',
      aliases: 'n/a',
      parameters: 'n/a',
      information: 'Bot owner only',
      usage: 'newfruits',
      example: 'newfruits'
    }
  ],
  name: 'newfruits',

  run: async (client, message, args) => {
    const { canRunOwnerCmd } = require('../utils/owners');
    if (!canRunOwnerCmd(message.author.id, 'newfruits') && !message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#e74c3c').setDescription('❌ Only the bot owner can use this command.')]
      });
    }

    if (!client.application?.emojis) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#e74c3c').setDescription('❌ Application emojis not supported. Update discord.js to v14.16+.')]
      });
    }

    const statusMsg = await message.channel.send({
      embeds: [new EmbedBuilder().setColor(color).setDescription('**Step 1/3:** Removing old slot fruit emojis...')]
    });

    // Delete existing fruit emojis
    try {
      const existing = await client.application.emojis.fetch();
      const fruitNames = FRUIT_KEYS.map(f => f.name);
      const toDelete = existing.filter(e => fruitNames.includes(e.name));
      for (const [, e] of toDelete) {
        await e.delete().catch(() => {});
      }
    } catch (e) {
      return statusMsg.edit({
        embeds: [new EmbedBuilder().setColor('#e74c3c').setDescription(`❌ Failed to remove old emojis: \`${e.message}\``)]
      });
    }

    await statusMsg.edit({
      embeds: [new EmbedBuilder().setColor(color).setDescription('**Step 2/3:** Uploading fresh 128x128 fruit emojis...')]
    });

    const emojiPath = path.join(__dirname, '..', 'emojis.json');
    const updatedEmojis = JSON.parse(fs.readFileSync(emojiPath, 'utf8'));
    const results = [];

    for (const { key, name } of FRUIT_KEYS) {
      // Look for the 128x128 PNG in local folders
      const localPaths = [
        path.join(__dirname, '..', 'emojis', `${key}.png`),
        path.join(__dirname, '..', 'emojis_processed', `${key}.png`),
        path.join(__dirname, '..', 'assets', 'emojis', `${key}.png`),
      ];
      const localPath = localPaths.find(p => fs.existsSync(p));

      if (!localPath) {
        results.push(`❌ \`${name}\` — local PNG not found`);
        continue;
      }

      const attachment = fs.readFileSync(localPath);

      try {
        const uploaded = await client.application.emojis.create({ attachment, name });
        const tag = `<:${uploaded.name}:${uploaded.id}>`;
        updatedEmojis[key] = tag;
        if (!global.botEmojis) global.botEmojis = {};
        global.botEmojis[key] = tag;
        results.push(`✅ \`${name}\` — uploaded`);
      } catch (e) {
        results.push(`❌ \`${name}\` — ${e.message}`);
      }
    }

    // Save emojis.json
    fs.writeFileSync(emojiPath, JSON.stringify(updatedEmojis, null, 2));
    delete require.cache[require.resolve('../emojis.json')];

    await statusMsg.edit({
      embeds: [new EmbedBuilder().setColor(color).setDescription('**Step 3/3:** Saving updated emoji IDs...')]
    });

    const success = results.filter(r => r.startsWith('✅')).length;

    await statusMsg.edit({
      embeds: [
        new EmbedBuilder()
          .setColor('#FFFFFF')
          .setTitle(`🍒 New Fruits — ${success}/${FRUIT_KEYS.length} uploaded`)
          .setDescription(results.join('\n'))
          .setFooter({ text: 'Slot machine will now use the fresh 128x128 fruit emojis' })
      ]
    });
  }
};
