const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

if (!global.bumpReminders) global.bumpReminders = {};
if (!global.bumpLeaderboard) global.bumpLeaderboard = {};

module.exports = {
  category: 'bumpreminder',
  help: [
    {
        name: 'bumpreminder',
        description: 'Manage the bump reminder system',
        aliases: 'br',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'bumpreminder',
        example: 'bumpreminder'
    },
    {
        name: 'bumpreminder set',
        description: 'Set the bump reminder channel',
        aliases: 'n/a',
        parameters: '(channel)',
        information: 'MANAGE_GUILD',
        usage: 'bumpreminder set (channel)',
        example: 'bumpreminder set channel'
    },
    {
        name: 'bumpreminder reset',
        description: 'Reset the bump reminder',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'bumpreminder reset',
        example: 'bumpreminder reset'
    },
    {
        name: 'bumpreminder config',
        description: 'View current bump reminder config',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'bumpreminder config',
        example: 'bumpreminder config'
    }
],

    name: 'bumpreminder',
  aliases: ['br'],

  run: async (client, message, args) => {
    const sub = args[0]?.toLowerCase();
    const guildId = message.guild.id;

    const helpEmbed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: bumpreminder')
      .setDescription('Manage bump reminders for this server.')
      .addFields(
        { name: '**Subcommands**', value: 'enable, disable, reminder, thankyou, view, test, leaderboard', inline: false },
        { name: '**Usage**', value: '```bumpreminder enable\nbumpreminder disable\nbumpreminder reminder <message>\nbumpreminder thankyou <message>\nbumpreminder view <reminder|thankyou>\nbumpreminder test <reminder|thankyou>\nbumpreminder leaderboard```' }
      )
      .setFooter({ text: 'Module: utility' })
      .setTimestamp()
      .setColor(color);

    if (!sub) return message.channel.send({ embeds: [helpEmbed] });

    const needsManageGuild = ['enable', 'disable', 'reminder', 'message', 'thankyou', 'channel', 'set', 'view', 'check', 'test', 'leaderboard', 'autoclean', 'autolock'];
    if (needsManageGuild.includes(sub) && !message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
    }

    if (!global.bumpReminders[guildId]) {
      global.bumpReminders[guildId] = { enabled: false, reminderMsg: '{role} Time to bump the server! Use `/bump`!', thankyouMsg: 'Thanks for bumping, {user}! Next reminder in 2 hours.' };
    }

    const cfg = global.bumpReminders[guildId];

    if (['enable', 'channel', 'set'].includes(sub)) {
      cfg.enabled = true;
      const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]) || message.channel;
      cfg.channelId = channel.id;
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('a3eb7b').setDescription(`${approve} ${message.author}: Bump reminders enabled in ${channel}.`)] });
    }

    if (sub === 'disable') {
      cfg.enabled = false;
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('a3eb7b').setDescription(`${approve} ${message.author}: Bump reminders disabled.`)] });
    }

    if (['reminder', 'message'].includes(sub)) {
      if (['view', 'check'].includes(args[1]?.toLowerCase())) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Bump Reminder Message').setDescription(cfg.reminderMsg || 'Not set.').setTimestamp()] });
      }
      const msg = args.slice(1).join(' ');
      if (!msg) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please provide a reminder message.`)] });
      cfg.reminderMsg = msg;
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('a3eb7b').setDescription(`${approve} ${message.author}: Reminder message set.`)] });
    }

    if (sub === 'thankyou') {
      if (['view', 'check'].includes(args[1]?.toLowerCase())) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Bump Thank You Message').setDescription(cfg.thankyouMsg || 'Not set.').setTimestamp()] });
      }
      const msg = args.slice(1).join(' ');
      if (!msg) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please provide a thank you message.`)] });
      cfg.thankyouMsg = msg;
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('a3eb7b').setDescription(`${approve} ${message.author}: Thank you message set.`)] });
    }

    if (['autoclean', 'autolock'].includes(sub)) {
      cfg[sub] = !cfg[sub];
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('a3eb7b').setDescription(`${approve} ${message.author}: Bump reminder **${sub}** is now **${cfg[sub] ? 'enabled' : 'disabled'}**.`)] });
    }

    if (sub === 'view') {
      const type = args[1]?.toLowerCase();
      if (!type || !['reminder', 'thankyou'].includes(type)) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Specify \`reminder\` or \`thankyou\`.`)] });
      }
      const msgText = type === 'reminder' ? cfg.reminderMsg : cfg.thankyouMsg;
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`${type.charAt(0).toUpperCase() + type.slice(1)} Message`).setDescription(msgText || 'Not set.').setTimestamp()] });
    }

    if (sub === 'test') {
      const type = args[1]?.toLowerCase();
      if (!type || !['reminder', 'thankyou'].includes(type)) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Specify \`reminder\` or \`thankyou\`.`)] });
      }
      const template = type === 'reminder' ? cfg.reminderMsg : cfg.thankyouMsg;
      const preview = (template || 'Not set.').replace('{user}', message.author.toString()).replace('{role}', '@here');
      return message.channel.send({ content: preview });
    }

    if (sub === 'leaderboard') {
      const lb = global.bumpLeaderboard[guildId] || {};
      const sorted = Object.entries(lb).sort((a, b) => b[1] - a[1]).slice(0, 10);
      if (!sorted.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription('No bump data yet.')] });
      const lines = sorted.map(([uid, count], i) => `**${i + 1}.** <@${uid}> — ${count} bumps`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Bump Leaderboard').setDescription(lines.join('\n')).setTimestamp()] });
    }

    return message.channel.send({ embeds: [helpEmbed] });
  },
};
