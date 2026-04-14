const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve, deny } = require('../emojis.json');
const { paginate } = require('../utils/paginate');

function cfg(guildId) { return db.get(`antinuke.${guildId}`) || {}; }
function saveCfg(guildId, data) { db.set(`antinuke.${guildId}`, data); }

function parseFlags(args) {
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--threshold' && args[i + 1]) flags.threshold = parseInt(args[++i]);
    if (args[i] === '--interval' && args[i + 1]) flags.interval = parseInt(args[++i]);
    if (args[i] === '--punishment' && args[i + 1]) flags.punishment = args[++i].toLowerCase();
  }
  return flags;
}

const MODULES = [
  'ban', 'kick', 'role', 'channel', 'botadd', 'invite', 'webhook',
  'emoji', 'sticker', 'vanity', 'guildupdate', 'integration',
  'integrationdelete', 'integrationcreate', 'integrationupdate', 'soundboard'
];

module.exports = {
  name: 'antinuke',
  aliases: ['an'],
  category: 'security',
  help: [
    { name: 'antinuke', description: 'Manage the AntiNuke protection system', aliases: 'an', parameters: 'n/a', information: 'ADMINISTRATOR', usage: 'antinuke', example: 'antinuke' },
    { name: 'antinuke enable', description: 'Enable the AntiNuke system', aliases: 'n/a', parameters: 'n/a', information: 'ADMINISTRATOR', usage: 'antinuke enable', example: 'antinuke enable' },
    { name: 'antinuke disable', description: 'Disable the AntiNuke system', aliases: 'n/a', parameters: 'n/a', information: 'ADMINISTRATOR', usage: 'antinuke disable', example: 'antinuke disable' },
    { name: 'antinuke config', description: 'View full AntiNuke configuration', aliases: 'n/a', parameters: 'n/a', information: 'ADMINISTRATOR', usage: 'antinuke config', example: 'antinuke config' },
    { name: 'antinuke list', description: 'View enabled modules and whitelist', aliases: 'n/a', parameters: 'n/a', information: 'ADMINISTRATOR', usage: 'antinuke list', example: 'antinuke list' },
    { name: 'antinuke admin', description: 'Add or remove antinuke admins', aliases: 'an admin', parameters: 'user', information: 'Antinuke Admin', usage: 'antinuke admin (user)', example: 'antinuke admin @user' },
    { name: 'antinuke admins', description: 'List all AntiNuke admins', aliases: 'n/a', parameters: 'n/a', information: 'ADMINISTRATOR', usage: 'antinuke admins', example: 'antinuke admins' },
    { name: 'antinuke whitelist', description: 'Whitelist a user from AntiNuke', aliases: 'wl', parameters: '(user id)', information: 'ADMINISTRATOR', usage: 'antinuke whitelist (user id)', example: 'antinuke whitelist 123456789' },
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You need **Administrator** permission.`)] });

    const sub = (args[0] || '').toLowerCase();
    const guildId = message.guild.id;
    let c = cfg(guildId);

    // ── ENABLE / DISABLE ──────────────────────────────────────────────────────
    if (sub === 'enable') {
      c.enabled = true;
      saveCfg(guildId, c);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: AntiNuke system **enabled**.`)] });
    }
    if (sub === 'disable') {
      c.enabled = false;
      saveCfg(guildId, c);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: AntiNuke system **disabled**.`)] });
    }

    // ── CONFIG ────────────────────────────────────────────────────────────────
    if (sub === 'config') {
      const lines = MODULES.map(m => {
        const mod = c[m];
        return `**${m}** — ${mod?.enabled ? `✅ Threshold: ${mod.threshold || 3} → ${mod.punishment || 'ban'}` : '❌ Disabled'}`;
      });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('🛡️ AntiNuke Configuration').setDescription(`**Status:** ${c.enabled ? '✅ Enabled' : '❌ Disabled'}\n\n${lines.join('\n')}`).setTimestamp()] });
    }

    // ── LIST ──────────────────────────────────────────────────────────────────
    if (sub === 'list') {
      const enabled = MODULES.filter(m => c[m]?.enabled);
      const whitelist = (c.whitelist || []).map(id => `<@${id}>`).join(', ') || 'None';
      const admins = (c.admins || []).map(id => `<@${id}>`).join(', ') || 'None';
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('🛡️ AntiNuke — Active Modules').addFields({ name: 'Enabled Modules', value: enabled.length ? enabled.join(', ') : 'None' }, { name: 'Whitelist', value: whitelist }, { name: 'Admins', value: admins })] });
    }

    // ── ADMINS ────────────────────────────────────────────────────────────────
    if (sub === 'admins') {
      const list = c.admins || [];
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('🛡️ AntiNuke Admins').setDescription(list.length ? list.map(id => `<@${id}> (${id})`).join('\n') : 'No admins set.')] });
    }

    // ── ADMIN ─────────────────────────────────────────────────────────────────
    if (sub === 'admin') {
      const target = message.mentions.members.first() || message.guild.members.cache.get(args[1]);
      if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Mention a user to add/remove as AntiNuke admin.`)] });
      c.admins = c.admins || [];
      if (c.admins.includes(target.id)) {
        c.admins = c.admins.filter(id => id !== target.id);
        saveCfg(guildId, c);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: **${target.user.username}** removed from AntiNuke admins.`)] });
      }
      c.admins.push(target.id);
      saveCfg(guildId, c);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: **${target.user.username}** added as AntiNuke admin.`)] });
    }

    // ── WHITELIST ─────────────────────────────────────────────────────────────
    if (sub === 'whitelist') {
      const userId = args[1]?.replace(/\D/g, '');
      if (!userId) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Provide a user ID.`)] });
      c.whitelist = c.whitelist || [];
      if (c.whitelist.includes(userId)) {
        c.whitelist = c.whitelist.filter(id => id !== userId);
        saveCfg(guildId, c);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: <@${userId}> removed from AntiNuke whitelist.`)] });
      }
      c.whitelist.push(userId);
      saveCfg(guildId, c);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: <@${userId}> added to AntiNuke whitelist.`)] });
    }

    // ── MODULE COMMANDS (ban, kick, role, channel, etc.) ──────────────────────
    if (MODULES.includes(sub)) {
      const status = (args[1] || '').toLowerCase();
      const flags = parseFlags(args.slice(2));
      if (!['enable', 'disable', 'on', 'off'].includes(status))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Usage: \`antinuke ${sub} <enable|disable> [--threshold <n>] [--punishment <ban|kick|strip>]\``)] });
      c[sub] = {
        enabled: status === 'enable' || status === 'on',
        threshold: flags.threshold || c[sub]?.threshold || 3,
        interval: flags.interval || c[sub]?.interval || 10,
        punishment: flags.punishment || c[sub]?.punishment || 'ban',
      };
      saveCfg(guildId, c);
      const descriptions = {
        ban: 'Mass ban protection',
        kick: 'Mass kick protection',
        role: 'Role deletion protection',
        channel: 'Channel creation/deletion protection',
        botadd: 'Bot add protection',
        invite: 'Invite creation protection',
        webhook: 'Webhook creation protection',
        emoji: 'Emoji deletion protection',
        sticker: 'Sticker deletion protection',
        vanity: 'Vanity URL protection',
        guildupdate: 'Guild update protection',
        integration: 'Integration protection',
        integrationdelete: 'Integration delete protection',
        integrationcreate: 'Integration create protection',
        integrationupdate: 'Integration update protection',
        soundboard: 'Soundboard protection',
      };
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: **${descriptions[sub] || sub}** **${c[sub].enabled ? 'enabled' : 'disabled'}** — Threshold: ${c[sub].threshold}/${c[sub].interval}s → **${c[sub].punishment}**.`)] });
    }

    // ── DEFAULT ───────────────────────────────────────────────────────────────
    let prefix = db.get(`prefix_${message.guild.id}`);
    if (prefix === null) prefix = require('../config.json').default_prefix;
    return paginate(message, [
      { name: 'antinuke', description: 'View antinuke configuration', aliases: 'an', parameters: 'n/a', information: 'ADMINISTRATOR', usage: `${prefix}antinuke`, example: `${prefix}antinuke` },
      { name: 'antinuke enable', description: 'Enable the antinuke system', aliases: 'n/a', parameters: 'n/a', information: 'ADMINISTRATOR', usage: `${prefix}antinuke enable`, example: `${prefix}antinuke enable` },
      { name: 'antinuke disable', description: 'Disable the antinuke system', aliases: 'n/a', parameters: 'n/a', information: 'ADMINISTRATOR', usage: `${prefix}antinuke disable`, example: `${prefix}antinuke disable` },
      { name: 'antinuke config', description: 'View all antinuke module settings', aliases: 'n/a', parameters: 'n/a', information: 'ADMINISTRATOR', usage: `${prefix}antinuke config`, example: `${prefix}antinuke config` },
      { name: 'antinuke list', description: 'List active antinuke modules and whitelist', aliases: 'n/a', parameters: 'n/a', information: 'ADMINISTRATOR', usage: `${prefix}antinuke list`, example: `${prefix}antinuke list` },
      { name: 'antinuke admin', description: 'Add or remove an antinuke admin', aliases: 'n/a', parameters: '(user)', information: 'ADMINISTRATOR', usage: `${prefix}antinuke admin @user`, example: `${prefix}antinuke admin @four` },
      { name: 'antinuke admins', description: 'View all antinuke admins', aliases: 'n/a', parameters: 'n/a', information: 'ADMINISTRATOR', usage: `${prefix}antinuke admins`, example: `${prefix}antinuke admins` },
      { name: 'antinuke whitelist', description: 'Add or remove a user from the antinuke whitelist', aliases: 'n/a', parameters: '(user id)', information: 'ADMINISTRATOR', usage: `${prefix}antinuke whitelist (user id)`, example: `${prefix}antinuke whitelist 123456789` },
      { name: 'antinuke <module>', description: 'Enable or disable a specific antinuke module (ban, kick, role, channel, botadd, invite, webhook, emoji, sticker, vanity, guildupdate, integration)', aliases: 'n/a', parameters: '(module) (enable/disable) [--threshold n] [--punishment ban/kick/strip]', information: 'ADMINISTRATOR', usage: `${prefix}antinuke ban enable --threshold 3`, example: `${prefix}antinuke ban enable --threshold 3 --punishment ban` },
    ], 'security');
  }
};
