const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');
const { parseEmbed, buildVars } = require('../utils/embedParser');

module.exports = {
  category: 'utility',
  help: [
    {
      name: 'embed',
      description: 'Send text or a full embed script as a message. Supports all variables.',
      aliases: 'n/a',
      parameters: '(text or embed script)',
      information: 'MANAGE_MESSAGES',
      usage: 'embed (text)',
      example: 'embed Welcome {user.name} to {guild.name}!'
    }
  ],

  name: 'embed',

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_messages\``)] });
    }

    const sub = args[0]?.toLowerCase();
    const key = `saved_embeds_${message.guild.id}`;
    const vars = buildVars(message);

    if (['create', 'c', 'edit'].includes(sub)) {
      const name = args[1]?.toLowerCase();
      const text = args.slice(2).join(' ');
      if (!name || !text) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}embed create <name> <text>\``)] });
      const saved = db.get(key) || {};
      saved[name] = { text, author: message.author.id, updatedAt: Date.now() };
      db.set(key, saved);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Saved embed **${name}**.`)] });
    }

    if (['preview', 'view'].includes(sub)) {
      const name = args[1]?.toLowerCase();
      const saved = db.get(key) || {};
      if (!name || !saved[name]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Saved embed not found.`)] });
      const payload = parseEmbed(saved[name].text, vars);
      if (payload && (payload.content || payload.embeds?.length)) return message.channel.send(payload);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(saved[name].text).setFooter({ text: `Embed: ${name}` }).setTimestamp()] });
    }

    if (sub === 'copy') {
      const target = args[1]?.toLowerCase();
      const name = args[2]?.toLowerCase();
      const saved = db.get(key) || {};
      if (!target || !name || !saved[target]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}embed copy <existing> <new>\``)] });
      saved[name] = { ...saved[target], author: message.author.id, updatedAt: Date.now() };
      db.set(key, saved);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Copied **${target}** to **${name}**.`)] });
    }

    if (['delete', 'del'].includes(sub)) {
      const name = args[1]?.toLowerCase();
      const saved = db.get(key) || {};
      if (!name || !saved[name]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Saved embed not found.`)] });
      delete saved[name];
      db.set(key, saved);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Deleted embed **${name}**.`)] });
    }

    if (sub === 'list') {
      const saved = db.get(key) || {};
      const names = Object.keys(saved);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Saved Embeds').setDescription(names.length ? names.map(n => `\`${n}\``).join(', ') : 'No saved embeds.')] });
    }

    const text = args.join(' ');
    if (!text) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}embed <text>\``)] });

    // If it looks like an embed script, parse it with vars; otherwise send as plain embed
    const trimmed = text.trim();
    if (trimmed.startsWith('{embed}') || trimmed.includes('$v')) {
      const payload = parseEmbed(text, vars);
      if (payload && (payload.content || payload.embeds?.length)) {
        await message.delete().catch(() => {});
        return message.channel.send(payload);
      }
    }

    // Plain text with variable substitution
    const { applyVars } = require('../utils/embedParser');
    const resolved = applyVars(text, vars);
    await message.delete().catch(() => {});
    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(resolved).setTimestamp()] });
  }
};
