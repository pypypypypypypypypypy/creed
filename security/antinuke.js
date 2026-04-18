const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color, default_prefix } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { paginate } = require('../utils/paginate');

function cfg(guildId) {
  return db.get(`antinuke.${guildId}`) || {};
}

function saveCfg(guildId, data) {
  db.set(`antinuke.${guildId}`, data);
}

function getPrefix(guildId) {
  return db.get(`prefix_${guildId}`) || default_prefix;
}

function parseFlags(args) {
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i]?.toLowerCase();
    const value = args[i + 1];
    if ((key === '--threshold' || key === '-t') && value) flags.threshold = Number.parseInt(args[++i], 10);
    else if ((key === '--interval' || key === '-i') && value) flags.interval = Number.parseInt(args[++i], 10);
    else if ((key === '--punishment' || key === '--do' || key === '-p') && value) flags.punishment = args[++i].toLowerCase();
    else if ((key === '--command' || key === '--commands') && value) flags.command = args[++i].toLowerCase();
  }
  return flags;
}

const MODULES = [
  'ban', 'kick', 'role', 'channel', 'botadd', 'invite', 'webhook',
  'emoji', 'sticker', 'vanity', 'guildupdate', 'integration',
  'integrationcreate', 'integrationdelete', 'integrationupdate', 'soundboard'
];

const MODULE_ALIASES = {
  guild: 'guildupdate',
  integrations: 'integration',
  integrationremove: 'integrationdelete',
  integrationadd: 'integrationcreate',
};

const MODULE_DESCRIPTIONS = {
  ban: 'Configure mass ban protection',
  kick: 'Configure mass kick protection',
  role: 'Configure role deletion protection',
  channel: 'Configure channel creation/deletion protection',
  botadd: 'Configure bot add protection',
  invite: 'Configure invite creation protection',
  webhook: 'Configure webhook creation protection',
  emoji: 'Configure emoji deletion protection',
  sticker: 'Configure sticker deletion protection',
  vanity: 'Configure vanity URL protection',
  guildupdate: 'Configure guild update protection',
  integration: 'Configure integration protection',
  integrationcreate: 'Configure integration creation protection',
  integrationdelete: 'Configure integration deletion protection',
  integrationupdate: 'Configure integration update protection',
  soundboard: 'Configure soundboard protection',
};

const PUNISHMENTS = ['ban', 'kick', 'timeout', 'strip', 'stripstaff', 'jail'];

function moduleHelp(name, prefix) {
  const commandFlag = name === 'ban' || name === 'kick' || name === 'role';
  const exampleFlags = commandFlag ? '--do ban --threshold 3 --command on' : name === 'botadd' ? '--do kick --threshold 2' : '--do ban --threshold 5';
  return {
    name: `antinuke ${name}`,
    description: MODULE_DESCRIPTIONS[name] || `Configure ${name} protection`,
    aliases: `an ${name}`,
    parameters: name === 'botadd' ? 'status' : 'status, flags',
    information: 'Antinuke Admin',
    usage: `${prefix}antinuke ${name} (status)${name === 'botadd' ? '' : ' [flags]'}`,
    example: `${prefix}antinuke ${name} on ${exampleFlags}`,
    flags: [
      '--do (punishment) — Set punishment type: ban, kick, timeout, strip, stripstaff, jail',
      '--threshold (number) — Number of actions before punishment',
      ...(commandFlag ? ['--command (on/off) — Track bot commands in addition to audit log'] : []),
    ].join('\n'),
  };
}

function helpPages(prefix) {
  return [
    { name: 'antinuke', description: 'Manage the antinuke protection system', aliases: 'an', parameters: 'subcommand', information: 'Antinuke Admin', usage: `${prefix}antinuke`, example: `${prefix}antinuke` },
    { name: 'antinuke admin', description: 'Add or remove antinuke admins', aliases: 'an admin', parameters: 'user', information: 'Antinuke Admin', usage: `${prefix}antinuke admin (user)`, example: `${prefix}antinuke admin @user` },
    { name: 'antinuke admins', description: 'List all antinuke admins', aliases: 'an admins', parameters: 'n/a', information: 'n/a', usage: `${prefix}antinuke admins`, example: `${prefix}antinuke admins` },
    moduleHelp('ban', prefix),
    moduleHelp('botadd', prefix),
    moduleHelp('channel', prefix),
    { name: 'antinuke config', description: 'View the current antinuke configuration', aliases: 'an config', parameters: 'n/a', information: 'n/a', usage: `${prefix}antinuke config`, example: `${prefix}antinuke config` },
    { name: 'antinuke disable', description: 'Disable the antinuke system for this server', aliases: 'off, an disable', parameters: 'n/a', information: 'Antinuke Admin', usage: `${prefix}antinuke disable`, example: `${prefix}antinuke disable` },
    moduleHelp('emoji', prefix),
    { name: 'antinuke enable', description: 'Enable the antinuke system for this server', aliases: 'on, an enable', parameters: 'n/a', information: 'Antinuke Admin', usage: `${prefix}antinuke enable`, example: `${prefix}antinuke enable` },
    moduleHelp('guildupdate', prefix),
    moduleHelp('integration', prefix),
    moduleHelp('integrationcreate', prefix),
    moduleHelp('integrationdelete', prefix),
    moduleHelp('integrationupdate', prefix),
    moduleHelp('invite', prefix),
    moduleHelp('kick', prefix),
    { name: 'antinuke list', description: 'List all enabled antinuke modules and whitelisted users', aliases: 'an list', parameters: 'n/a', information: 'n/a', usage: `${prefix}antinuke list`, example: `${prefix}antinuke list` },
    moduleHelp('role', prefix),
    moduleHelp('soundboard', prefix),
    moduleHelp('sticker', prefix),
    moduleHelp('vanity', prefix),
    moduleHelp('webhook', prefix),
    { name: 'antinuke whitelist', description: 'Add or remove users from the antinuke whitelist', aliases: 'wl, an whitelist', parameters: 'user id', information: 'Antinuke Admin', usage: `${prefix}antinuke whitelist (user id)`, example: `${prefix}antinuke whitelist 123456789` },
  ];
}

function hasAdminAccess(message, data) {
  if (message.member?.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return Array.isArray(data.admins) && data.admins.includes(message.author.id);
}

function noAccess(message) {
  return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You need **Administrator** permission.`)] });
}

module.exports = {
  name: 'antinuke',
  aliases: ['an'],
  category: 'security',
  help: helpPages(default_prefix),

  run: async (client, message, args) => {
    const guildId = message.guild.id;
    const prefix = getPrefix(guildId);
    const subRaw = (args[0] || '').toLowerCase();
    const sub = MODULE_ALIASES[subRaw] || subRaw;
    let c = cfg(guildId);

    if (!sub || sub === 'help') return paginate(message, helpPages(prefix), 'security');
    if (!hasAdminAccess(message, c)) return noAccess(message);

    if (sub === 'enable' || sub === 'on') {
      c.enabled = true;
      saveCfg(guildId, c);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Antinuke system **enabled**.`)] });
    }

    if (sub === 'disable' || sub === 'off') {
      c.enabled = false;
      saveCfg(guildId, c);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Antinuke system **disabled**.`)] });
    }

    if (sub === 'config') {
      const lines = MODULES.map(name => {
        const mod = c[name];
        return `**${name}** — ${mod?.enabled ? `Enabled | threshold ${mod.threshold || 3}/${mod.interval || 10}s | ${mod.punishment || 'ban'}` : 'Disabled'}`;
      });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Antinuke Configuration').setDescription(`**Status:** ${c.enabled ? 'Enabled' : 'Disabled'}\n\n${lines.join('\n')}`).setTimestamp()] });
    }

    if (sub === 'list') {
      const enabled = MODULES.filter(name => c[name]?.enabled);
      const whitelist = (c.whitelist || []).map(id => `<@${id}>`).join(', ') || 'None';
      const admins = (c.admins || []).map(id => `<@${id}>`).join(', ') || 'None';
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Antinuke List').addFields({ name: 'Enabled Modules', value: enabled.length ? enabled.join(', ') : 'None' }, { name: 'Whitelist', value: whitelist }, { name: 'Admins', value: admins })] });
    }

    if (sub === 'admins') {
      const list = c.admins || [];
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Antinuke Admins').setDescription(list.length ? list.map(id => `<@${id}> (${id})`).join('\n') : 'No antinuke admins set.')] });
    }

    if (sub === 'admin') {
      const id = args[1]?.replace(/\D/g, '');
      const target = message.mentions.members.first() || (id ? await message.guild.members.fetch(id).catch(() => null) : null);
      if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Mention a user or provide their ID.`)] });
      c.admins = c.admins || [];
      if (c.admins.includes(target.id)) {
        c.admins = c.admins.filter(userId => userId !== target.id);
        saveCfg(guildId, c);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: **${target.user.username}** removed from antinuke admins.`)] });
      }
      c.admins.push(target.id);
      saveCfg(guildId, c);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: **${target.user.username}** added as an antinuke admin.`)] });
    }

    if (sub === 'whitelist' || sub === 'wl') {
      const userId = args[1]?.replace(/\D/g, '');
      if (!userId) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Provide a user ID.`)] });
      c.whitelist = c.whitelist || [];
      if (c.whitelist.includes(userId)) {
        c.whitelist = c.whitelist.filter(id => id !== userId);
        saveCfg(guildId, c);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: <@${userId}> removed from the antinuke whitelist.`)] });
      }
      c.whitelist.push(userId);
      saveCfg(guildId, c);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: <@${userId}> added to the antinuke whitelist.`)] });
    }

    if (MODULES.includes(sub)) {
      const status = (args[1] || '').toLowerCase();
      const flags = parseFlags(args.slice(2));
      if (!['enable', 'disable', 'on', 'off'].includes(status)) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}antinuke ${sub} <on|off> [--do punishment] [--threshold number]\``)] });
      }
      if (flags.threshold !== undefined && (!Number.isFinite(flags.threshold) || flags.threshold < 1)) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Threshold must be a number greater than 0.`)] });
      }
      if (flags.interval !== undefined && (!Number.isFinite(flags.interval) || flags.interval < 1)) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Interval must be a number greater than 0.`)] });
      }
      if (flags.punishment && !PUNISHMENTS.includes(flags.punishment)) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Punishment must be one of: ${PUNISHMENTS.join(', ')}.`)] });
      }
      c[sub] = {
        enabled: status === 'enable' || status === 'on',
        threshold: flags.threshold || c[sub]?.threshold || 3,
        interval: flags.interval || c[sub]?.interval || 10,
        punishment: flags.punishment || c[sub]?.punishment || 'ban',
        command: flags.command || c[sub]?.command || 'off',
      };
      saveCfg(guildId, c);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: **${MODULE_DESCRIPTIONS[sub] || sub}** is now **${c[sub].enabled ? 'on' : 'off'}** — threshold ${c[sub].threshold}/${c[sub].interval}s, punishment **${c[sub].punishment}**.`)] });
    }

    return paginate(message, helpPages(prefix), 'security');
  }
};
