const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  name: 'highlight',
  aliases: ['hl'],
  category: 'utility',
  help: [
    { name: 'highlight', description: 'Get notified when a word is mentioned', aliases: 'hl', parameters: 'n/a', information: 'n/a', usage: 'highlight', example: 'highlight' },
    { name: 'highlight add', description: 'Add a highlight word', aliases: 'n/a', parameters: '(word)', information: 'n/a', usage: 'highlight add (word)', example: 'highlight add hello' },
    { name: 'highlight remove', description: 'Remove a highlight word', aliases: 'delete, del', parameters: '(word)', information: 'n/a', usage: 'highlight remove (word)', example: 'highlight remove hello' },
    { name: 'highlight list', description: 'List your highlight words', aliases: 'n/a', parameters: 'n/a', information: 'n/a', usage: 'highlight list', example: 'highlight list' },
    { name: 'highlight reset', description: 'Clear all highlight words', aliases: 'clear', parameters: 'n/a', information: 'n/a', usage: 'highlight reset', example: 'highlight reset' },
    { name: 'highlight ignore', description: 'Ignore a channel or user for highlights', aliases: 'n/a', parameters: '(#channel or @user)', information: 'n/a', usage: 'highlight ignore (#channel)', example: 'highlight ignore #general' },
  ],

  run: async (client, message, args) => {
    const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const sub = (args[0] || '').toLowerCase();
    const gid = message.guild.id;
    const uid = message.author.id;
    const hlKey = `highlight_${gid}_${uid}`;

    if (!sub || sub === 'list') {
      const words = db.get(hlKey) || [];
      if (!words.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: You have no highlight words. Use \`${prefix}highlight add (word)\` to add one.`)] });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Your Highlights').setDescription(words.map(w => `\`${w}\``).join(', '))] });
    }

    if (sub === 'add') {
      const word = args.slice(1).join(' ').toLowerCase();
      if (!word) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please provide a word to highlight.`)] });
      const words = db.get(hlKey) || [];
      if (words.includes(word)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: That word is already highlighted.`)] });
      if (words.length >= 25) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You can only have up to 25 highlight words.`)] });
      words.push(word);
      db.set(hlKey, words);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Added **${word}** to your highlights.`)] });
    }

    if (['remove', 'delete', 'del'].includes(sub)) {
      const word = args.slice(1).join(' ').toLowerCase();
      if (!word) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please provide a word to remove.`)] });
      const words = db.get(hlKey) || [];
      if (!words.includes(word)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: That word is not in your highlights.`)] });
      db.set(hlKey, words.filter(w => w !== word));
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Removed **${word}** from your highlights.`)] });
    }

    if (['reset', 'clear'].includes(sub)) {
      db.delete(hlKey);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: All highlight words cleared.`)] });
    }

    if (sub === 'ignore') {
      const sub2 = (args[1] || '').toLowerCase();
      const ignoreKey = `highlight_ignore_${gid}_${uid}`;
      const ignored = db.get(ignoreKey) || [];

      if (sub2 === 'list') {
        if (!ignored.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: You have no ignored channels or users.`)] });
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Highlight Ignores').setDescription(ignored.map(id => `<#${id}> / <@${id}>`).join('\n'))] });
      }

      const target = message.mentions.channels.first() || message.mentions.users.first() || message.guild.channels.cache.get(args[1]);
      if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Mention a channel or user to ignore.`)] });
      const targetId = target.id;
      if (ignored.includes(targetId)) {
        db.set(ignoreKey, ignored.filter(id => id !== targetId));
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: ${target} is no longer ignored for highlights.`)] });
      }
      ignored.push(targetId);
      db.set(ignoreKey, ignored);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: ${target} will now be ignored for highlights.`)] });
    }

    return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Unknown subcommand. Use \`${prefix}highlight\` for help.`)] });
  }
};
