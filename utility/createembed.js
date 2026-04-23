const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { parseEmbed } = require('../utils/embedParser');

module.exports = {
  category: 'utility',
  help: [
    {
      name: 'createembed',
      description: 'Send a custom embed using {embed}$v{key: value} syntax or JSON',
      aliases: 'ce, embed',
      parameters: '(script)',
      information: 'MANAGE_MESSAGES',
      usage: 'createembed (script)',
      example: 'createembed {embed}$v{title: Hello}$v{description: World}$v{color: #5865F2}'
    }
  ],

  name: 'createembed',
  aliases: ['ce', 'embed'],

  run: async (client, message, args) => {
    if (!args[0]) {
      const help = new EmbedBuilder()
        .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
        .setTitle('Command: createembed')
        .setDescription(
          'Create a custom embed.\n\n' +
          '**Variable syntax** (recommended):\n' +
          '```{embed}$v{title: Hello}$v{description: World}$v{color: #CCCCFF}$v{footer: Hi}```\n' +
          '**Supported keys:** `content`, `title`, `description`, `color`, `url`, `thumbnail`, `image`, `author`, `author_url`, `author_icon`, `footer`, `footer_icon`, `timestamp`, `field`\n' +
          '**Field syntax:** `{field: name && value && inline}` (inline = true/false)\n\n' +
          '**JSON syntax** is still supported.'
        )
        .setFooter({ text: 'Module: utility' })
        .setColor(color)
        .setTimestamp();
      return message.channel.send({ embeds: [help] });
    }

    const raw = args.join(' ');

    try {
      let payload;
      const trimmed = raw.trim();
      if (trimmed.startsWith('{embed}') || trimmed.includes('$v')) {
        payload = parseEmbed(raw);
      } else {
        const json = JSON.parse(raw);
        const { text, content: msgContent, ...embedData } = json;
        const embed = new EmbedBuilder();
        if (embedData.title) embed.setTitle(embedData.title);
        if (embedData.description) embed.setDescription(embedData.description);
        if (embedData.color) embed.setColor(embedData.color);
        if (embedData.url) embed.setURL(embedData.url);
        if (embedData.timestamp) embed.setTimestamp(embedData.timestamp === true ? Date.now() : new Date(embedData.timestamp));
        if (embedData.thumbnail) {
          const t = typeof embedData.thumbnail === 'string' ? embedData.thumbnail : embedData.thumbnail?.url;
          if (t) embed.setThumbnail(t);
        }
        if (embedData.image) {
          const i = typeof embedData.image === 'string' ? embedData.image : embedData.image?.url;
          if (i) embed.setImage(i);
        }
        if (embedData.author) embed.setAuthor({ name: embedData.author.name || 'Author', iconURL: embedData.author.icon_url, url: embedData.author.url });
        if (embedData.footer) embed.setFooter({ text: embedData.footer.text || '', iconURL: embedData.footer.icon_url });
        if (Array.isArray(embedData.fields)) {
          embed.addFields(embedData.fields.map((f) => ({ name: f.name || '\u200b', value: f.value || '\u200b', inline: !!f.inline })));
        }
        payload = { content: text || msgContent || undefined, embeds: [embed] };
      }

      if (!payload || (!payload.content && !(payload.embeds && payload.embeds.length))) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Could not parse your embed.`)] });
      }

      await message.channel.send(payload);
    } catch (e) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: ${e.message}`)] });
    }
  },
};
