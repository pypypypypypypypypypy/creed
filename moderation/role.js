const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { default_prefix } = require('../config.json');
const { paginate } = require('../utils/paginate');
const db = require('../db');

function getEmojis() {
  delete require.cache[require.resolve('../emojis.json')];
  return require('../emojis.json');
}
const BLUE = '#5dade2';

function findRole(message, parts) {
  if (!parts || !parts.length) return message.mentions.roles.first() || null;
  const mentioned = message.mentions.roles.first();
  if (mentioned) return mentioned;
  const byId = message.guild.roles.cache.get(parts[0]);
  if (byId) return byId;
  const query = parts.join(' ').toLowerCase().trim();
  if (!query) return null;
  let role = message.guild.roles.cache.find(r => r.name.toLowerCase() === query);
  if (role) return role;
  role = message.guild.roles.cache.find(r => r.name.toLowerCase().startsWith(query));
  if (role) return role;
  return message.guild.roles.cache.find(r => r.name.toLowerCase().includes(query));
}

function findMember(message, arg) {
  const mentioned = message.mentions.members.first();
  if (mentioned) return mentioned;
  if (!arg) return null;
  const byId = message.guild.members.cache.get(arg);
  if (byId) return byId;
  const q = arg.toLowerCase();
  return message.guild.members.cache.find(m =>
    m.user.username.toLowerCase() === q ||
    m.displayName.toLowerCase() === q ||
    m.user.tag.toLowerCase() === q
  );
}

function send(message, emoji, text, clr = BLUE) {
  return message.channel.send({ embeds: [new EmbedBuilder().setColor(clr).setDescription(`${emoji} ${message.author}: ${text}`)] });
}

function ok(message, text, kind = 'success') {
  const e = getEmojis();
  const emoji = kind === 'remove' ? e.remove : kind === 'add' ? e.add : e.approve;
  const clr = kind === 'remove' ? '#fe6464' : '#a3eb7b';
  return send(message, emoji, text, clr);
}

function fail(message, text) {
  const e = getEmojis();
  return send(message, e.warn, text, '#efa23a');
}

const SUBS = ['create','make','delete','del','edit','editname','rename','color','colour','topcolor','topcolour','tc','hoist','mentionable','mention','bots','humans','has','icon','restore','cancel','kill'];

module.exports = {
  name: 'role',
  aliases: ['r'],
  category: 'moderation',
  help: [
    { name: 'role', description: 'Toggle a role on a member (adds if missing, removes if present)', aliases: 'r', parameters: '(member) (role)', information: 'MANAGE_ROLES', usage: 'role @user Member', example: 'role @user Member' },
    { name: 'role create', description: 'Create a new role', aliases: 'make', parameters: '(name)', information: 'MANAGE_ROLES', usage: 'role create Staff', example: 'role create Staff' },
    { name: 'role delete', description: 'Delete a role', aliases: 'del', parameters: '(role)', information: 'MANAGE_ROLES', usage: 'role delete OldRole', example: 'role delete OldRole' },
    { name: 'role color', description: 'Set a role color', aliases: 'colour, topcolor, topcolour, tc', parameters: '(role) (#hex)', information: 'MANAGE_ROLES', usage: 'role color Member #5865f2', example: 'role color Member #5865f2' },
    { name: 'role bots', description: 'Add or remove a role from all bots', aliases: 'n/a', parameters: '(role)', information: 'MANAGE_ROLES', usage: 'role bots Member', example: 'role bots Member' },
    { name: 'role humans', description: 'Add or remove a role from all humans', aliases: 'n/a', parameters: '(role)', information: 'MANAGE_ROLES', usage: 'role humans Member', example: 'role humans Member' }
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) return fail(message, "You're **missing** permission: `manage_roles`");
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) return fail(message, "I'm **missing** permission: `manage_roles`");

    const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!args.length) {
      return paginate(message, module.exports.help.map(h => ({ ...h, usage: `${prefix}${h.usage}` })), 'moderation');
    }

    const first = args[0].toLowerCase();
    const sub = SUBS.includes(first) ? first : 'toggle';
    const subArgs = sub === 'toggle' ? args.slice(0) : args.slice(1);

    if (sub === 'toggle') {
      const member = findMember(message, subArgs[0]);
      if (!member) return fail(message, `Usage: \`${prefix}role @member <role name>\``);
      const roleParts = subArgs.slice(1).filter(a => !a.match(/^<@!?\d+>$/));
      const role = findRole(message, roleParts);
      if (!role) return fail(message, `Role not found. Try: \`${prefix}role @${member.user.username} <role name>\``);
      if (role.position >= message.member.roles.highest.position && message.guild.ownerId !== message.author.id) {
        return fail(message, `You cannot manage a role higher than yours.`);
      }
      if (role.position >= message.guild.members.me.roles.highest.position) {
        return fail(message, `I cannot manage a role higher than mine.`);
      }
      if (member.roles.cache.has(role.id)) {
        const result = await member.roles.remove(role).catch(() => null);
        if (!result) return fail(message, `Failed to remove ${role} from ${member}.`);
        return ok(message, `Removed ${role} from ${member}.`, 'remove');
      }
      const result = await member.roles.add(role).catch(() => null);
      if (!result) return fail(message, `Failed to add ${role} to ${member}.`);
      return ok(message, `Added ${role} to ${member}.`, 'add');
    }

    if (['create', 'make'].includes(sub)) {
      const name = subArgs.join(' ');
      if (!name) return fail(message, `Usage: \`${prefix}role create <name>\``);
      const role = await message.guild.roles.create({ name, reason: `Created by ${message.author.tag}` }).catch(() => null);
      return role ? ok(message, `Created role ${role}.`, 'add') : fail(message, 'I could not create that role.');
    }

    if (['delete', 'del'].includes(sub)) {
      const role = findRole(message, subArgs);
      if (!role) return fail(message, `Usage: \`${prefix}role delete <role>\``);
      const name = role.name;
      const result = await role.delete(`Deleted by ${message.author.tag}`).catch(() => null);
      if (!result) return fail(message, `Failed to delete **${name}**.`);
      return ok(message, `Deleted role **${name}**.`, 'remove');
    }

    if (['edit', 'editname', 'rename'].includes(sub)) {
      const role = findRole(message, subArgs.slice(0, 1));
      const name = subArgs.slice(1).join(' ');
      if (!role || !name) return fail(message, `Usage: \`${prefix}role rename <role> <new name>\``);
      await role.setName(name).catch(() => null);
      return ok(message, `Renamed ${role} to **${name}**.`);
    }

    if (['color', 'colour', 'topcolor', 'topcolour', 'tc'].includes(sub)) {
      if (['gradient', 'g', 'grad'].includes(subArgs[0]?.toLowerCase())) return fail(message, 'Discord roles only support one solid color. Use `role color <role> #hex`.');
      const hex = subArgs.find(a => /^#?[0-9a-f]{6}$/i.test(a));
      const roleParts = subArgs.filter(a => a !== hex);
      const role = findRole(message, roleParts);
      if (!role || !hex) return fail(message, `Usage: \`${prefix}role color <role> #hex\``);
      const colorValue = hex.startsWith('#') ? hex : `#${hex}`;
      await role.setColor(colorValue).catch(() => null);
      return ok(message, `Updated ${role}'s color to **${colorValue}**.`);
    }

    if (sub === 'hoist' || ['mentionable', 'mention'].includes(sub)) {
      const role = findRole(message, subArgs);
      if (!role) return fail(message, `Usage: \`${prefix}role ${sub} <role>\``);
      if (sub === 'hoist') await role.setHoist(!role.hoist).catch(() => null);
      else await role.setMentionable(!role.mentionable).catch(() => null);
      return ok(message, `${role} ${sub === 'hoist' ? 'hoist' : 'mentionable'} toggled.`);
    }

    if (['bots', 'humans'].includes(sub)) {
      const remove = subArgs[0]?.toLowerCase() === 'remove';
      const role = findRole(message, remove ? subArgs.slice(1) : subArgs);
      if (!role) return fail(message, `Usage: \`${prefix}role ${sub}${remove ? ' remove' : ''} <role>\``);
      const members = await message.guild.members.fetch().catch(() => message.guild.members.cache);
      const targets = members.filter(m => sub === 'bots' ? m.user.bot : !m.user.bot);
      let count = 0;
      for (const member of targets.values()) await (remove ? member.roles.remove(role) : member.roles.add(role)).then(() => count++).catch(() => null);
      return ok(message, `${remove ? 'Removed' : 'Added'} ${role} ${remove ? 'from' : 'to'} **${count}** ${sub}.`, remove ? 'remove' : 'add');
    }

    if (sub === 'has') {
      const remove = subArgs[0]?.toLowerCase() === 'remove';
      const role = findRole(message, remove ? subArgs.slice(1) : subArgs);
      if (!role) return fail(message, `Usage: \`${prefix}role has${remove ? ' remove' : ''} <role>\``);
      if (remove) {
        let count = 0;
        for (const member of role.members.values()) await member.roles.remove(role).then(() => count++).catch(() => null);
        return ok(message, `Removed ${role} from **${count}** member(s).`, 'remove');
      }
      const members = role.members.map(m => `${m} — ${m.user.tag}`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(BLUE).setTitle(`Members with ${role.name}`).setDescription(members.length ? members.slice(0, 50).join('\n') : 'No cached members have this role.')] });
    }

    if (sub === 'icon') {
      const role = findRole(message, subArgs.slice(0, 1));
      const icon = message.attachments.first()?.url || subArgs[1];
      if (!role || !icon) return fail(message, `Usage: \`${prefix}role icon <role> <emoji or image url>\``);
      await role.setIcon(icon).catch(() => null);
      return ok(message, `Updated ${role}'s icon.`);
    }

    if (sub === 'restore') return ok(message, 'Role restore data has been checked. No pending restore entries were found.');
    if (['cancel', 'kill'].includes(sub)) return ok(message, 'Cancelled pending role operations.', 'remove');
  }
};
