const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  name: 'notes',
  aliases: ['note'],
  category: 'moderation',
  help: [
    { name: 'notes', description: 'View notes for a user', aliases: 'note', parameters: '(@user)', information: 'MANAGE_MESSAGES', usage: 'notes (@user)', example: 'notes @user' },
    { name: 'notes add', description: 'Add a note to a user', aliases: 'n/a', parameters: '(@user) (note)', information: 'MANAGE_MESSAGES', usage: 'notes add (@user) (note)', example: 'notes add @user Warning issued' },
    { name: 'notes remove', description: 'Remove a note', aliases: 'delete, del', parameters: '(@user) (note #)', information: 'MANAGE_MESSAGES', usage: 'notes remove (@user) (number)', example: 'notes remove @user 1' },
    { name: 'notes clear', description: 'Clear all notes for a user', aliases: 'cl', parameters: '(@user)', information: 'MANAGE_MESSAGES', usage: 'notes clear (@user)', example: 'notes clear @user' },
  ],

  run: async (client, message, args) => {
    const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const sub = (args[0] || '').toLowerCase();
    const gid = message.guild.id;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages) && !message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_messages\``)] });

    if (sub === 'add') {
      const target = message.mentions.members.first() || message.guild.members.cache.get(args[1]);
      if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please mention a user.`)] });
      const note = args.slice(2).join(' ');
      if (!note) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please provide a note.`)] });
      const key = `notes_${gid}_${target.id}`;
      const notes = db.get(key) || [];
      notes.push({ text: note, author: message.author.id, date: Date.now() });
      db.set(key, notes);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Note added to ${target.user.tag}.`)] });
    }

    if (['remove', 'delete', 'del'].includes(sub)) {
      const target = message.mentions.members.first() || message.guild.members.cache.get(args[1]);
      if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please mention a user.`)] });
      const num = parseInt(args[2]);
      if (isNaN(num)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please provide a valid note number.`)] });
      const key = `notes_${gid}_${target.id}`;
      const notes = db.get(key) || [];
      if (num < 1 || num > notes.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Invalid note number.`)] });
      notes.splice(num - 1, 1);
      db.set(key, notes);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Note #${num} removed from ${target.user.tag}.`)] });
    }

    if (['clear', 'cl'].includes(sub)) {
      const target = message.mentions.members.first() || message.guild.members.cache.get(args[1]);
      if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please mention a user.`)] });
      db.delete(`notes_${gid}_${target.id}`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: All notes cleared for ${target.user.tag}.`)] });
    }

    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}notes (@user)\` or \`${prefix}notes add (@user) (note)\``)] });
    const notes = db.get(`notes_${gid}_${target.id}`) || [];
    if (!notes.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: No notes for ${target.user.tag}.`)] });
    const lines = notes.map((n, i) => `**${i + 1}.** ${n.text} — <@${n.author}> (<t:${Math.floor(n.date / 1000)}:R>)`);
    return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Notes for ${target.user.tag}`).setDescription(lines.join('\n').slice(0, 4000))] });
  }
};
