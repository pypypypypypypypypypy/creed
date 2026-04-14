const { EmbedBuilder, PermissionFlagsBits, PermissionsBitField } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve, deny } = require('../emojis.json');
const { paginate } = require('../utils/paginate');

const ALL_PERMS = Object.keys(PermissionFlagsBits);

module.exports = {
  name: 'fakepermissions',
  aliases: ['fp', 'fakeperm', 'fakeperms'],
  category: 'security',
  help: [
    { name: 'fakepermissions', description: 'Manage fake permissions for roles', aliases: 'fp, fakeperm, fakeperms', parameters: 'n/a', information: 'ADMINISTRATOR', usage: 'fakepermissions', example: 'fakepermissions' },
    { name: 'fakepermissions add', description: 'Grant fake permissions to a role', aliases: 'n/a', parameters: '(role) (permissions)', information: 'ADMINISTRATOR', usage: 'fakepermissions add (role) (permissions)', example: 'fakepermissions add @Mod ban_members kick_members' },
    { name: 'fakepermissions remove', description: 'Remove fake permissions from a role', aliases: 'n/a', parameters: '(role)', information: 'ADMINISTRATOR', usage: 'fakepermissions remove (role)', example: 'fakepermissions remove @Mod' },
    { name: 'fakepermissions list', description: 'List all fake permissions', aliases: 'n/a', parameters: 'n/a', information: 'ADMINISTRATOR', usage: 'fakepermissions list', example: 'fakepermissions list' },
    { name: 'fakepermissions reset', description: 'Reset all fake permissions', aliases: 'n/a', parameters: 'n/a', information: 'ADMINISTRATOR', usage: 'fakepermissions reset', example: 'fakepermissions reset' },
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You need **Administrator** permission.`)] });

    const sub = (args[0] || '').toLowerCase();
    const guildId = message.guild.id;

    function loadFP() { return db.get(`fakepermissions.${guildId}`) || {}; }
    function saveFP(data) { db.set(`fakepermissions.${guildId}`, data); }

    // ── ADD ───────────────────────────────────────────────────────────────────
    if (sub === 'add') {
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
      const permsArg = args.slice(2).join(' ');
      if (!role) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Mention a role or provide a role ID.`)] });
      if (!permsArg) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Provide permissions to grant. Example: \`BanMembers KickMembers\``)] });
      const perms = permsArg.split(/\s+/);
      const invalid = perms.filter(p => !ALL_PERMS.includes(p));
      if (invalid.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${deny} Invalid permissions: \`${invalid.join(', ')}\`. Valid: ${ALL_PERMS.slice(0, 10).join(', ')}...`)] });
      const fp = loadFP();
      fp[role.id] = [...new Set([...(fp[role.id] || []), ...perms])];
      saveFP(fp);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Granted fake permissions **${perms.join(', ')}** to <@&${role.id}>.`)] });
    }

    // ── REMOVE ────────────────────────────────────────────────────────────────
    if (sub === 'remove') {
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
      if (!role) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Mention a role or provide a role ID.`)] });
      const fp = loadFP();
      delete fp[role.id];
      saveFP(fp);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Removed all fake permissions from <@&${role.id}>.`)] });
    }

    // ── RESET ─────────────────────────────────────────────────────────────────
    if (sub === 'reset') {
      db.delete(`fakepermissions.${guildId}`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: All fake permissions have been reset.`)] });
    }

    // ── LIST ──────────────────────────────────────────────────────────────────
    if (sub === 'list') {
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
      const fp = loadFP();
      if (role) {
        const perms = fp[role.id] || [];
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Fake Permissions — ${role.name}`).setDescription(perms.length ? perms.map(p => `\`${p}\``).join(', ') : 'No fake permissions for this role.')] });
      }
      const entries = Object.entries(fp);
      if (!entries.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No fake permissions set.`)] });
      const lines = entries.map(([id, perms]) => {
        const r = message.guild.roles.cache.get(id);
        return `**${r?.name || id}**: ${perms.map(p => `\`${p}\``).join(', ')}`;
      });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Fake Permissions').setDescription(lines.join('\n'))] });
    }

    // ── DEFAULT ───────────────────────────────────────────────────────────────
    let prefix = db.get(`prefix_${message.guild.id}`);
    if (prefix === null) prefix = require('../config.json').default_prefix;
    return paginate(message, [
      { name: 'fakepermissions', description: 'Manage fake permissions for roles', aliases: 'fp, fakeperm, fakeperms', parameters: 'n/a', information: 'ADMINISTRATOR', usage: `${prefix}fakepermissions`, example: `${prefix}fakepermissions` },
      { name: 'fakepermissions add', description: 'Grant fake permissions to a role', aliases: 'n/a', parameters: '(@role) (permissions)', information: 'ADMINISTRATOR', usage: `${prefix}fakepermissions add @role BanMembers KickMembers`, example: `${prefix}fakepermissions add @Moderator BanMembers` },
      { name: 'fakepermissions remove', description: 'Remove all fake permissions from a role', aliases: 'n/a', parameters: '(@role)', information: 'ADMINISTRATOR', usage: `${prefix}fakepermissions remove @role`, example: `${prefix}fakepermissions remove @Moderator` },
      { name: 'fakepermissions list', description: 'View fake permissions for all roles or a specific role', aliases: 'n/a', parameters: '[@role]', information: 'ADMINISTRATOR', usage: `${prefix}fakepermissions list`, example: `${prefix}fakepermissions list @Moderator` },
      { name: 'fakepermissions reset', description: 'Reset all fake permissions for the server', aliases: 'n/a', parameters: 'n/a', information: 'ADMINISTRATOR', usage: `${prefix}fakepermissions reset`, example: `${prefix}fakepermissions reset` },
    ], 'security');
  }
};
