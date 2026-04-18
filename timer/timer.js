const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

if (!global.timers) global.timers = {};

function parseInterval(str) {
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return null;
  const num = parseInt(match[1]);
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return num * (units[match[2]] || 0);
}

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'timer',
        description: 'Set a countdown timer',
        aliases: 'n/a',
        parameters: '(duration)',
        information: 'n/a',
        usage: 'timer (duration)',
        example: 'timer duration'
    }
],

    name: 'timer',
  aliases: ['intervalmsg'],

  run: async (client, message, args) => {
    const sub = args[0]?.toLowerCase();

    const helpEmbed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: timer')
      .setDescription('Send messages at set intervals in a channel.')
      .addFields(
        { name: '**Subcommands**', value: 'add, view, remove, list', inline: false },
        { name: '**Usage**', value: '```timer add <#channel> <interval> <message>\ntimer view <#channel>\ntimer remove <#channel>\ntimer list```' }
      )
      .setFooter({ text: 'Module: utility' })
      .setTimestamp()
      .setColor(color);

    if (!sub || !['add', 'create', 'send', 'view', 'check', 'remove', 'delete', 'del', 'list', 'activity', 'ignoreactivity'].includes(sub)) {
      return message.channel.send({ embeds: [helpEmbed] });
    }

    const guildId = message.guild.id;

    if (sub === 'list') {
      const guildTimers = Object.entries(global.timers).filter(([k]) => k.startsWith(guildId + ':'));
      if (!guildTimers.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription('No timers in this server.')] });
      const lines = guildTimers.map(([k, v]) => `<#${k.split(':')[1]}> — every **${v.intervalStr}** — "${v.content.slice(0, 50)}"`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Timers').setDescription(lines.join('\n')).setTimestamp()] });
    }

    const targetChannel = message.mentions.channels.first() || message.channel;
    const key = `${guildId}:${targetChannel.id}`;

    if (['activity', 'ignoreactivity'].includes(sub)) {
      const key = `timer_ignore_activity_${guildId}`;
      const enabled = !require('../db').get(key);
      require('../db').set(key, enabled);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Timer activity ignore is now **${enabled ? 'enabled' : 'disabled'}**.`)] });
    }

    if (['view', 'check'].includes(sub)) {
      const timer = global.timers[key];
      if (!timer) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`No timer in <#${targetChannel.id}>.`)] });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Timer — #${targetChannel.name}`).addFields({ name: 'Interval', value: timer.intervalStr, inline: true }, { name: 'Message', value: timer.content }).setTimestamp()] });
    }

    if (['remove', 'delete', 'del'].includes(sub)) {
      const timer = global.timers[key];
      if (!timer) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: No timer in <#${targetChannel.id}>.`)] });
      clearInterval(timer.interval);
      delete global.timers[key];
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Removed timer from <#${targetChannel.id}>.`)] });
    }

    if (['add', 'create', 'send'].includes(sub)) {
      const intervalStr = args[2];
      const content = args.slice(3).join(' ');
      if (!intervalStr || !content) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`timer add <#channel> <interval> <message>\` (e.g. 1h, 30m, 10s)`)] });
      }
      const ms = parseInterval(intervalStr);
      if (!ms || ms < 10000) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Invalid interval. Use format like \`30m\`, \`1h\`, \`2d\`. Minimum is 10s.`)] });
      }

      if (global.timers[key]) {
        clearInterval(global.timers[key].interval);
      }

      const intervalRef = setInterval(async () => {
        const ch = client.channels.cache.get(targetChannel.id);
        if (ch) await ch.send({ content }).catch(() => {});
      }, ms);

      global.timers[key] = { interval: intervalRef, intervalStr, content, channelId: targetChannel.id };

      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Timer added! Sending message to <#${targetChannel.id}> every **${intervalStr}**.`)] });
    }
  },
};
