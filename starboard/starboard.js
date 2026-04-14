const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getConfig, saveConfig, resetConfig, parseSetting, parseColor } = require('./boardHelper');
const { color } = require('../config.json');
const { approve, warn } = require('../emojis.json');
const { paginate } = require('../utils/paginate');
const db = require('../db');

const TYPE = 'starboard';
const LABEL = 'Starboard';

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
  name: 'starboard',
  aliases: ['sb'],
  category: 'starboard',
  help: [
    { name: 'starboard', description: 'Manage the starboard system', aliases: 'sb', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'starboard', example: 'starboard' },
    { name: 'starboard set', description: 'Set the starboard channel', aliases: 'n/a', parameters: '(channel)', information: 'MANAGE_GUILD', usage: 'starboard set #channel', example: 'starboard set #starboard' },
    { name: 'starboard emoji', description: 'Set the star emoji', aliases: 'n/a', parameters: '(emoji)', information: 'MANAGE_GUILD', usage: 'starboard emoji (emoji)', example: 'starboard emoji ⭐' },
    { name: 'starboard threshold', description: 'Set the required reaction count', aliases: 'n/a', parameters: '(number)', information: 'MANAGE_GUILD', usage: 'starboard threshold (number)', example: 'starboard threshold 3' },
    { name: 'starboard config', description: 'View current starboard settings', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'starboard config', example: 'starboard config' },
    { name: 'starboard reset', description: 'Reset all starboard settings', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'starboard reset', example: 'starboard reset' },
  ],

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
          { name: 'starboard', description: 'View starboard configuration', aliases: 'sb', parameters: 'n/a', information: 'MANAGE_GUILD', usage: `${prefix}starboard`, example: `${prefix}starboard` },
          { name: 'starboard set', description: 'Set the starboard channel', aliases: 'n/a', parameters: '(#channel)', information: 'MANAGE_GUILD', usage: `${prefix}starboard set #channel`, example: `${prefix}starboard set #starboard` },
          { name: 'starboard emoji', description: 'Set the starboard reaction emoji', aliases: 'n/a', parameters: '(emoji)', information: 'MANAGE_GUILD', usage: `${prefix}starboard emoji ⭐`, example: `${prefix}starboard emoji ⭐` },
          { name: 'starboard threshold', description: 'Set the number of reactions needed', aliases: 'n/a', parameters: '(number)', information: 'MANAGE_GUILD', usage: `${prefix}starboard threshold 3`, example: `${prefix}starboard threshold 3` },
          { name: 'starboard color', description: 'Set the starboard embed color', aliases: 'n/a', parameters: '(color)', information: 'MANAGE_GUILD', usage: `${prefix}starboard color #FFD700`, example: `${prefix}starboard color #FFD700` },
          { name: 'starboard selfstar', description: 'Allow or deny self-starring messages', aliases: 'n/a', parameters: '(on/off)', information: 'MANAGE_GUILD', usage: `${prefix}starboard selfstar on`, example: `${prefix}starboard selfstar off` },
          { name: 'starboard jumpurl', description: 'Show or hide jump URL in starboard posts', aliases: 'n/a', parameters: '(on/off)', information: 'MANAGE_GUILD', usage: `${prefix}starboard jumpurl on`, example: `${prefix}starboard jumpurl on` },
          { name: 'starboard timestamp', description: 'Show or hide timestamp in starboard posts', aliases: 'n/a', parameters: '(on/off)', information: 'MANAGE_GUILD', usage: `${prefix}starboard timestamp on`, example: `${prefix}starboard timestamp on` },
          { name: 'starboard attachments', description: 'Show or hide attachments in starboard posts', aliases: 'n/a', parameters: '(on/off)', information: 'MANAGE_GUILD', usage: `${prefix}starboard attachments on`, example: `${prefix}starboard attachments on` },
          { name: 'starboard lock', description: 'Lock the starboard (no new entries)', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: `${prefix}starboard lock`, example: `${prefix}starboard lock` },
          { name: 'starboard unlock', description: 'Unlock the starboard', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: `${prefix}starboard unlock`, example: `${prefix}starboard unlock` },
          { name: 'starboard ignore', description: 'Ignore or un-ignore a channel, member, or role', aliases: 'n/a', parameters: '(#channel | @member | @role)', information: 'MANAGE_GUILD', usage: `${prefix}starboard ignore #channel`, example: `${prefix}starboard ignore #no-star` },
          { name: 'starboard reset', description: 'Reset all starboard settings', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: `${prefix}starboard reset`, example: `${prefix}starboard reset` },
        ], 'starboard');
      }
    }
  }
};
