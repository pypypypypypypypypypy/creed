const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { color } = require('../config.json');
const { canRunOwnerCmd } = require('../utils/owners');

module.exports = {
  category: 'owner',
  help: [
    {
      name: 'cmdsdiff',
      description: 'Compare a pasted list of command names against the bot and report which ones are missing.',
      aliases: 'diffcmds, missingcmds',
      parameters: 'list',
      information: 'BOT_OWNER',
      usage: 'cmdsdiff <names separated by spaces, commas, or newlines>',
      example: 'cmdsdiff ban kick warn antinuke voicemaster',
    },
  ],

  name: 'cmdsdiff',
  aliases: ['diffcmds', 'missingcmds'],
  category: 'owner',

  run: async (client, message, args) => {
    if (!canRunOwnerCmd(message.author.id, 'cmdsdiff')) return;

    let raw = args.join(' ').trim();
    if (!raw && message.reference) {
      try {
        const ref = await message.channel.messages.fetch(message.reference.messageId);
        raw = ref.content || '';
      } catch {}
    }
    if (!raw) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: paste a list of command names (or reply to a message containing them).`)],
      });
    }

    const names = [...new Set(
      raw
        .toLowerCase()
        .split(/[\s,;|\n\r\t]+/)
        .map(s => s.replace(/^[`'"\[(<,]+|[`'"\])>,.]+$/g, '').replace(/^,+/, '').trim())
        .filter(Boolean),
    )];

    const have = new Set();
    for (const [, cmd] of client.commands) {
      if (cmd.name) have.add(cmd.name.toLowerCase());
      if (Array.isArray(cmd.aliases)) for (const a of cmd.aliases) have.add(String(a).toLowerCase());
    }
    if (client.aliases) for (const k of client.aliases.keys()) have.add(String(k).toLowerCase());

    const missing = names.filter(n => !have.has(n));
    const present = names.filter(n => have.has(n));

    const desc = [
      `Compared **${names.length}** names`,
      `Have: **${present.length}**`,
      `Missing: **${missing.length}**`,
    ].join('\n');

    const embed = new EmbedBuilder().setColor(color).setTitle('Command Diff').setDescription(desc);

    const missingText = missing.join(', ');
    if (missing.length && missingText.length <= 1024) {
      embed.addFields({ name: `Missing (${missing.length})`, value: missingText || '*(none)*' });
      return message.channel.send({ embeds: [embed] });
    }

    if (!missing.length) return message.channel.send({ embeds: [embed] });

    const buf = Buffer.from(missing.join('\n'), 'utf8');
    const file = new AttachmentBuilder(buf, { name: `missing-commands-${Date.now()}.txt` });
    return message.channel.send({ embeds: [embed], files: [file] });
  },
};
