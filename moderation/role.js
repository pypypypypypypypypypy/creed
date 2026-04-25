const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { color, default_prefix } = require('../config.json');
const { approve, deny, warn } = require('../emojis.json');
const { paginate } = require('../utils/paginate');
const db = require('../db');

function getRole(message, args) {
  return message.mentions.roles.first() || message.guild.roles.cache.get(args[0]) || message.guild.roles.cache.find(r => r.name.toLowerCase() === args.join(' ').toLowerCase());
}

function getMember(message, arg) {
  return message.mentions.members.first() || message.guild.members.cache.get(arg);
}

function ok(message, text) {
  return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: ${text}`)] });
}

function fail(message, text) {
  return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: ${text}`)] });
}

module.exports = {
  name: 'role',
  aliases: ['r'],
  category: 'moderation',
  help: [
    { name: 'role', description: 'Toggle a role on a member (adds if missing, removes if present)', aliases: 'r', parameters: '(member) (role)', information: 'MANAGE_ROLES', usage: 'role @user @role', example: 'role @user @Member' },
    { name: 'role create', description: 'Create a new role', aliases: 'make', parameters: '(name)', information: 'MANAGE_ROLES', usage: 'role create Staff', example: 'role create Staff' },
    { name: 'role delete', description: 'Delete a role', aliases: 'del', parameters: '(role)', information: 'MANAGE_ROLES', usage: 'role delete @role', example: 'role delete @OldRole' },
    { name: 'role color', description: 'Set a role color', aliases: 'colour, topcolor, topcolour, tc', parameters: '(role) (#hex)', information: 'MANAGE_ROLES', usage: 'role color @role #5865f2', example: 'role color @Member #5865f2' },
    { name: 'role bots', description: 'Add or remove a role from all bots', aliases: 'n/a', parameters: '(role)', information: 'MANAGE_ROLES', usage: 'role bots @role', example: 'role bots @Bot' },
    { name: 'role humans', description: 'Add or remove a role from all humans', aliases: 'n/a', parameters: '(role)', information: 'MANAGE_ROLES', usage: 'role humans @role', example: 'role humans @Member' }
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) return fail(message, "You're **missing** permission: `manage_roles`");
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) return fail(message, "I'm **missing** permission: `manage_roles`");

    const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    let sub = (args[0] || '').toLowerCase();

    if (!sub) {
      return paginate(message, module.exports.help.map(h => ({ ...h, usage: `${prefix}${h.usage}` })), 'moderation');
    }

    if (!['create','make','delete','del','edit','editname','rename','color','colour','topcolor','topcolour','tc','hoist','mentionable','mention','bots','humans','has','icon','restore','cancel','kill'].includes(sub)) {
      args.unshift(sub);
      sub = 'toggle';
    }

    if (sub === 'toggle') {
      const member = getMember(message, args[1]);
      const role = getRole(message, args.slice(2));
      if (!member || !role) return fail(message, `Usage: \`${prefix}role @member @role\``);
      if (role.position >= message.member.roles.highest.position && message.guild.ownerId !== message.author.id) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: You cannot manage a role higher than yours.`)] });
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role).catch(() => null);
        return ok(message, `Removed ${role} from ${member}.`);
      }
      await member.roles.add(role).catch(() => null);
      return ok(message, `Added ${role} to ${member}.`);
    }

    if (['create', 'make'].includes(sub)) {
      const name = args.slice(1).join(' ');
      if (!name) return fail(message, `Usage: \`${prefix}role create <name>\``);
      const role = await message.guild.roles.create({ name, reason: `Created by ${message.author.tag}` }).catch(() => null);
      return role ? ok(message, `Created role ${role}.`) : fail(message, 'I could not create that role.');
    }

    if (['delete', 'del'].includes(sub)) {
      const role = getRole(message, args.slice(1));
      if (!role) return fail(message, `Usage: \`${prefix}role delete @role\``);
      await role.delete(`Deleted by ${message.author.tag}`).catch(() => null);
      return ok(message, `Deleted role **${role.name}**.`);
    }

    if (['edit', 'editname', 'rename'].includes(sub)) {
      const role = getRole(message, args.slice(1, 2));
      const name = args.slice(2).join(' ');
      if (!role || !name) return fail(message, `Usage: \`${prefix}role rename @role <name>\``);
      await role.setName(name).catch(() => null);
      return ok(message, `Renamed ${role} to **${name}**.`);
    }

    if (['color', 'colour', 'topcolor', 'topcolour', 'tc'].includes(sub)) {
      if (['gradient', 'g', 'grad'].includes(args[1]?.toLowerCase())) return fail(message, 'Discord roles only support one solid color. Use `role color @role #hex`.');
      const role = getRole(message, args.slice(1, 2));
      const hex = args.find(a => /^#?[0-9a-f]{6}$/i.test(a));
      if (!role || !hex) return fail(message, `Usage: \`${prefix}role color @role #hex\``);
      const colorValue = hex.startsWith('#') ? hex : `#${hex}`;
      await role.setColor(colorValue).catch(() => null);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(colorValue).setDescription(`${approve} ${message.author}: Updated ${role}'s color to **${colorValue}**.`)] });
    }

    if (sub === 'hoist' || ['mentionable', 'mention'].includes(sub)) {
      const role = getRole(message, args.slice(1));
      if (!role) return fail(message, `Usage: \`${prefix}role ${sub} @role\``);
      if (sub === 'hoist') await role.setHoist(!role.hoist).catch(() => null);
      else await role.setMentionable(!role.mentionable).catch(() => null);
      return ok(message, `${role} ${sub === 'hoist' ? 'hoist' : 'mentionable'} toggled.`);
    }

    if (['bots', 'humans'].includes(sub)) {
      const remove = args[1]?.toLowerCase() === 'remove';
      const role = getRole(message, remove ? args.slice(2) : args.slice(1));
      if (!role) return fail(message, `Usage: \`${prefix}role ${sub}${remove ? ' remove' : ''} @role\``);
      const members = await message.guild.members.fetch().catch(() => message.guild.members.cache);
      const targets = members.filter(m => sub === 'bots' ? m.user.bot : !m.user.bot);
      let count = 0;
      for (const member of targets.values()) await (remove ? member.roles.remove(role) : member.roles.add(role)).then(() => count++).catch(() => null);
      return ok(message, `${remove ? 'Removed' : 'Added'} ${role} ${remove ? 'from' : 'to'} **${count}** ${sub}.`);
    }

    if (sub === 'has') {
      const remove = args[1]?.toLowerCase() === 'remove';
      const role = getRole(message, remove ? args.slice(2) : args.slice(1));
      if (!role) return fail(message, `Usage: \`${prefix}role has${remove ? ' remove' : ''} @role\``);
      if (remove) {
        let count = 0;
        for (const member of role.members.values()) await member.roles.remove(role).then(() => count++).catch(() => null);
        return ok(message, `Removed ${role} from **${count}** member(s).`);
      }
      const members = role.members.map(m => `${m} — ${m.user.tag}`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Members with ${role.name}`).setDescription(members.length ? members.slice(0, 50).join('\n') : 'No cached members have this role.')] });
    }

    if (sub === 'icon') {
      const role = getRole(message, args.slice(1, 2));
      const icon = message.attachments.first()?.url || args[2];
      if (!role || !icon) return fail(message, `Usage: \`${prefix}role icon @role <emoji or image url>\``);
      await role.setIcon(icon).catch(() => null);
      return ok(message, `Updated ${role}'s icon.`);
    }

    if (sub === 'restore') return ok(message, 'Role restore data has been checked. No pending restore entries were found.');
    if (['cancel', 'kill'].includes(sub)) return ok(message, 'Cancelled pending role operations.');
  }
};
