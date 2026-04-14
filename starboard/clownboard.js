const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getConfig, saveConfig, resetConfig, parseSetting, parseColor } = require('./boardHelper');
const { color } = require('../config.json');
const { approve, warn } = require('../emojis.json');
const { paginate } = require('../utils/paginate');
const db = require('../db');

const TYPE = 'clownboard';
const LABEL = 'Clownboard';

function needsManageGuild(message) {
  if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
    message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
    return true;
  }
  return false;
}

function resolveIgnoreTarget(message, args) {
  if (!args.length) return null;
  const id = (args[0].match(/\d{17,19}/) || [])[0];
  if (!id) return null;
  const ch = message.guild.channels.cache.get(id);
  if (ch) return { type: 'channel', id };
  const role = message.guild.roles.cache.get(id);
  if (role) return { type: 'role', id };
  const member = message.guild.members.cache.get(id);
  if (member) return { type: 'member', id };
  return null;
}

module.exports = {
  category: 'starboard',
  help: [
    {
        name: 'clownboard',
        description: 'Manage the clownboard system',
        aliases: 'cb',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'clownboard',
        example: 'clownboard'
    },
    {
        name: 'clownboard set',
        description: 'Set the clownboard channel',
        aliases: 'n/a',
        parameters: '(channel)',
        information: 'MANAGE_GUILD',
        usage: 'clownboard set (channel)',
        example: 'clownboard set channel'
    },
    {
        name: 'clownboard emoji',
        description: 'Set the clown emoji',
        aliases: 'n/a',
        parameters: '(emoji)',
        information: 'MANAGE_GUILD',
        usage: 'clownboard emoji (emoji)',
        example: 'clownboard emoji emoji'
    },
    {
        name: 'clownboard threshold',
        description: 'Set the required reaction count',
        aliases: 'n/a',
        parameters: '(number)',
        information: 'MANAGE_GUILD',
        usage: 'clownboard threshold (number)',
        example: 'clownboard threshold number'
    },
    {
        name: 'clownboard config',
        description: 'View current clownboard settings',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'clownboard config',
        example: 'clownboard config'
    },
    {
        name: 'clownboard reset',
        description: 'Reset all clownboard settings',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'clownboard reset',
        example: 'clownboard reset'
    }
],

    name: 'clownboard',
  aliases: ['cb'],

  run: async (client, message, args) => {
    const sub = (args.shift() || '').toLowerCase();

    if (!sub || sub === 'config') {
      if (needsManageGuild(message)) return;
      const cfg = getConfig(TYPE, message.guild.id);
      return message.channel.send({ embeds: [new EmbedBuilder()
        .setColor(cfg.color)
        .setTitle(`${cfg.emoji} ${LABEL} Configuration`)
        .addFields(
          { name: 'Channel', value: cfg.channel ? `<#${cfg.channel}>` : 'Not set', inline: true },
          { name: 'Emoji', value: cfg.emoji, inline: true },
          { name: 'Threshold', value: `${cfg.threshold}`, inline: true },
          { name: 'Status', value: cfg.locked ? '🔒 Locked' : '🔓 Unlocked', inline: true },
          { name: 'Self Star', value: cfg.selfstar ? 'Enabled' : 'Disabled', inline: true },
          { name: 'Jump URL', value: cfg.jumpurl ? 'Enabled' : 'Disabled', inline: true },
          { name: 'Timestamp', value: cfg.timestamp ? 'Enabled' : 'Disabled', inline: true },
          { name: 'Attachments', value: cfg.attachments ? 'Enabled' : 'Disabled', inline: true },
          { name: 'Color', value: cfg.color, inline: true },
        )
      ] });
    }

    switch (sub) {
      case 'set': {
        if (needsManageGuild(message)) return;
        const id = (args[0] || '').match(/\d{17,19}/)?.[0];
        if (!id) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please mention a valid **channel**`)] });
        const ch = message.guild.channels.cache.get(id);
        if (!ch || !ch.isTextBased()) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: That is not a **text channel**`)] });
        const cfg = getConfig(TYPE, message.guild.id);
        cfg.channel = id;
        saveConfig(TYPE, message.guild.id, cfg);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: ${LABEL} channel set to ${ch}`)] });
      }

      case 'lock': {
        if (needsManageGuild(message)) return;
        const cfg = getConfig(TYPE, message.guild.id);
        cfg.locked = true;
        saveConfig(TYPE, message.guild.id, cfg);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: ${LABEL} has been **locked**`)] });
      }

      case 'unlock': {
        if (needsManageGuild(message)) return;
        const cfg = getConfig(TYPE, message.guild.id);
        cfg.locked = false;
        saveConfig(TYPE, message.guild.id, cfg);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: ${LABEL} has been **unlocked**`)] });
      }

      case 'selfstar': {
        if (needsManageGuild(message)) return;
        const val = parseSetting(args[0]);
        if (val === null) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please use \`on\` or \`off\``)] });
        const cfg = getConfig(TYPE, message.guild.id);
        cfg.selfstar = val;
        saveConfig(TYPE, message.guild.id, cfg);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Self star **${val ? 'enabled' : 'disabled'}**`)] });
      }

      case 'emoji': {
        if (needsManageGuild(message)) return;
        const emoji = args[0];
        if (!emoji) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please provide an **emoji**`)] });
        const cfg = getConfig(TYPE, message.guild.id);
        cfg.emoji = emoji;
        saveConfig(TYPE, message.guild.id, cfg);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: ${LABEL} emoji set to ${emoji}`)] });
      }

      case 'color': {
        if (needsManageGuild(message)) return;
        const parsed = parseColor(args.join(' '));
        if (!parsed) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Invalid **color** — use a hex code or color name`)] });
        const cfg = getConfig(TYPE, message.guild.id);
        cfg.color = parsed;
        saveConfig(TYPE, message.guild.id, cfg);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(parsed).setDescription(`${approve} ${message.author}: ${LABEL} color set to \`${parsed}\``)] });
      }

      case 'jumpurl': {
        if (needsManageGuild(message)) return;
        const val = parseSetting(args[0]);
        if (val === null) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please use \`on\` or \`off\``)] });
        const cfg = getConfig(TYPE, message.guild.id);
        cfg.jumpurl = val;
        saveConfig(TYPE, message.guild.id, cfg);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Jump URL **${val ? 'enabled' : 'disabled'}**`)] });
      }

      case 'threshold': {
        const n = parseInt(args[0]);
        if (isNaN(n) || n < 1) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please provide a valid **number** (1 or more)`)] });
        const cfg = getConfig(TYPE, message.guild.id);
        cfg.threshold = n;
        saveConfig(TYPE, message.guild.id, cfg);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: ${LABEL} threshold set to **${n}**`)] });
      }

      case 'timestamp': {
        if (needsManageGuild(message)) return;
        const val = parseSetting(args[0]);
        if (val === null) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please use \`on\` or \`off\``)] });
        const cfg = getConfig(TYPE, message.guild.id);
        cfg.timestamp = val;
        saveConfig(TYPE, message.guild.id, cfg);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Timestamp **${val ? 'enabled' : 'disabled'}**`)] });
      }

      case 'attachments': {
        if (needsManageGuild(message)) return;
        const val = parseSetting(args[0]);
        if (val === null) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please use \`on\` or \`off\``)] });
        const cfg = getConfig(TYPE, message.guild.id);
        cfg.attachments = val;
        saveConfig(TYPE, message.guild.id, cfg);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Attachments **${val ? 'enabled' : 'disabled'}**`)] });
      }

      case 'ignore': {
        if (needsManageGuild(message)) return;
        if ((args[0] || '').toLowerCase() === 'list') {
          const cfg = getConfig(TYPE, message.guild.id);
          const ig = cfg.ignored;
          const lines = [
            `**Channels:** ${ig.channels.length ? ig.channels.map(c => `<#${c}>`).join(', ') : 'None'}`,
            `**Members:** ${ig.members.length ? ig.members.map(m => `<@${m}>`).join(', ') : 'None'}`,
            `**Roles:** ${ig.roles.length ? ig.roles.map(r => `<@&${r}>`).join(', ') : 'None'}`,
          ];
          return message.channel.send({ embeds: [new EmbedBuilder().setColor(cfg.color).setTitle(`${cfg.emoji} ${LABEL} · Ignored`).setDescription(lines.join('\n'))] });
        }

        const target = resolveIgnoreTarget(message, args);
        if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Mention a valid **channel**, **member**, or **role**`)] });
        const cfg = getConfig(TYPE, message.guild.id);
        const list = cfg.ignored[`${target.type}s`];
        const idx = list.indexOf(target.id);
        if (idx !== -1) {
          list.splice(idx, 1);
          saveConfig(TYPE, message.guild.id, cfg);
          return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Removed from ignored ${target.type}s`)] });
        } else {
          list.push(target.id);
          saveConfig(TYPE, message.guild.id, cfg);
          return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Added to ignored ${target.type}s`)] });
        }
      }

      case 'reset': {
        if (needsManageGuild(message)) return;
        resetConfig(TYPE, message.guild.id);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: ${LABEL} configuration has been **reset**`)] });
      }

      default: {
        let prefix = db.get(`prefix_${message.guild.id}`);
        if (prefix === null) prefix = require('../config.json').default_prefix;
        return paginate(message, [
          { name: 'clownboard', description: 'View clownboard configuration', aliases: 'cb', parameters: 'n/a', information: 'MANAGE_GUILD', usage: `${prefix}clownboard`, example: `${prefix}clownboard` },
          { name: 'clownboard set', description: 'Set the clownboard channel', aliases: 'n/a', parameters: '(#channel)', information: 'MANAGE_GUILD', usage: `${prefix}clownboard set #channel`, example: `${prefix}clownboard set #clownboard` },
          { name: 'clownboard emoji', description: 'Set the clownboard reaction emoji', aliases: 'n/a', parameters: '(emoji)', information: 'MANAGE_GUILD', usage: `${prefix}clownboard emoji 🤡`, example: `${prefix}clownboard emoji 🤡` },
          { name: 'clownboard threshold', description: 'Set the number of reactions needed', aliases: 'n/a', parameters: '(number)', information: 'MANAGE_GUILD', usage: `${prefix}clownboard threshold 3`, example: `${prefix}clownboard threshold 3` },
          { name: 'clownboard color', description: 'Set the clownboard embed color', aliases: 'n/a', parameters: '(color)', information: 'MANAGE_GUILD', usage: `${prefix}clownboard color #FF6A00`, example: `${prefix}clownboard color #FF6A00` },
          { name: 'clownboard selfstar', description: 'Allow or deny self-reacting on messages', aliases: 'n/a', parameters: '(on/off)', information: 'MANAGE_GUILD', usage: `${prefix}clownboard selfstar on`, example: `${prefix}clownboard selfstar off` },
          { name: 'clownboard jumpurl', description: 'Show or hide jump URL in clownboard posts', aliases: 'n/a', parameters: '(on/off)', information: 'MANAGE_GUILD', usage: `${prefix}clownboard jumpurl on`, example: `${prefix}clownboard jumpurl on` },
          { name: 'clownboard timestamp', description: 'Show or hide timestamp in clownboard posts', aliases: 'n/a', parameters: '(on/off)', information: 'MANAGE_GUILD', usage: `${prefix}clownboard timestamp on`, example: `${prefix}clownboard timestamp on` },
          { name: 'clownboard attachments', description: 'Show or hide attachments in clownboard posts', aliases: 'n/a', parameters: '(on/off)', information: 'MANAGE_GUILD', usage: `${prefix}clownboard attachments on`, example: `${prefix}clownboard attachments on` },
          { name: 'clownboard lock', description: 'Lock the clownboard (no new entries)', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: `${prefix}clownboard lock`, example: `${prefix}clownboard lock` },
          { name: 'clownboard unlock', description: 'Unlock the clownboard', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: `${prefix}clownboard unlock`, example: `${prefix}clownboard unlock` },
          { name: 'clownboard ignore', description: 'Ignore or un-ignore a channel, member, or role', aliases: 'n/a', parameters: '(#channel | @member | @role)', information: 'MANAGE_GUILD', usage: `${prefix}clownboard ignore #channel`, example: `${prefix}clownboard ignore #no-clown` },
          { name: 'clownboard reset', description: 'Reset all clownboard settings', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: `${prefix}clownboard reset`, example: `${prefix}clownboard reset` },
        ], 'starboard');
      }
    }
  }
};
