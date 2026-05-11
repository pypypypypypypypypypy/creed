const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { parseEmbed, buildVars } = require('../utils/embedParser');

const VAR_LIST = [
  ['**User**', [
    '{user}', '{user.mention}', '{user.name}', '{user.username}', '{user.tag}',
    '{user.id}', '{user.avatar}', '{user.banner}', '{user.created_at}', '{user.created_at.ago}', '{user.discriminator}', '{user.bot}',
  ]],
  ['**Member**', [
    '{member}', '{member.nickname}', '{member.display_name}', '{member.avatar}',
    '{member.joined_at}', '{member.joined_at.ago}', '{member.top_role}', '{member.top_role.name}',
    '{member.roles}', '{member.role_count}', '{member.boosting}', '{member.boost_since}',
  ]],
  ['**Guild**', [
    '{guild}', '{guild.name}', '{guild.id}', '{guild.icon}', '{guild.banner}',
    '{guild.count}', '{membercount}', '{membercount.ordinal}', '{guild.owner}',
    '{guild.boost_count}', '{guild.boost_tier}', '{guild.created_at}', '{guild.vanity}', '{guild.description}',
  ]],
  ['**Channel**', [
    '{channel}', '{channel.name}', '{channel.id}', '{channel.topic}', '{channel.created_at}',
  ]],
  ['**Misc**', ['{unix}', '{date}', '{time}']],
];

module.exports = {
  category: 'utility',
  help: [
    {
      name: 'createembed',
      description: 'Send a custom embed using {embed}$v{key: value} syntax with live variables',
      aliases: 'ce',
      parameters: '(script)',
      information: 'MANAGE_MESSAGES',
      usage: 'createembed (script)',
      example: 'createembed {embed}$v{title: Welcome {user.name}!}$v{description: You joined {guild.name}}$v{color: #5865F2}$v{thumbnail: {user.avatar}}'
    },
    {
      name: 'createembed variables',
      description: 'Show all available embed variables',
      aliases: 'vars',
      parameters: 'n/a',
      information: 'n/a',
      usage: 'createembed variables',
      example: 'createembed variables'
    }
  ],

  name: 'createembed',
  aliases: ['ce'],

  run: async (client, message, args) => {
    const sub = (args[0] || '').toLowerCase();

    if (sub === 'variables' || sub === 'vars') {
      const lines = VAR_LIST.map(([section, vars]) => `${section}\n${vars.map(v => `\`${v}\``).join(' ')}`).join('\n\n');
      return message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor(color)
          .setTitle('Embed Variables')
          .setDescription(lines)
          .setFooter({ text: 'Use these inside any embed script' })
          .setTimestamp()
        ]
      });
    }

    if (!args[0]) {
      return message.channel.send({
        embeds: [new EmbedBuilder()
          .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
          .setTitle('createembed')
          .setDescription(
            'Build a custom embed with live variables.\n\n' +
            '**Syntax:**\n```{embed}$v{title: Hello {user.name}!}$v{description: ...}$v{color: #5865F2}```\n' +
            '**Keys:** `content` `title` `description` `color` `url` `thumbnail` `image` `author` `author_icon` `author_url` `footer` `footer_icon` `timestamp` `field`\n' +
            '**Field syntax:** `{field: name && value && inline}`\n\n' +
            'Run `createembed variables` to see all available variables.'
          )
          .setColor(color)
          .setFooter({ text: 'Module: utility' })
          .setTimestamp()
        ]
      });
    }

    const raw = args.join(' ');
    const vars = buildVars(message);

    try {
      let payload;
      const trimmed = raw.trim();

      if (trimmed.startsWith('{embed}') || trimmed.includes('$v')) {
        payload = parseEmbed(raw, vars);
      } else {
        // JSON fallback
        const json = JSON.parse(raw);
        const { text, content: msgContent, ...embedData } = json;
        const embed = new EmbedBuilder();
        if (embedData.title)       embed.setTitle(embedData.title);
        if (embedData.description) embed.setDescription(embedData.description);
        if (embedData.color)       embed.setColor(embedData.color);
        if (embedData.url)         embed.setURL(embedData.url);
        if (embedData.timestamp)   embed.setTimestamp(embedData.timestamp === true ? Date.now() : new Date(embedData.timestamp));
        if (embedData.thumbnail) {
          const t = typeof embedData.thumbnail === 'string' ? embedData.thumbnail : embedData.thumbnail?.url;
          if (t) embed.setThumbnail(t);
        }
        if (embedData.image) {
          const i = typeof embedData.image === 'string' ? embedData.image : embedData.image?.url;
          if (i) embed.setImage(i);
        }
        if (embedData.author)  embed.setAuthor({ name: embedData.author.name || 'Author', iconURL: embedData.author.icon_url, url: embedData.author.url });
        if (embedData.footer)  embed.setFooter({ text: embedData.footer.text || '', iconURL: embedData.footer.icon_url });
        if (Array.isArray(embedData.fields)) {
          embed.addFields(embedData.fields.map((f) => ({ name: f.name || '\u200b', value: f.value || '\u200b', inline: !!f.inline })));
        }
        payload = { content: text || msgContent || undefined, embeds: [embed] };
      }

      if (!payload || (!payload.content && !(payload.embeds && payload.embeds.length))) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Could not parse your embed.`)] });
      }

      await message.delete().catch(() => {});
      await message.channel.send(payload);
    } catch (e) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: ${e.message}`)] });
    }
  },
};
