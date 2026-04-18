const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve, deny } = require('../emojis.json');
const { default_prefix } = require('../config.json');
const { paginate } = require('../utils/paginate');

module.exports = {
  name: 'tags',
  aliases: ['tag', 't'],
  category: 'utility',
  help: [
    { name: 'tags', description: 'View or use a tag', aliases: 'tag, t', parameters: '(tag name)', information: 'n/a', usage: 'tags (name)', example: 'tags rules' },
    { name: 'tags add', description: 'Create a new tag', aliases: 'create', parameters: '(name) (content)', information: 'MANAGE_MESSAGES', usage: 'tags add (name) (content)', example: 'tags add rules Follow the rules!' },
    { name: 'tags remove', description: 'Delete a tag', aliases: 'del, delete', parameters: '(name)', information: 'MANAGE_MESSAGES', usage: 'tags remove (name)', example: 'tags remove rules' },
    { name: 'tags edit', description: 'Edit a tag', aliases: 'change, update', parameters: '(name) (new content)', information: 'MANAGE_MESSAGES', usage: 'tags edit (name) (content)', example: 'tags edit rules New rules!' },
    { name: 'tags list', description: 'List all tags', aliases: 'n/a', parameters: 'n/a', information: 'n/a', usage: 'tags list', example: 'tags list' },
    { name: 'tags rename', description: 'Rename a tag', aliases: 'editname', parameters: '(old name) (new name)', information: 'MANAGE_MESSAGES', usage: 'tags rename (old) (new)', example: 'tags rename rules info' },
    { name: 'tags random', description: 'Show a random tag', aliases: 'n/a', parameters: 'n/a', information: 'n/a', usage: 'tags random', example: 'tags random' },
    { name: 'tags author', description: 'Show who created a tag', aliases: 'owner, creator', parameters: '(name)', information: 'n/a', usage: 'tags author (name)', example: 'tags author rules' },
    { name: 'tags reset', description: 'Delete all tags', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'tags reset', example: 'tags reset' },
  ],

  run: async (client, message, args) => {
    const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const sub = (args[0] || '').toLowerCase();
    const gid = message.guild.id;
    const tagsKey = `tags_${gid}`;
    const tags = db.get(tagsKey) || {};

    const hasPerms = message.member.permissions.has(PermissionFlagsBits.ManageMessages) || message.member.permissions.has(PermissionFlagsBits.Administrator);
    const hasAdmin = message.member.permissions.has(PermissionFlagsBits.ManageGuild) || message.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!sub) {
      return paginate(message, this.help, 'utility');
    }

    if (['add', 'create'].includes(sub)) {
      if (!hasPerms) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_messages\``)] });
      const name = args[1]?.toLowerCase();
      const content = args.slice(2).join(' ');
      if (!name || !content) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}tags add (name) (content)\``)] });
      if (tags[name]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: A tag with that name already exists.`)] });
      tags[name] = { content, author: message.author.id, created: Date.now() };
      db.set(tagsKey, tags);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Tag **${name}** has been created.`)] });
    }

    if (['remove', 'del', 'delete'].includes(sub)) {
      if (!hasPerms) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_messages\``)] });
      const name = args[1]?.toLowerCase();
      if (!name || !tags[name]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: That tag does not exist.`)] });
      delete tags[name];
      db.set(tagsKey, tags);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Tag **${name}** has been deleted.`)] });
    }

    if (['edit', 'change', 'update'].includes(sub)) {
      if (!hasPerms) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_messages\``)] });
      const name = args[1]?.toLowerCase();
      const content = args.slice(2).join(' ');
      if (!name || !content) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}tags edit (name) (new content)\``)] });
      if (!tags[name]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: That tag does not exist.`)] });
      tags[name].content = content;
      db.set(tagsKey, tags);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Tag **${name}** has been updated.`)] });
    }

    if (['rename', 'editname'].includes(sub)) {
      if (!hasPerms) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_messages\``)] });
      const oldName = args[1]?.toLowerCase();
      const newName = args[2]?.toLowerCase();
      if (!oldName || !newName) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}tags rename (old name) (new name)\``)] });
      if (!tags[oldName]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Tag **${oldName}** does not exist.`)] });
      if (tags[newName]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: Tag **${newName}** already exists.`)] });
      tags[newName] = tags[oldName];
      delete tags[oldName];
      db.set(tagsKey, tags);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Tag **${oldName}** renamed to **${newName}**.`)] });
    }

    if (sub === 'list') {
      const names = Object.keys(tags);
      if (!names.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: No tags have been created yet.`)] });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Tags (${names.length})`).setDescription(names.map(n => `\`${n}\``).join(', '))] });
    }

    if (sub === 'random') {
      const names = Object.keys(tags);
      if (!names.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: No tags have been created yet.`)] });
      const name = names[Math.floor(Math.random() * names.length)];
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Tag: ${name}`).setDescription(tags[name].content)] });
    }

    if (['author', 'owner', 'creator'].includes(sub)) {
      const name = args[1]?.toLowerCase();
      if (!name || !tags[name]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: That tag does not exist.`)] });
      const author = await client.users.fetch(tags[name].author).catch(() => null);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`Tag **${name}** was created by ${author ? author.tag : 'Unknown User'}.`)] });
    }

    if (sub === 'reset') {
      if (!hasAdmin) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
      db.set(tagsKey, {});
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: All tags have been **reset**.`)] });
    }

    if (tags[sub]) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Tag: ${sub}`).setDescription(tags[sub].content)] });
    }

    return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Tag **${sub}** not found. Use \`${prefix}tags list\` to see all tags.`)] });
  }
};
