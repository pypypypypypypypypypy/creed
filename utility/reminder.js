const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

if (!global.userReminders) global.userReminders = {};

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'reminder',
        description: 'Manage your reminders',
        aliases: 'remindme, setreminder',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'reminder',
        example: 'reminder'
    },
    {
        name: 'reminder list',
        description: 'List all your reminders',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'reminder list',
        example: 'reminder list'
    },
    {
        name: 'reminder delete',
        description: 'Delete a reminder',
        aliases: 'n/a',
        parameters: '(id)',
        information: 'n/a',
        usage: 'reminder delete (id)',
        example: 'reminder delete id'
    }
],

    name: 'reminder',
  aliases: ['remindme', 'setreminder'],

  run: async (client, message, args) => {
    const sub = args[0]?.toLowerCase();

    const helpEmbed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: reminder')
      .setDescription('Set, list, or remove personal reminders.')
      .addFields(
        { name: '**Subcommands**', value: 'add (set), list, remove', inline: false },
        { name: '**Usage**', value: '```reminder add <time> <message>\nreminder list\nreminder remove <index>```' }
      )
      .setFooter({ text: 'Module: utility' })
      .setTimestamp()
      .setColor(color);

    if (!sub || !['add', 'set', 'list', 'remove'].includes(sub)) {
      return message.channel.send({ embeds: [helpEmbed] });
    }

    const userId = message.author.id;
    if (!global.userReminders[userId]) global.userReminders[userId] = [];

    if (sub === 'list') {
      const reminders = global.userReminders[userId];
      if (!reminders.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription('You have no active reminders.')] });
      const lines = reminders.map((r, i) => `**${i + 1}.** ${r.message} — <t:${Math.floor(r.fireAt / 1000)}:R>`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Your Reminders').setDescription(lines.join('\n')).setTimestamp()] });
    }

    if (sub === 'remove') {
      const idx = parseInt(args[1]) - 1;
      if (isNaN(idx)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Provide a valid index.`)] });
      const reminders = global.userReminders[userId];
      if (idx < 0 || idx >= reminders.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Index out of range. You have ${reminders.length} reminder(s).`)] });
      const removed = reminders.splice(idx, 1)[0];
      clearTimeout(removed.timeout);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Removed reminder: **${removed.message}**`)] });
    }

    if (sub === 'add' || sub === 'set') {
      const timeStr = args[1];
      const reminderMsg = args.slice(2).join(' ');

      if (!timeStr || !reminderMsg) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`reminder add <time> <message>\` (e.g. \`1h\`, \`30m\`, \`2d\`)`)] });
      }

      function parseTime(str) {
        const match = str.match(/^(\d+)([smhd])$/);
        if (!match) return null;
        const num = parseInt(match[1]);
        const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
        return num * (units[match[2]] || 0);
      }

      const ms = parseTime(timeStr);
      if (!ms || ms < 5000) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Invalid time format. Use \`5s\`, \`10m\`, \`1h\`, \`2d\`.`)] });
      }

      if (global.userReminders[userId].length >= 20) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You can only have 20 active reminders.`)] });
      }

      const fireAt = Date.now() + ms;
      const channelId = message.channel.id;

      const timeout = setTimeout(async () => {
        const ch = client.channels.cache.get(channelId);
        if (ch) {
          await ch.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} <@${userId}> Reminder: **${reminderMsg}**`).setTimestamp()] });
        }
        global.userReminders[userId] = global.userReminders[userId].filter(r => r.fireAt !== fireAt);
      }, ms);

      global.userReminders[userId].push({ message: reminderMsg, fireAt, timeout, channelId });

      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: I'll remind you about **${reminderMsg}** in **${timeStr}**! (<t:${Math.floor(fireAt / 1000)}:R>)`)] });
    }
  },
};
