const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

const LOG_TYPES = ['message', 'member', 'channel', 'role', 'voice', 'invite', 'server', 'moderation'];

module.exports = {
  name: 'log',
  aliases: ['logging', 'logger', 'logs2'],
  category: 'configuration',
  help: [
    { name: 'log', description: 'Manage the logging system', aliases: 'logging, logger', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'log', example: 'log' },
  ],

  run: async (client, message, args) => {
    const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });

    const sub = (args[0] || '').toLowerCase();
    const guildId = message.guild.id;
    const logKey = `logging_${guildId}`;

    if (!sub) {
      const cfg = db.get(logKey) || {};
      const lines = LOG_TYPES.map(t => `**${t}** — ${cfg[t] ? `<#${cfg[t]}>` : 'Not set'}`);
      const ignored = db.get(`logging_ignore_${guildId}`) || [];
      const colors = db.get(`logging_colors_${guildId}`) || {};
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color)
        .setTitle('Logging Configuration')
        .setDescription(lines.join('\n'))
        .addFields(
          { name: 'Ignored Channels', value: ignored.length ? ignored.map(id => `<#${id}>`).join(', ') : 'None', inline: true },
          { name: 'Custom Colors', value: Object.keys(colors).length ? Object.entries(colors).map(([k, v]) => `**${k}**: ${v}`).join(', ') : 'Default', inline: true }
        )
        .setFooter({ text: `${prefix}log add <type> <#channel> | ${prefix}log remove <type>` })
        .setTimestamp()] });
    }

    if (sub === 'add') {
      const type = (args[1] || '').toLowerCase();
      const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[2]);
      if (!type || !LOG_TYPES.includes(type))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Valid log types: ${LOG_TYPES.map(t => `\`${t}\``).join(', ')}`)] });
      if (!channel)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please mention a channel.`)] });
      const cfg = db.get(logKey) || {};
      cfg[type] = channel.id;
      db.set(logKey, cfg);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: **${type}** logs will be sent to ${channel}.`)] });
    }

    if (sub === 'remove') {
      const type = (args[1] || '').toLowerCase();
      if (!type || !LOG_TYPES.includes(type))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Valid log types: ${LOG_TYPES.map(t => `\`${t}\``).join(', ')}`)] });
      const cfg = db.get(logKey) || {};
      delete cfg[type];
      db.set(logKey, cfg);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: **${type}** logging has been disabled.`)] });
    }

    if (sub === 'ignore') {
      const subsub = (args[1] || '').toLowerCase();
      const ignoreKey = `logging_ignore_${guildId}`;
      if (subsub === 'list') {
        const ignored = db.get(ignoreKey) || [];
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color)
          .setTitle('Ignored Channels')
          .setDescription(ignored.length ? ignored.map(id => `<#${id}>`).join('\n') : 'No channels ignored.')] });
      }
      const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
      if (!channel)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Mention a channel to ignore/unignore, or use \`${prefix}log ignore list\`.`)] });
      const ignored = db.get(ignoreKey) || [];
      if (ignored.includes(channel.id)) {
        db.set(ignoreKey, ignored.filter(id => id !== channel.id));
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: ${channel} is no longer ignored from logging.`)] });
      }
      ignored.push(channel.id);
      db.set(ignoreKey, ignored);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: ${channel} will be ignored from logging.`)] });
    }

    if (sub === 'color') {
      const subsub = (args[1] || '').toLowerCase();
      const colorKey = `logging_colors_${guildId}`;
      if (subsub === 'list') {
        const colors = db.get(colorKey) || {};
        const lines = Object.entries(colors).map(([k, v]) => `**${k}**: ${v}`);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color)
          .setTitle('Log Colors')
          .setDescription(lines.length ? lines.join('\n') : 'Using default colors.')] });
      }
      const type = (args[1] || '').toLowerCase();
      const hex = args[2];
      if (!type || !hex || !/^#?[0-9a-f]{6}$/i.test(hex))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}log color <type> <#hex>\` or \`${prefix}log color list\``)] });
      const colors = db.get(colorKey) || {};
      colors[type] = hex.startsWith('#') ? hex : `#${hex}`;
      db.set(colorKey, colors);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(colors[type]).setDescription(`${approve} ${message.author}: **${type}** log color set to **${colors[type]}**.`)] });
    }

    return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Unknown subcommand. Use \`${prefix}log\` for help.`)] });
  }
};
