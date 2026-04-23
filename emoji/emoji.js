const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

module.exports = {
  category: 'emoji',
  help: [
    {
        name: 'emoji',
        description: 'Manage server emojis',
        aliases: 'emote',
        parameters: '(emoji)',
        information: 'n/a',
        usage: 'emoji (emoji)',
        example: 'emoji emoji'
    },
    {
        name: 'emoji add',
        description: 'Add an emoji to the server',
        aliases: 'n/a',
        parameters: '(name) (image/url)',
        information: 'n/a',
        usage: 'emoji add (name) (image/url)',
        example: 'emoji add name'
    },
    {
        name: 'emoji remove',
        description: 'Remove an emoji from the server',
        aliases: 'n/a',
        parameters: '(emoji)',
        information: 'n/a',
        usage: 'emoji remove (emoji)',
        example: 'emoji remove emoji'
    },
    {
        name: 'emoji rename',
        description: 'Rename a server emoji',
        aliases: 'n/a',
        parameters: '(emoji) (new name)',
        information: 'n/a',
        usage: 'emoji rename (emoji) (new name)',
        example: 'emoji rename emoji'
    },
    {
        name: 'emoji list',
        description: 'List all server emojis',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'emoji list',
        example: 'emoji list'
    }
],

    name: 'emoji',
  aliases: ['emote'],

  run: async (client, message, args) => {
    const sub = args[0]?.toLowerCase();

    const helpEmbed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: emoji')
      .setDescription('Manage custom emojis in the server.')
      .addFields(
        { name: '**Subcommands**', value: 'add, addmany, remove, removemany, rename, steal, stealmany, enlarge, list', inline: false },
        { name: '**Usage**', value: '```emoji add <emoji> <name>\nemoji addmany <emojis...>\nemoji remove <emoji>\nemoji removemany <emojis...>\nemoji rename <emoji> <new name>\nemoji steal <emoji> [name]\nemoji stealmany <emojis...>\nemoji enlarge <emoji>\nemoji list```' }
      )
      .setFooter({ text: 'Module: utility' })
      .setTimestamp()
      .setColor(color);

    if (!sub || !['add','addmany','remove','removemany','removeall','removeduplicates','rmdups','rename','information','info','stats','steal','stealmany','enlarge','list'].includes(sub)) {
      return message.channel.send({ embeds: [helpEmbed] });
    }

    const hasManage = () => message.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions);
    const botHasManage = () => message.guild.members.me.permissions.has(PermissionFlagsBits.ManageGuildExpressions);

    const requireManage = () => {
      if (!hasManage()) {
        message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_emojis_and_stickers\``)] });
        return false;
      }
      if (!botHasManage()) {
        message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`manage_emojis_and_stickers\``)] });
        return false;
      }
      return true;
    };

    function parseEmoji(str) {
      const match = str.match(/<a?:(\w+):(\d+)>/);
      if (match) return { name: match[1], id: match[2], animated: str.startsWith('<a:') };
      return null;
    }

    function emojiURL(id, animated) {
      return `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}`;
    }

    if (sub === 'list') {
      const emojis = message.guild.emojis.cache;
      if (!emojis.size) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription('No custom emojis in this server.')] });
      const chunks = [];
      let chunk = '';
      for (const [, e] of emojis) {
        const line = `${e} \`:${e.name}:\`\n`;
        if ((chunk + line).length > 3900) { chunks.push(chunk); chunk = ''; }
        chunk += line;
      }
      if (chunk) chunks.push(chunk);
      for (const c of chunks) {
        await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Emojis (${emojis.size})`).setDescription(c)] });
      }
      return;
    }

    if (['information', 'info'].includes(sub)) {
      const emojiArg = args[1];
      if (!emojiArg) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Provide an emoji.`)] });
      const parsed = parseEmoji(emojiArg);
      const emoji = parsed ? message.guild.emojis.cache.get(parsed.id) : message.guild.emojis.cache.find(e => e.name === emojiArg);
      if (!emoji) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Emoji not found in this server.`)] });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`:${emoji.name}:`).setThumbnail(emoji.url).addFields(
        { name: 'ID', value: emoji.id, inline: true },
        { name: 'Animated', value: emoji.animated ? 'Yes' : 'No', inline: true },
        { name: 'Created', value: `<t:${Math.floor(emoji.createdTimestamp / 1000)}:R>`, inline: true }
      )] });
    }

    if (sub === 'stats') {
      const emojis = message.guild.emojis.cache;
      const animated = emojis.filter(e => e.animated).size;
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Emoji Stats').addFields(
        { name: 'Total', value: `${emojis.size}`, inline: true },
        { name: 'Static', value: `${emojis.size - animated}`, inline: true },
        { name: 'Animated', value: `${animated}`, inline: true }
      )] });
    }

    if (sub === 'enlarge') {
      const emojiArg = args[1];
      if (!emojiArg) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Provide an emoji.`)] });
      const parsed = parseEmoji(emojiArg);
      if (!parsed) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Not a valid custom emoji.`)] });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setImage(emojiURL(parsed.id, parsed.animated)).setTitle(`:${parsed.name}:`)] });
    }

    if (!requireManage()) return;

    if (sub === 'add') {
      const [, emojiArg, nameArg] = args;
      if (!emojiArg) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`emoji add <emoji> <name>\``)] });
      const parsed = parseEmoji(emojiArg);
      const url = parsed ? emojiURL(parsed.id, parsed.animated) : emojiArg;
      const name = nameArg || parsed?.name || 'emoji';
      try {
        const e = await message.guild.emojis.create({ attachment: url, name });
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Added ${e} \`:${e.name}:\``)] });
      } catch (err) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Failed: ${err.message}`)] });
      }
    }

    if (sub === 'addmany') {
      const emojiArgs = args.slice(1);
      if (!emojiArgs.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Provide emojis.`)] });
      let added = 0;
      for (const emojiArg of emojiArgs) {
        const parsed = parseEmoji(emojiArg);
        if (!parsed) continue;
        await message.guild.emojis.create({ attachment: emojiURL(parsed.id, parsed.animated), name: parsed.name }).then(() => added++).catch(() => {});
      }
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Added **${added}** emoji(s).`)] });
    }

    if (sub === 'remove') {
      const emojiArg = args[1];
      if (!emojiArg) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Provide an emoji.`)] });
      const parsed = parseEmoji(emojiArg);
      const emoji = parsed ? message.guild.emojis.cache.get(parsed.id) : message.guild.emojis.cache.find(e => e.name === emojiArg);
      if (!emoji) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Emoji not found.`)] });
      const name = emoji.name;
      await emoji.delete().catch(() => {});
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Removed \`:${name}:\``)] });
    }

    if (sub === 'removemany') {
      const emojiArgs = args.slice(1);
      if (!emojiArgs.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Provide emojis.`)] });

      const targets = emojiArgs
        .map(a => parseEmoji(a))
        .filter(Boolean)
        .map(p => message.guild.emojis.cache.get(p.id))
        .filter(Boolean);

      if (!targets.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: No matching emojis found.`)] });

      const status = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`Removing **${targets.length}** emoji(s)...`)] });

      let removed = 0;
      const BATCH = 5;
      for (let i = 0; i < targets.length; i += BATCH) {
        const slice = targets.slice(i, i + BATCH);
        await Promise.all(slice.map(e => e.delete().then(() => removed++).catch(() => {})));
      }

      return status.edit({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Removed **${removed}**/${targets.length} emoji(s).`)] });
    }

    if (sub === 'removeall') {
      if (!requireManage()) return;

      const confirmArg = (args[1] || '').toLowerCase();
      const all = [...message.guild.emojis.cache.values()];
      if (!all.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: This server has no custom emojis.`)] });

      if (confirmArg !== 'confirm') {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: This will delete **${all.length}** emojis from **${message.guild.name}**. Run \`emoji removeall confirm\` to proceed.`)] });
      }

      const status = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`Removing **${all.length}** emoji(s)...`)] });

      let removed = 0;
      const BATCH = 5;
      let lastEdit = 0;
      for (let i = 0; i < all.length; i += BATCH) {
        const slice = all.slice(i, i + BATCH);
        await Promise.all(slice.map(e => e.delete().then(() => removed++).catch(() => {})));
        const now = Date.now();
        if (now - lastEdit > 4000 || i + BATCH >= all.length) {
          lastEdit = now;
          await status.edit({ embeds: [new EmbedBuilder().setColor(color).setDescription(`Progress: **${Math.min(i + BATCH, all.length)}/${all.length}** removed`)] }).catch(() => {});
        }
      }

      return status.edit({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Removed **${removed}**/${all.length} emoji(s).`)] });
    }

    if (['removeduplicates', 'rmdups'].includes(sub)) {
      const seen = new Set();
      let removed = 0;
      for (const emoji of message.guild.emojis.cache.values()) {
        const name = emoji.name.toLowerCase();
        if (seen.has(name)) {
          await emoji.delete().then(() => removed++).catch(() => {});
        } else {
          seen.add(name);
        }
      }
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Removed **${removed}** duplicate emoji(s).`)] });
    }

    if (sub === 'rename') {
      const [, emojiArg, newName] = args;
      if (!emojiArg || !newName) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`emoji rename <emoji> <new name>\``)] });
      const parsed = parseEmoji(emojiArg);
      const emoji = parsed ? message.guild.emojis.cache.get(parsed.id) : null;
      if (!emoji) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Emoji not found.`)] });
      await emoji.edit({ name: newName }).catch(() => {});
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Renamed to \`:${newName}:\``)] });
    }

    if (sub === 'steal') {
      const [, emojiArg, nameArg] = args;
      if (!emojiArg) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`emoji steal <emoji> [name]\``)] });
      const parsed = parseEmoji(emojiArg);
      if (!parsed) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Not a valid custom emoji.`)] });
      const name = nameArg || parsed.name;
      try {
        const e = await message.guild.emojis.create({ attachment: emojiURL(parsed.id, parsed.animated), name });
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Stole ${e} \`:${e.name}:\``)] });
      } catch (err) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Failed: ${err.message}`)] });
      }
    }

    if (sub === 'stealmany') {
      const emojiArgs = args.slice(1);
      if (!emojiArgs.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Provide emojis.`)] });
      let added = 0;
      for (const emojiArg of emojiArgs) {
        const parsed = parseEmoji(emojiArg);
        if (!parsed) continue;
        await message.guild.emojis.create({ attachment: emojiURL(parsed.id, parsed.animated), name: parsed.name }).then(() => added++).catch(() => {});
      }
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Stole **${added}** emoji(s).`)] });
    }
  },
};
