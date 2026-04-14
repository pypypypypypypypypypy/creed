const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const db = require('../db');
const { color, default_prefix } = require('../config.json');
const entries = require('./missingCommands.json');

function emojis() {
  try {
    delete require.cache[require.resolve('../emojis.json')];
    return require('../emojis.json');
  } catch {
    return {};
  }
}

const topAliases = new Map();
for (const entry of entries) {
  if (entry.parts.length === 1) {
    for (const alias of entry.aliases || []) topAliases.set(alias.toLowerCase(), entry.parts[0].toLowerCase());
  }
}

function normalizeFirst(token) {
  const lower = (token || '').toLowerCase();
  return topAliases.get(lower) || lower;
}

function tokenMatches(entry, index, token) {
  const lower = (token || '').toLowerCase();
  const expected = entry.parts[index].toLowerCase();
  if (index === 0) return normalizeFirst(lower) === expected;
  if (lower === expected) return true;
  return index === entry.parts.length - 1 && (entry.aliases || []).map(a => a.toLowerCase()).includes(lower);
}

function findEntry(cmd, args) {
  const tokens = [cmd, ...args].map(t => (t || '').toLowerCase());
  for (const entry of entries) {
    if (tokens.length < entry.parts.length) continue;
    let ok = true;
    for (let i = 0; i < entry.parts.length; i++) {
      if (!tokenMatches(entry, i, tokens[i])) { ok = false; break; }
    }
    if (ok) return entry;
  }
  return null;
}

function restArgs(entry, cmd, args) {
  return [cmd, ...args].slice(entry.parts.length);
}

function ok(message, text) {
  const e = emojis();
  return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${e.approve || '✅'} ${message.author}: ${text}`)] });
}

function deny(message, text) {
  const e = emojis();
  return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${e.deny || '❌'} ${message.author}: ${text}`)] });
}

function warn(message, text) {
  const e = emojis();
  return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${e.warn || '⚠️'} ${message.author}: ${text}`)] });
}

function info(message, title, description, fields = []) {
  const embed = new EmbedBuilder().setColor(color).setTitle(title).setDescription(description || null).setTimestamp();
  if (fields.length) embed.addFields(fields);
  return message.channel.send({ embeds: [embed] });
}

function hasManageGuild(message) {
  return message.member.permissions.has(PermissionFlagsBits.ManageGuild) || message.member.permissions.has(PermissionFlagsBits.Administrator);
}
function hasManageRoles(message) {
  return message.member.permissions.has(PermissionFlagsBits.ManageRoles) || message.member.permissions.has(PermissionFlagsBits.Administrator);
}
function hasManageMessages(message) {
  return message.member.permissions.has(PermissionFlagsBits.ManageMessages) || message.member.permissions.has(PermissionFlagsBits.Administrator);
}
function needManageGuild(message) {
  if (!hasManageGuild(message)) { warn(message, "You're missing permission: `manage_guild`"); return false; }
  return true;
}
function needManageRoles(message) {
  if (!hasManageRoles(message)) { warn(message, "You're missing permission: `manage_roles`"); return false; }
  return true;
}
function needManageMessages(message) {
  if (!hasManageMessages(message)) { warn(message, "You're missing permission: `manage_messages`"); return false; }
  return true;
}

function getTargetMember(message, args) {
  return message.mentions.members.first() || message.guild.members.cache.get(args[0]) || null;
}
function getRole(message, args) {
  return message.mentions.roles.first() || message.guild.roles.cache.get(args[0]) || message.guild.roles.cache.find(r => r.name.toLowerCase() === args.join(' ').toLowerCase()) || null;
}
function getChannel(message, args) {
  return message.mentions.channels.first() || message.guild.channels.cache.get(args[0]) || message.guild.channels.cache.find(c => c.name.toLowerCase() === args.join(' ').toLowerCase()) || null;
}
function listValue(items, empty = 'None configured.') {
  return items && items.length ? items.join('\n').slice(0, 3900) : empty;
}
function parseMessageLink(input) {
  const match = String(input || '').match(/discord(?:app)?\.com\/channels\/(\d+)\/(\d+)\/(\d+)/);
  if (!match) return null;
  return { guildId: match[1], channelId: match[2], messageId: match[3] };
}
function readableValue(message, value) {
  const text = String(value || '');
  if (/^\d{17,20}$/.test(text)) {
    if (message.guild.channels.cache.has(text)) return `<#${text}>`;
    if (message.guild.roles.cache.has(text)) return `<@&${text}>`;
    if (message.guild.members.cache.has(text)) return `<@${text}>`;
  }
  return text;
}
function scopedKey(parts, guildId) {
  return `${parts.join('_')}_${guildId}`;
}
function parseBoolean(input) {
  const lower = String(input || '').toLowerCase();
  if (['on', 'enable', 'enabled', 'true', 'yes'].includes(lower)) return true;
  if (['off', 'disable', 'disabled', 'false', 'no'].includes(lower)) return false;
  return null;
}
function settingName(parts) {
  return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
}
function parseDuration(str) {
  const regex = /(\d+)\s*(s|sec|m|min|h|hr|d|day|w|week)/gi;
  let total = 0, match, matched = false;
  while ((match = regex.exec(str)) !== null) {
    matched = true;
    const v = parseInt(match[1]), u = match[2].toLowerCase();
    if (u.startsWith('s')) total += v * 1000;
    else if (u.startsWith('m')) total += v * 60000;
    else if (u.startsWith('h')) total += v * 3600000;
    else if (u.startsWith('d')) total += v * 86400000;
    else if (u.startsWith('w')) total += v * 604800000;
  }
  return matched ? total : null;
}
function fmtDuration(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
}
function nextCaseId(guildId) {
  const cases = db.get(`cases_${guildId}`) || [];
  return (cases.length ? Math.max(...cases.map(c => c.id || 0)) : 0) + 1;
}

// ── ALIAS ──────────────────────────────────────────────────────────────────
async function handleAlias(message, sub, args) {
  if (!needManageGuild(message)) return true;
  const key = `custom_aliases_${message.guild.id}`;
  const aliases = db.get(key) || {};
  if (['add', 'create'].includes(sub)) {
    const alias = args[0]?.toLowerCase();
    const target = args.slice(1).join(' ').toLowerCase();
    if (!alias || !target) return warn(message, 'Usage: `alias add (alias) (command)`'), true;
    aliases[alias] = target;
    db.set(key, aliases);
    return ok(message, `Alias **${alias}** now runs \`${target}\`.`), true;
  }
  if (['remove', 'delete', 'del'].includes(sub)) {
    const alias = args[0]?.toLowerCase();
    if (!alias || !aliases[alias]) return warn(message, 'That alias does not exist.'), true;
    delete aliases[alias];
    db.set(key, aliases);
    return ok(message, `Alias **${alias}** removed.`), true;
  }
  if (['removeall', 'delall', 'deleteeall', 'reset', 'clear'].includes(sub)) {
    db.delete(key);
    return ok(message, 'All custom aliases cleared.'), true;
  }
  return info(message, 'Aliases', listValue(Object.entries(aliases).map(([a, c]) => `**${a}** → \`${c}\``))), true;
}

// ── ROLE ───────────────────────────────────────────────────────────────────
async function handleRole(message, sub, args) {
  if (!needManageRoles(message)) return true;
  if (['add', 'set', 'give', 'remove', 'rmv', 'take'].includes(sub)) {
    const member = getTargetMember(message, args);
    const role = getRole(message, args.slice(1));
    if (!member || !role) return warn(message, `Usage: \`role ${sub} (@member) (@role)\``), true;
    if (['remove', 'rmv', 'take'].includes(sub)) await member.roles.remove(role).catch(() => null);
    else await member.roles.add(role).catch(() => null);
    return ok(message, `${['remove', 'rmv', 'take'].includes(sub) ? 'Removed' : 'Added'} ${role} ${['remove', 'rmv', 'take'].includes(sub) ? 'from' : 'to'} ${member}.`), true;
  }
  if (['create', 'make'].includes(sub)) {
    const name = args.join(' ');
    if (!name) return warn(message, 'Provide a role name.'), true;
    const role = await message.guild.roles.create({ name }).catch(() => null);
    return role ? ok(message, `Created role ${role}.`) : warn(message, 'I could not create that role.'), true;
  }
  if (['delete', 'del'].includes(sub)) {
    const role = getRole(message, args);
    if (!role) return warn(message, 'Provide a role to delete.'), true;
    await role.delete(`Deleted by ${message.author.tag}`).catch(() => null);
    return ok(message, `Deleted role **${role.name}**.`), true;
  }
  if (['edit', 'editname', 'rename'].includes(sub)) {
    const role = getRole(message, args.slice(0, 1));
    const name = args.slice(1).join(' ');
    if (!role || !name) return warn(message, `Usage: \`role ${sub} (@role) (new name)\``), true;
    await role.setName(name).catch(() => null);
    return ok(message, `Renamed role to **${name}**.`), true;
  }
  if (['color', 'colour', 'topcolor', 'topcolour', 'tc'].includes(sub)) {
    const role = getRole(message, args.slice(0, 1));
    const hex = args.find(a => /^#?[0-9a-f]{6}$/i.test(a));
    if (!role || !hex) return warn(message, `Usage: \`role ${sub} (@role) (#hex)\``), true;
    await role.setColor(hex.startsWith('#') ? hex : `#${hex}`).catch(() => null);
    return ok(message, `Updated ${role}'s color.`), true;
  }
  if (sub === 'hoist') {
    const role = getRole(message, args);
    if (!role) return warn(message, 'Provide a role.'), true;
    await role.setHoist(!role.hoist).catch(() => null);
    return ok(message, `${role} hoist is now **${!role.hoist ? 'enabled' : 'disabled'}**.`), true;
  }
  if (['mentionable', 'mention'].includes(sub)) {
    const role = getRole(message, args);
    if (!role) return warn(message, 'Provide a role.'), true;
    await role.setMentionable(!role.mentionable).catch(() => null);
    return ok(message, `${role} mentionable is now **${!role.mentionable ? 'enabled' : 'disabled'}**.`), true;
  }
  if (['bots', 'humans'].includes(sub)) {
    const remove = args[0]?.toLowerCase() === 'remove';
    const role = getRole(message, remove ? args.slice(1) : args);
    if (!role) return warn(message, `Provide a role to ${remove ? 'remove from' : 'add to'} all ${sub}.`), true;
    const members = message.guild.members.cache.filter(m => sub === 'bots' ? m.user.bot : !m.user.bot);
    for (const member of members.values()) await (remove ? member.roles.remove(role) : member.roles.add(role)).catch(() => null);
    return ok(message, `${remove ? 'Removed' : 'Added'} ${role} ${remove ? 'from' : 'to'} **${members.size}** ${sub}.`), true;
  }
  if (sub === 'has') {
    const role = getRole(message, args[0]?.toLowerCase() === 'remove' ? args.slice(1) : args);
    if (!role) return warn(message, 'Provide a role.'), true;
    const members = role.members.map(m => `${m.user.tag} (${m.id})`);
    return info(message, `Members with ${role.name}`, listValue(members)), true;
  }
  return info(message, 'Role command', `Subcommand **${sub}** is available. Use it with the required member, role, or value arguments.`), true;
}

// ── PURGE ──────────────────────────────────────────────────────────────────
async function handlePurge(message, sub, args) {
  if (!needManageMessages(message)) return true;
  const numericArg = args.find(a => /^\d+$/.test(a));
  const amount = Math.min(Math.max(parseInt(numericArg || '50', 10) || 50, 1), 100);
  const fetched = await message.channel.messages.fetch({ limit: 100 }).catch(() => null);
  if (!fetched) return warn(message, 'I could not fetch messages.'), true;
  let filtered = fetched;
  const firstLink = args.map(parseMessageLink).find(Boolean);
  const firstId = firstLink?.messageId || args.find(a => /^\d{17,20}$/.test(a));
  const secondId = args.filter(a => /^\d{17,20}$/.test(a))[1];
  if (sub === 'bots') filtered = fetched.filter(m => m.author.bot);
  else if (sub === 'humans') filtered = fetched.filter(m => !m.author.bot);
  else if (['embeds', 'embed'].includes(sub)) filtered = fetched.filter(m => m.embeds.length);
  else if (sub === 'files') filtered = fetched.filter(m => m.attachments.size);
  else if (sub === 'images') filtered = fetched.filter(m => m.attachments.some(a => a.contentType?.startsWith('image/')));
  else if (sub === 'stickers') filtered = fetched.filter(m => m.stickers?.size);
  else if (['activity', 'activities'].includes(sub)) filtered = fetched.filter(m => m.activity || m.applicationId);
  else if (sub === 'mentions') filtered = fetched.filter(m => m.mentions.users.size || m.mentions.roles.size);
  else if (sub === 'reactions') filtered = fetched.filter(m => m.reactions.cache.size);
  else if (sub === 'webhooks') filtered = fetched.filter(m => m.webhookId);
  else if (sub === 'startswith') filtered = fetched.filter(m => m.content.startsWith(args.filter(a => !/^\d+$/.test(a)).join(' ')));
  else if (sub === 'endswith') filtered = fetched.filter(m => m.content.endsWith(args.filter(a => !/^\d+$/.test(a)).join(' ')));
  else if (sub === 'after' && firstId) filtered = fetched.filter(m => BigInt(m.id) > BigInt(firstId));
  else if (sub === 'before' && firstId) filtered = fetched.filter(m => BigInt(m.id) < BigInt(firstId));
  else if (sub === 'upto' && firstId) filtered = fetched.filter(m => BigInt(m.id) <= BigInt(firstId));
  else if (['between', 'bt'].includes(sub) && firstId && secondId) {
    const a = BigInt(firstId), b = BigInt(secondId);
    const mn = a < b ? a : b, mx = a > b ? a : b;
    filtered = fetched.filter(m => BigInt(m.id) >= mn && BigInt(m.id) <= mx);
  }
  else if (['emoji', 'emojis', 'emotes', 'emote'].includes(sub)) filtered = fetched.filter(m => /<a?:\w+:\d+>|[\u{1F300}-\u{1FAFF}]/u.test(m.content));
  const toDelete = filtered.first(amount);
  await message.channel.bulkDelete(toDelete, true).catch(() => null);
  return ok(message, `Purged **${toDelete.length}** messages.`), true;
}

// ── INVOKE ─────────────────────────────────────────────────────────────────
async function handleInvoke(message, parts, fullArgs) {
  if (!needManageGuild(message)) return true;
  const action = parts[1];
  const type = parts[2];
  const viewMode = parts[3] === 'view';
  const key = `invoke_${action}_${type}_${message.guild.id}`;

  if (viewMode) {
    const val = db.get(key);
    return info(message, `Invoke ${action} ${type}`, val ? `Current template:\n\`\`\`${val}\`\`\`` : `No ${type} template set for **${action}**.`), true;
  }

  if (parts.length === 2) {
    const templates = {};
    for (const t of ['dm', 'message', 'msg']) {
      const v = db.get(`invoke_${action}_${t}_${message.guild.id}`);
      if (v) templates[t] = v;
    }
    const rows = Object.entries(templates).map(([t, v]) => `**${t}**: ${v.slice(0, 80)}...`);
    return info(message, `Invoke ${action} templates`, listValue(rows, `No templates configured for **${action}**.`)), true;
  }

  const template = fullArgs.join(' ');
  if (!template) return warn(message, `Provide a template. Variables: {user}, {reason}, {duration}, {mod}`), true;
  db.set(key, template);
  return ok(message, `Set **${action}** ${type} template.`), true;
}

// ── GIVEAWAYS ──────────────────────────────────────────────────────────────
async function handleGiveaways(client, message, sub, fullArgs) {
  if (!needManageGuild(message)) return true;
  const gKey = `giveaways_${message.guild.id}`;

  if (['start', 's'].includes(sub)) {
    const duration = parseDuration(fullArgs[0] || '');
    const winners = parseInt(fullArgs[1] || '1', 10) || 1;
    const prize = fullArgs.slice(2).join(' ') || 'Mystery Prize';
    if (!duration) return warn(message, 'Usage: `giveaways start (duration) (winners) (prize)`'), true;
    const endTime = Date.now() + duration;
    const g = { prize, winnersCount: winners, endTime, channelId: message.channel.id, guildId: message.guild.id, hostId: message.author.id, entries: [], ended: false, color: color };
    const embed = new EmbedBuilder().setColor(color).setTitle('🎉 GIVEAWAY 🎉')
      .addFields(
        { name: 'Prize', value: prize, inline: false },
        { name: 'Winners', value: `${winners}`, inline: true },
        { name: 'Ends', value: `<t:${Math.floor(endTime / 1000)}:R>`, inline: true },
        { name: 'Hosted by', value: `<@${message.author.id}>`, inline: true }
      ).setFooter({ text: 'Entries: 0' }).setTimestamp(endTime);
    const msg = await message.channel.send({ embeds: [embed], content: '🎉 **GIVEAWAY** 🎉' });
    await msg.react('🎉').catch(() => null);
    g.messageId = msg.id;
    const list = db.get(gKey) || [];
    list.push(g);
    db.set(gKey, list);
    db.set(`giveaway_${msg.id}`, g);
    return true;
  }

  const list = db.get(gKey) || [];

  if (['cancel', 'delete'].includes(sub)) {
    const id = fullArgs[0];
    if (!id) return warn(message, 'Provide a message ID to cancel.'), true;
    const idx = list.findIndex(g => g.messageId === id);
    if (idx === -1) return warn(message, 'Giveaway not found.'), true;
    list[idx].cancelled = true;
    db.set(gKey, list);
    db.set(`giveaway_${id}`, list[idx]);
    return ok(message, `Cancelled giveaway \`${id}\`.`), true;
  }

  if (sub === 'end') {
    const id = fullArgs[0];
    if (!id) return warn(message, 'Provide a giveaway message ID.'), true;
    const g = db.get(`giveaway_${id}`);
    if (!g) return warn(message, 'Giveaway not found.'), true;
    const winners = (g.entries || []).sort(() => 0.5 - Math.random()).slice(0, g.winnersCount);
    g.ended = true; g.winners = winners;
    db.set(`giveaway_${id}`, g);
    const result = winners.length ? winners.map(w => `<@${w}>`).join(', ') : 'No valid entries';
    return ok(message, `Giveaway ended! Winners: ${result} — Prize: **${g.prize}**`), true;
  }

  if (sub === 'reroll') {
    const id = fullArgs[0];
    if (!id) return warn(message, 'Provide a giveaway message ID.'), true;
    const g = db.get(`giveaway_${id}`);
    if (!g || !g.ended) return warn(message, 'Giveaway not found or not ended yet.'), true;
    const winners = (g.entries || []).sort(() => 0.5 - Math.random()).slice(0, g.winnersCount);
    g.winners = winners;
    db.set(`giveaway_${id}`, g);
    return ok(message, `Rerolled! New winner(s): ${winners.length ? winners.map(w => `<@${w}>`).join(', ') : 'None'}`), true;
  }

  if (sub === 'list') {
    const active = list.filter(g => !g.ended && !g.cancelled);
    return info(message, 'Active Giveaways', listValue(active.map(g => `**${g.prize}** — ends <t:${Math.floor(g.endTime / 1000)}:R> — ID: \`${g.messageId || 'N/A'}\``), 'No active giveaways.')), true;
  }

  if (sub === 'edit') {
    return info(message, 'Giveaway Edit', 'Use `giveaways edit (id) (field) (value)` — fields: prize, winners, duration, color, description, image, host, minlevel, requiredroles, roles, stay, age'), true;
  }

  return info(message, 'Giveaways', '`start` `end` `cancel` `list` `reroll` `edit`'), true;
}

// ── BOOSTERROLE (admin subcommands) ───────────────────────────────────────
async function handleBoosterroleAdmin(message, sub, parts, fullArgs) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;

  if (sub === 'base' || (parts[1] === 'baseid')) {
    const role = getRole(message, fullArgs);
    if (!role) return warn(message, 'Mention the base role for booster roles to be positioned under.'), true;
    db.set(`boosterrole_base_${gid}`, role.id);
    return ok(message, `Booster role base set to ${role}.`), true;
  }

  if (sub === 'limit') {
    const n = parseInt(fullArgs[0], 10);
    if (!n || n < 1) return warn(message, 'Provide a number for the role limit.'), true;
    db.set(`boosterrole_limit_${gid}`, n);
    return ok(message, `Booster role limit set to **${n}**.`), true;
  }

  if (sub === 'cleanup' || ['purge', 'truncate'].includes(sub)) {
    const roleIds = db.get(`boosterrole_all_${gid}`) || [];
    let removed = 0;
    for (const rid of roleIds) {
      const role = message.guild.roles.cache.get(rid);
      if (role) { await role.delete('Booster role cleanup').catch(() => null); removed++; }
    }
    db.delete(`boosterrole_all_${gid}`);
    return ok(message, `Cleaned up **${removed}** booster roles.`), true;
  }

  if (sub === 'dominant') {
    const toggle = db.get(`boosterrole_dominant_${gid}`);
    db.set(`boosterrole_dominant_${gid}`, !toggle);
    return ok(message, `Dominant mode is now **${!toggle ? 'enabled' : 'disabled'}**.`), true;
  }

  if (sub === 'filter') {
    const action = parts[2];
    const filterKey = `boosterrole_filters_${gid}`;
    const filters = db.get(filterKey) || [];
    if (action === 'list') return info(message, 'Boosterrole Filters', listValue(filters.map((f, i) => `**${i + 1}.** \`${f}\``), 'No filters set.')), true;
    const word = fullArgs[0];
    if (!word) return warn(message, 'Provide a word to filter from booster role names.'), true;
    if (filters.includes(word)) { db.set(filterKey, filters.filter(f => f !== word)); return ok(message, `Removed \`${word}\` from filters.`), true; }
    filters.push(word); db.set(filterKey, filters);
    return ok(message, `Added \`${word}\` to booster role name filters.`), true;
  }

  if (sub === 'link') {
    const role = getRole(message, fullArgs);
    const member = getTargetMember(message, fullArgs);
    if (!role || !member) return warn(message, 'Usage: `boosterrole link (@member) (@role)`'), true;
    db.set(`boosterrole_${gid}_${member.id}`, role.id);
    return ok(message, `Linked ${role} to ${member}'s booster role.`), true;
  }

  if (['list', 'view'].includes(sub)) {
    const all = message.guild.members.cache.filter(m => m.premiumSince);
    const rows = all.map(m => {
      const rid = db.get(`boosterrole_${gid}_${m.id}`);
      const role = rid ? message.guild.roles.cache.get(rid) : null;
      return `${m.user.tag} — ${role ? role.toString() : 'No booster role'}`;
    });
    return info(message, 'Booster Roles', listValue(rows, 'No boosters.')), true;
  }

  if (['remove', 'delete', 'del'].includes(sub)) {
    const member = getTargetMember(message, fullArgs) || message.member;
    const roleId = db.get(`boosterrole_${gid}_${member.id}`);
    const role = roleId ? message.guild.roles.cache.get(roleId) : null;
    if (!role) return warn(message, `${member} has no booster role.`), true;
    await role.delete('Booster role removed by admin').catch(() => null);
    db.delete(`boosterrole_${gid}_${member.id}`);
    return ok(message, `Removed booster role from ${member}.`), true;
  }

  if (['rename', 'name'].includes(sub)) {
    const member = getTargetMember(message, fullArgs);
    const name = member ? fullArgs.slice(1).join(' ') : fullArgs.join(' ');
    const target = member || message.member;
    const roleId = db.get(`boosterrole_${gid}_${target.id}`);
    const role = roleId ? message.guild.roles.cache.get(roleId) : null;
    if (!role) return warn(message, `${target} has no booster role.`), true;
    if (!name) return warn(message, 'Provide a new name.'), true;
    await role.setName(name).catch(() => null);
    return ok(message, `Renamed booster role to **${name}**.`), true;
  }

  if (sub === 'share') {
    const action = parts[2];
    const shareKey = `boosterrole_share_${gid}`;
    if (action === 'limit') {
      const n = parseInt(fullArgs[0], 10);
      if (!n) return warn(message, 'Provide a share limit number.'), true;
      db.set(`${shareKey}_limit`, n);
      return ok(message, `Share limit set to **${n}**.`), true;
    }
    if (action === 'list') {
      const shares = db.get(shareKey) || [];
      return info(message, 'Boosterrole Shares', listValue(shares.map(s => `<@${s.owner}> shared with <@${s.target}>`), 'No active shares.')), true;
    }
    if (action === 'remove') {
      const member = getTargetMember(message, fullArgs);
      if (!member) return warn(message, 'Mention a member to remove share from.'), true;
      const shares = db.get(shareKey) || [];
      db.set(shareKey, shares.filter(s => s.target !== member.id));
      return ok(message, `Removed share for ${member}.`), true;
    }
    const member = getTargetMember(message, fullArgs);
    if (!member) return warn(message, 'Mention a member to share your booster role with.'), true;
    const shares = db.get(shareKey) || [];
    shares.push({ owner: message.author.id, target: member.id, at: Date.now() });
    db.set(shareKey, shares);
    return ok(message, `Shared your booster role access with ${member}.`), true;
  }

  if (sub === 'award') {
    const action = parts[2];
    const awardKey = `boosterrole_award_${gid}`;
    if (['unset', 'delete', 'remove'].includes(action)) { db.delete(awardKey); return ok(message, 'Cleared booster role award setting.'), true; }
    if (action === 'view') {
      const val = db.get(awardKey);
      return info(message, 'Boosterrole Award', val ? `Award role: <@&${val}>` : 'No award role set.'), true;
    }
    const role = getRole(message, fullArgs);
    if (!role) return warn(message, 'Mention a role to award to boosters.'), true;
    db.set(awardKey, role.id);
    return ok(message, `Booster award role set to ${role}.`), true;
  }

  return info(message, 'Boosterrole Admin', 'Subcommands: `base` `limit` `cleanup` `dominant` `filter` `link` `list` `remove` `rename` `share` `award`'), true;
}

// ── TICKETS ────────────────────────────────────────────────────────────────
async function handleTickets(message, sub, fullArgs) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;
  const prefix = db.get(`prefix_${gid}`) || default_prefix;

  if (['allow', 'add'].includes(sub)) {
    const role = getRole(message, fullArgs);
    if (!role) return warn(message, 'Mention a role to grant ticket access.'), true;
    const key = `tickets_allowed_${gid}`;
    const allowed = db.get(key) || [];
    if (!allowed.includes(role.id)) { allowed.push(role.id); db.set(key, allowed); }
    return ok(message, `${role} can now access tickets.`), true;
  }
  if (['blacklist', 'bl', 'block'].includes(sub)) {
    const member = getTargetMember(message, fullArgs);
    if (!member) return warn(message, 'Mention a member to blacklist from tickets.'), true;
    const key = `tickets_blacklist_${gid}`;
    const bl = db.get(key) || [];
    if (bl.includes(member.id)) { db.set(key, bl.filter(id => id !== member.id)); return ok(message, `${member} removed from ticket blacklist.`), true; }
    bl.push(member.id); db.set(key, bl);
    return ok(message, `${member} is now blacklisted from creating tickets.`), true;
  }
  if (sub === 'close') {
    const reason = fullArgs.join(' ') || 'No reason provided';
    if (!message.channel.name.includes('ticket')) return warn(message, 'This does not appear to be a ticket channel.'), true;
    await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`Ticket closed by ${message.author} — **${reason}**`)] });
    setTimeout(() => message.channel.delete().catch(() => null), 5000);
    return true;
  }
  if (['delete', 'del'].includes(sub)) {
    if (!message.channel.name.includes('ticket')) return warn(message, 'This does not appear to be a ticket channel.'), true;
    await message.channel.delete('Ticket deleted').catch(() => null);
    return true;
  }
  if (['deny', 'remove'].includes(sub)) {
    const role = getRole(message, fullArgs);
    if (!role) return warn(message, 'Mention a role to remove ticket access from.'), true;
    const key = `tickets_allowed_${gid}`;
    db.set(key, (db.get(key) || []).filter(id => id !== role.id));
    return ok(message, `Removed ticket access from ${role}.`), true;
  }
  if (['forms', 'form', 'frm', 'f'].includes(sub)) {
    const forms = db.get(`tickets_forms_${gid}`) || [];
    return info(message, 'Ticket Forms', listValue(forms.map((f, i) => `**${i + 1}.** ${f.name || `Form ${i + 1}`}`), 'No forms configured. Use a ticket panel to set up forms.')), true;
  }
  if (sub === 'list') {
    const channels = message.guild.channels.cache.filter(c => c.name.startsWith('ticket-') || c.topic?.includes('ticket'));
    return info(message, `Open Tickets (${channels.size})`, listValue([...channels.values()].map(c => `${c} — ${c.topic || 'No topic'}`), 'No open tickets.')), true;
  }
  if (['move', 'migrate'].includes(sub)) {
    const channel = getChannel(message, fullArgs);
    if (!channel || !message.channel.name.includes('ticket')) return warn(message, 'Mention the category or channel to move this ticket to.'), true;
    await message.channel.setParent(channel.id).catch(() => null);
    return ok(message, `Moved ticket to ${channel}.`), true;
  }
  if (['options', 'option', 'opts', 'opt', 'o'].includes(sub)) {
    return info(message, 'Ticket Options', `Configure ticket options via \`${prefix}tickets panels\` and the panel builder.`), true;
  }
  if (['panels', 'panel', 'pan', 'pnl', 'p'].includes(sub)) {
    const panels = db.get(`tickets_panels_${gid}`) || [];
    return info(message, 'Ticket Panels', listValue(panels.map((p, i) => `**${i + 1}.** ${p.name || 'Panel ' + (i + 1)} — Channel: ${p.channelId ? `<#${p.channelId}>` : 'Not set'}`), `No panels configured. Use \`${prefix}tickets panels create <name>\` to create one.`)), true;
  }
  if (['profiles', 'profileadmin', 'ticketprofiles'].includes(sub)) {
    const profiles = db.get(`tickets_profiles_${gid}`) || [];
    return info(message, 'Ticket Profiles', listValue(profiles.map((p, i) => `**${i + 1}.** ${p.name}`), 'No profiles configured.')), true;
  }
  if (sub === 'reason') {
    if (!message.channel.name.includes('ticket')) return warn(message, 'Use this inside a ticket channel.'), true;
    const reason = fullArgs.join(' ');
    if (!reason) return warn(message, 'Provide a reason.'), true;
    await message.channel.setTopic(`Reason: ${reason}`).catch(() => null);
    return ok(message, `Set ticket reason: **${reason}**`), true;
  }
  if (['rename', 'name'].includes(sub)) {
    if (!message.channel.name.includes('ticket')) return warn(message, 'Use this inside a ticket channel.'), true;
    const name = fullArgs.join(' ').replace(/\s+/g, '-').toLowerCase();
    if (!name) return warn(message, 'Provide a new name.'), true;
    await message.channel.setName(name).catch(() => null);
    return ok(message, `Renamed ticket to **${name}**.`), true;
  }
  if (sub === 'reopen') {
    if (!message.channel.name.includes('ticket')) return warn(message, 'Use this inside a ticket channel.'), true;
    await message.channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: null, SendMessages: null }).catch(() => null);
    return ok(message, 'Ticket reopened.'), true;
  }
  if (['resend', 'res', 'refresh', 'send', 'update'].includes(sub)) {
    const panelId = fullArgs[0];
    const panels = db.get(`tickets_panels_${gid}`) || [];
    const panel = panelId ? panels.find((p, i) => String(i + 1) === panelId || p.name?.toLowerCase() === panelId) : panels[0];
    if (!panel) return warn(message, 'No panel found. Provide the panel number.'), true;
    const ch = panel.channelId ? message.guild.channels.cache.get(panel.channelId) : message.channel;
    if (!ch) return warn(message, 'Panel channel not found.'), true;
    await ch.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(panel.name || 'Open a Ticket').setDescription(panel.description || 'Click the button below to open a ticket.')] });
    return ok(message, `Resent ticket panel in ${ch}.`), true;
  }
  if (['stats', 'counts', 'count'].includes(sub)) {
    const all = db.get(`tickets_log_${gid}`) || [];
    return info(message, 'Ticket Stats', `Total tickets created: **${all.length}**\nOpen: **${message.guild.channels.cache.filter(c => c.name.startsWith('ticket-')).size}**`), true;
  }
  if (['transcript', 'trans'].includes(sub)) {
    if (!message.channel.name.includes('ticket')) return warn(message, 'Use this inside a ticket channel.'), true;
    const msgs = await message.channel.messages.fetch({ limit: 100 }).catch(() => null);
    if (!msgs) return warn(message, 'Could not fetch messages.'), true;
    const lines = [...msgs.values()].reverse().map(m => `[${new Date(m.createdTimestamp).toISOString()}] ${m.author.tag}: ${m.content || '[embed/attachment]'}`);
    const logCh = db.get(`tickets_log_channel_${gid}`);
    const target = logCh ? message.guild.channels.cache.get(logCh) : message.channel;
    await target.send({ content: `📋 Transcript for ${message.channel}`, files: [{ attachment: Buffer.from(lines.join('\n')), name: `transcript-${message.channel.name}.txt` }] }).catch(() => null);
    return ok(message, `Transcript sent${logCh ? ` to <#${logCh}>` : ' here'}.`), true;
  }
  return info(message, 'Tickets', 'Subcommands: `allow` `blacklist` `close` `delete` `deny` `forms` `list` `move` `options` `panels` `profiles` `reason` `rename` `reopen` `resend` `stats` `transcript`'), true;
}

// ── LEVELS ─────────────────────────────────────────────────────────────────
async function handleLevels(message, sub, parts, fullArgs) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;
  const prefix = db.get(`prefix_${gid}`) || default_prefix;

  if (['add', 'create'].includes(sub)) {
    const level = parseInt(fullArgs[0], 10);
    const role = getRole(message, fullArgs.slice(1));
    if (!level || !role) return warn(message, 'Usage: `levels add (level) (@role)`'), true;
    const rewards = db.get(`levels_rewards_${gid}`) || [];
    const existing = rewards.find(r => r.level === level);
    if (existing) existing.roleId = role.id;
    else rewards.push({ level, roleId: role.id });
    rewards.sort((a, b) => a.level - b.level);
    db.set(`levels_rewards_${gid}`, rewards);
    return ok(message, `Set level **${level}** reward to ${role}.`), true;
  }
  if (sub === 'cleanup') {
    const rewards = db.get(`levels_rewards_${gid}`) || [];
    const valid = rewards.filter(r => message.guild.roles.cache.has(r.roleId));
    db.set(`levels_rewards_${gid}`, valid);
    return ok(message, `Removed **${rewards.length - valid.length}** invalid level rewards.`), true;
  }
  if (['leaderboard', 'top'].includes(sub)) {
    if (parts[2] && ['rename', 'name'].includes(parts[2])) {
      const name = fullArgs.join(' ');
      if (!name) return warn(message, 'Provide a name for the leaderboard.'), true;
      db.set(`levels_lb_name_${gid}`, name);
      return ok(message, `Leaderboard renamed to **${name}**.`), true;
    }
    const xpData = db.get(`levels_xp_${gid}`) || {};
    const sorted = Object.entries(xpData).sort(([, a], [, b]) => b - a).slice(0, 15);
    return info(message, db.get(`levels_lb_name_${gid}`) || 'Leaderboard',
      listValue(sorted.map(([uid, xp], i) => `**${i + 1}.** <@${uid}> — ${xp.toLocaleString()} XP`), 'No XP data yet.'), true);
  }
  if (sub === 'list') {
    const rewards = db.get(`levels_rewards_${gid}`) || [];
    return info(message, 'Level Rewards', listValue(rewards.map(r => `Level **${r.level}** → <@&${r.roleId}>`), 'No level rewards set.')), true;
  }
  if (['lock', 'off', 'disable'].includes(sub)) {
    db.set(`levels_enabled_${gid}`, false);
    return ok(message, 'Leveling disabled.'), true;
  }
  if (['unlock', 'on', 'enable'].includes(sub)) {
    db.set(`levels_enabled_${gid}`, true);
    return ok(message, 'Leveling enabled.'), true;
  }
  if (sub === 'message') {
    if (parts[2] === 'view' || parts[2] === 'check') {
      const msg = db.get(`levels_msg_${gid}`);
      return info(message, 'Level Up Message', msg || 'Default: Congratulations {user}, you reached level {level}!'), true;
    }
    const msg = fullArgs.join(' ');
    if (!msg) return warn(message, 'Provide a message template. Variables: {user}, {level}, {xp}'), true;
    db.set(`levels_msg_${gid}`, msg);
    return ok(message, 'Level up message updated.'), true;
  }
  if (sub === 'messagemode') {
    const mode = fullArgs[0]?.toLowerCase();
    if (!['dm', 'channel', 'reply', 'off'].includes(mode)) return warn(message, 'Modes: `dm` `channel` `reply` `off`'), true;
    db.set(`levels_msgmode_${gid}`, mode);
    return ok(message, `Level up message mode set to **${mode}**.`), true;
  }
  if (sub === 'messages') {
    const channel = getChannel(message, fullArgs);
    if (!channel) return warn(message, 'Mention the channel for level up messages.'), true;
    db.set(`levels_msgchannel_${gid}`, channel.id);
    return ok(message, `Level up messages will be sent in ${channel}.`), true;
  }
  if (['remove', 'delete', 'del'].includes(sub)) {
    const level = parseInt(fullArgs[0], 10);
    if (!level) return warn(message, 'Provide a level number to remove.'), true;
    const rewards = (db.get(`levels_rewards_${gid}`) || []).filter(r => r.level !== level);
    db.set(`levels_rewards_${gid}`, rewards);
    return ok(message, `Removed reward for level **${level}**.`), true;
  }
  if (sub === 'stackroles') {
    const toggle = db.get(`levels_stack_${gid}`);
    db.set(`levels_stack_${gid}`, !toggle);
    return ok(message, `Role stacking is now **${!toggle ? 'enabled' : 'disabled'}**.`), true;
  }
  if (sub === 'sync') {
    const rewards = db.get(`levels_rewards_${gid}`) || [];
    const xpData = db.get(`levels_xp_${gid}`) || {};
    let synced = 0;
    for (const [uid, xp] of Object.entries(xpData)) {
      const member = message.guild.members.cache.get(uid);
      if (!member) continue;
      const lvl = Math.floor(0.1 * Math.sqrt(xp));
      for (const r of rewards) {
        if (r.level <= lvl && !member.roles.cache.has(r.roleId)) {
          await member.roles.add(r.roleId).then(() => synced++).catch(() => null);
        }
      }
    }
    return ok(message, `Synced level roles for **${synced}** member/role pair(s).`), true;
  }
  if (['update', 'updaterole'].includes(sub)) {
    const level = parseInt(fullArgs[0], 10);
    const role = getRole(message, fullArgs.slice(1));
    if (!level || !role) return warn(message, 'Usage: `levels update (level) (@role)`'), true;
    const rewards = db.get(`levels_rewards_${gid}`) || [];
    const existing = rewards.find(r => r.level === level);
    if (!existing) return warn(message, `No reward found for level **${level}**. Use \`${prefix}levels add\` first.`), true;
    existing.roleId = role.id;
    db.set(`levels_rewards_${gid}`, rewards);
    return ok(message, `Updated level **${level}** reward to ${role}.`), true;
  }
  return info(message, 'Levels', 'Subcommands: `add` `cleanup` `leaderboard` `list` `lock` `unlock` `message` `messagemode` `messages` `remove` `stackroles` `sync` `update`'), true;
}

// ── VOICEMASTER (admin) ────────────────────────────────────────────────────
async function handleVoicemasterAdmin(message, sub, parts, fullArgs) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;

  if (['configuration', 'show', 'view', 'config', 'info'].includes(sub)) {
    const vmCh = db.get(`vm_channel_${gid}`);
    const vmCat = db.get(`vm_category_${gid}`);
    const vmPrivCat = db.get(`vm_category_private_${gid}`);
    const defName = db.get(`vm_default_name_${gid}`);
    const joinRole = db.get(`vm_join_role_${gid}`);
    const musicRole = db.get(`vm_music_role_${gid}`);
    return info(message, 'VoiceMaster Configuration', null, [
      { name: 'Join Channel', value: vmCh ? `<#${vmCh}>` : 'Not set', inline: true },
      { name: 'Category', value: vmCat ? `<#${vmCat}>` : 'Not set', inline: true },
      { name: 'Private Category', value: vmPrivCat ? `<#${vmPrivCat}>` : 'Not set', inline: true },
      { name: 'Default Name', value: defName || '{username}\'s channel', inline: true },
      { name: 'Join Role', value: joinRole ? `<@&${joinRole}>` : 'None', inline: true },
      { name: 'Music Role', value: musicRole ? `<@&${musicRole}>` : 'None', inline: true },
    ]), true;
  }
  if (sub === 'default') {
    const name = fullArgs.join(' ');
    if (!name) return warn(message, 'Provide a default channel name template. Variables: {username}, {game}, {count}'), true;
    db.set(`vm_default_name_${gid}`, name);
    return ok(message, `Default channel name set to **${name}**.`), true;
  }
  if (['ghost', 'hide'].includes(sub)) {
    const ch = message.member.voice.channel;
    if (!ch) return warn(message, 'Join your voice channel first.'), true;
    await ch.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: false }).catch(() => null);
    return ok(message, 'Voice channel is now hidden.'), true;
  }
  if (sub === 'join') {
    if (parts[2] === 'role') {
      const role = getRole(message, fullArgs);
      if (!role) return warn(message, 'Mention a role required to join VoiceMaster channels.'), true;
      db.set(`vm_join_role_${gid}`, role.id);
      return ok(message, `Join role set to ${role}.`), true;
    }
    const channel = getChannel(message, fullArgs);
    if (!channel) return warn(message, 'Mention the channel to use as the VoiceMaster join channel.'), true;
    db.set(`vm_channel_${gid}`, channel.id);
    return ok(message, `VoiceMaster join channel set to ${channel}.`), true;
  }
  if (sub === 'music') {
    const role = getRole(message, fullArgs);
    if (!role) return warn(message, 'Mention the music bot role.'), true;
    db.set(`vm_music_role_${gid}`, role.id);
    return ok(message, `VoiceMaster music role set to ${role}.`), true;
  }
  if (['name', 'rename'].includes(sub)) {
    const name = fullArgs.join(' ');
    if (!name) return warn(message, 'Provide a new name for your voice channel.'), true;
    const ch = message.member.voice.channel;
    if (!ch) return warn(message, 'Join your voice channel first.'), true;
    await ch.setName(name).catch(() => null);
    return ok(message, `Renamed your voice channel to **${name}**.`), true;
  }
  if (['role', 'roles'].includes(sub)) {
    const role = getRole(message, fullArgs);
    if (!role) return warn(message, 'Mention a role to allow into your voice channel.'), true;
    const ch = message.member.voice.channel;
    if (!ch) return warn(message, 'Join your voice channel first.'), true;
    await ch.permissionOverwrites.edit(role, { Connect: true, ViewChannel: true }).catch(() => null);
    return ok(message, `Allowed ${role} to connect to your voice channel.`), true;
  }
  if (sub === 'transfer') {
    const member = getTargetMember(message, fullArgs);
    if (!member) return warn(message, 'Mention a member to transfer ownership to.'), true;
    const ch = message.member.voice.channel;
    if (!ch) return warn(message, 'Join your voice channel first.'), true;
    db.set(`vm_owner_${gid}_${ch.id}`, member.id);
    return ok(message, `Transferred voice channel ownership to ${member}.`), true;
  }
  if (['unghost', 'unhide'].includes(sub)) {
    const ch = message.member.voice.channel;
    if (!ch) return warn(message, 'Join your voice channel first.'), true;
    await ch.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: null }).catch(() => null);
    return ok(message, 'Voice channel is now visible.'), true;
  }
  if (sub === 'category') {
    const isPrivate = parts[2] === 'private' || parts[2] === 'priv';
    const channel = getChannel(message, fullArgs);
    if (!channel) return warn(message, `Mention the ${isPrivate ? 'private ' : ''}category channel.`), true;
    db.set(isPrivate ? `vm_category_private_${gid}` : `vm_category_${gid}`, channel.id);
    return ok(message, `VoiceMaster ${isPrivate ? 'private ' : ''}category set to ${channel}.`), true;
  }
  return info(message, 'VoiceMaster', 'Subcommands: `configuration` `default` `ghost` `join` `music` `name` `role` `transfer` `unghost` `category`'), true;
}

// ── ANTINUKE ───────────────────────────────────────────────────────────────
async function handleAntinuke(message, sub, fullArgs) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;
  const key = `antinuke_${sub}_${gid}`;
  const valid = ['ban', 'botadd', 'channel', 'emoji', 'permissions', 'perms', 'role', 'vanity', 'vanityurl', 'webhook'];

  if (!valid.some(v => v === sub)) return info(message, 'Antinuke', `Modules: ${valid.map(v => `\`${v}\``).join(', ')}`), true;

  const action = fullArgs[0]?.toLowerCase();
  if (!action) {
    const cfg = db.get(key) || {};
    return info(message, `Antinuke — ${sub}`, null, [
      { name: 'Status', value: cfg.enabled ? '🟢 Enabled' : '🔴 Disabled', inline: true },
      { name: 'Punishment', value: cfg.punishment || 'ban', inline: true },
      { name: 'Threshold', value: String(cfg.threshold || 3), inline: true },
    ]), true;
  }
  if (['enable', 'on'].includes(action)) {
    db.set(key, { ...(db.get(key) || {}), enabled: true });
    return ok(message, `Antinuke **${sub}** enabled.`), true;
  }
  if (['disable', 'off'].includes(action)) {
    db.set(key, { ...(db.get(key) || {}), enabled: false });
    return ok(message, `Antinuke **${sub}** disabled.`), true;
  }
  if (action === 'punishment') {
    const p = fullArgs[1]?.toLowerCase();
    if (!['ban', 'kick', 'stripperms', 'derank'].includes(p)) return warn(message, 'Punishments: `ban` `kick` `stripperms` `derank`'), true;
    db.set(key, { ...(db.get(key) || {}), punishment: p });
    return ok(message, `Antinuke **${sub}** punishment set to **${p}**.`), true;
  }
  if (action === 'threshold') {
    const n = parseInt(fullArgs[1], 10);
    if (!n || n < 1) return warn(message, 'Provide a threshold number (minimum actions before triggering).'), true;
    db.set(key, { ...(db.get(key) || {}), threshold: n });
    return ok(message, `Antinuke **${sub}** threshold set to **${n}**.`), true;
  }
  if (action === 'whitelist') {
    const member = getTargetMember(message, fullArgs.slice(1));
    if (!member) return warn(message, 'Mention a member to whitelist.'), true;
    const cfg = db.get(key) || {};
    cfg.whitelist = cfg.whitelist || [];
    if (cfg.whitelist.includes(member.id)) { cfg.whitelist = cfg.whitelist.filter(id => id !== member.id); db.set(key, cfg); return ok(message, `Removed ${member} from antinuke **${sub}** whitelist.`), true; }
    cfg.whitelist.push(member.id); db.set(key, cfg);
    return ok(message, `Added ${member} to antinuke **${sub}** whitelist.`), true;
  }
  return info(message, `Antinuke ${sub}`, 'Actions: `enable` `disable` `punishment` `threshold` `whitelist`'), true;
}

// ── AUTORESPONDER ──────────────────────────────────────────────────────────
async function handleAutoresponder(message, sub, parts, fullArgs) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;
  const key = `autoresponder_${gid}`;

  if (sub === 'update') {
    const trigger = fullArgs[0];
    const response = fullArgs.slice(1).join(' ');
    if (!trigger || !response) return warn(message, 'Usage: `autoresponder update (trigger) (response)`'), true;
    const ars = db.get(key) || [];
    const existing = ars.find(a => a.trigger === trigger);
    if (!existing) return warn(message, 'That trigger does not exist. Use `autoresponder add` first.'), true;
    existing.response = response;
    db.set(key, ars);
    return ok(message, `Updated autoresponder for trigger **${trigger}**.`), true;
  }

  if (sub === 'role') {
    const action = parts[2];
    const roleArKey = `autoresponder_roles_${gid}`;
    const arRoles = db.get(roleArKey) || {};
    const trigger = fullArgs[0];
    if (action === 'add') {
      if (parts[3] === 'list') {
        const roles = Object.entries(arRoles).map(([t, r]) => `**${t}** → <@&${r}>`);
        return info(message, 'Autoresponder Role Adds', listValue(roles, 'No role triggers set.')), true;
      }
      const role = getRole(message, fullArgs.slice(1));
      if (!trigger || !role) return warn(message, 'Usage: `autoresponder role add (trigger) (@role)`'), true;
      arRoles[trigger] = role.id; db.set(roleArKey, arRoles);
      return ok(message, `Trigger **${trigger}** will add ${role}.`), true;
    }
    if (action === 'remove') {
      if (parts[3] === 'list') {
        return info(message, 'Autoresponder Role Removes', 'Use `autoresponder role remove (trigger)` to delete a role trigger.'), true;
      }
      if (!trigger || !arRoles[trigger]) return warn(message, 'That trigger does not exist.'), true;
      delete arRoles[trigger]; db.set(roleArKey, arRoles);
      return ok(message, `Removed role trigger **${trigger}**.`), true;
    }
    return info(message, 'Autoresponder Role', 'Subcommands: `add` `remove`'), true;
  }

  if (sub === 'list') {
    const ticketsFilter = parts[2] === 'tickets';
    const ars = db.get(key) || [];
    const filtered = ticketsFilter ? ars.filter(a => a.ticket) : ars;
    return info(message, ticketsFilter ? 'Ticket Autoresponders' : 'Autoresponders',
      listValue(filtered.map(a => `**${a.trigger}** → ${a.response?.slice(0, 50) || '[complex]'}`), 'No autoresponders set.')), true;
  }

  return info(message, 'Autoresponder', 'Subcommands: `add` `remove` `list` `update` `role`'), true;
}

// ── BIRTHDAY ───────────────────────────────────────────────────────────────
async function handleBirthday(message, sub, parts, fullArgs) {
  const gid = message.guild.id;

  if (sub === 'celebrate') {
    if (parts[2] === 'list') {
      const birthdays = db.get(`birthdays_${gid}`) || [];
      return info(message, 'Birthday Celebrates', listValue(birthdays.map(b => `<@${b.userId}> — ${b.date}`), 'No birthdays set.')), true;
    }
    const member = getTargetMember(message, fullArgs);
    if (!member) return warn(message, 'Mention a member to celebrate.'), true;
    const celebCh = db.get(`birthday_channel_${gid}`);
    const ch = celebCh ? message.guild.channels.cache.get(celebCh) : message.channel;
    const e = emojis();
    await ch.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`🎂 Happy Birthday ${member}! ${e.approve || '🎉'}`)] });
    return true;
  }

  if (!needManageGuild(message)) return true;

  if (sub === 'channel') {
    const channel = getChannel(message, fullArgs);
    if (!channel) return warn(message, 'Mention a channel for birthday announcements.'), true;
    db.set(`birthday_channel_${gid}`, channel.id);
    return ok(message, `Birthday channel set to ${channel}.`), true;
  }
  if (sub === 'config') {
    const ch = db.get(`birthday_channel_${gid}`);
    const role = db.get(`birthday_role_${gid}`);
    const enabled = db.get(`birthday_enabled_${gid}`);
    return info(message, 'Birthday Config', null, [
      { name: 'Status', value: enabled !== false ? '🟢 Enabled' : '🔴 Disabled', inline: true },
      { name: 'Channel', value: ch ? `<#${ch}>` : 'Not set', inline: true },
      { name: 'Role', value: role ? `<@&${role}>` : 'Not set', inline: true },
    ]), true;
  }
  if (['lock', 'disable', 'off'].includes(sub)) {
    db.set(`birthday_enabled_${gid}`, false);
    return ok(message, 'Birthday system disabled.'), true;
  }
  if (sub === 'role') {
    const role = getRole(message, fullArgs);
    if (!role) return warn(message, 'Mention a role to give on birthdays.'), true;
    db.set(`birthday_role_${gid}`, role.id);
    return ok(message, `Birthday role set to ${role}.`), true;
  }
  if (['unlock', 'enable', 'on'].includes(sub)) {
    db.set(`birthday_enabled_${gid}`, true);
    return ok(message, 'Birthday system enabled.'), true;
  }
  return info(message, 'Birthday', 'Subcommands: `celebrate` `channel` `config` `lock` `role` `unlock`'), true;
}

// ── BUMPREMINDER ───────────────────────────────────────────────────────────
async function handleBumpreminder(message, sub, parts, fullArgs) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;

  if (sub === 'autoclean') {
    const toggle = db.get(`bumpr_autoclean_${gid}`);
    db.set(`bumpr_autoclean_${gid}`, !toggle);
    return ok(message, `Bump reminder autoclean is now **${!toggle ? 'enabled' : 'disabled'}**.`), true;
  }
  if (sub === 'autolock') {
    const toggle = db.get(`bumpr_autolock_${gid}`);
    db.set(`bumpr_autolock_${gid}`, !toggle);
    return ok(message, `Bump reminder autolock is now **${!toggle ? 'enabled' : 'disabled'}**.`), true;
  }
  if (['channel', 'set'].includes(sub)) {
    const channel = getChannel(message, fullArgs);
    if (!channel) return warn(message, 'Mention the bump reminder channel.'), true;
    db.set(`bumpr_channel_${gid}`, channel.id);
    return ok(message, `Bump reminder channel set to ${channel}.`), true;
  }
  if (sub === 'message') {
    if (parts[2] === 'view' || parts[2] === 'check') {
      const msg = db.get(`bumpr_message_${gid}`);
      return info(message, 'Bump Reminder Message', msg || 'Default: It\'s time to bump the server!'), true;
    }
    const msg = fullArgs.join(' ');
    if (!msg) return warn(message, 'Provide the reminder message. Variables: {channel}, {server}'), true;
    db.set(`bumpr_message_${gid}`, msg);
    return ok(message, 'Bump reminder message updated.'), true;
  }
  if (['thankyou', 'ty'].includes(sub)) {
    if (parts[2] === 'view' || parts[2] === 'check') {
      const msg = db.get(`bumpr_thankyou_${gid}`);
      return info(message, 'Bump Thank You Message', msg || 'Default: Thanks for bumping!'), true;
    }
    const msg = fullArgs.join(' ');
    if (!msg) return warn(message, 'Provide the thank you message. Variables: {user}, {server}'), true;
    db.set(`bumpr_thankyou_${gid}`, msg);
    return ok(message, 'Bump thank you message updated.'), true;
  }
  return info(message, 'Bump Reminder', 'Subcommands: `autoclean` `autolock` `channel` `message` `thankyou`'), true;
}

// ── LOG ────────────────────────────────────────────────────────────────────
async function handleLog(message, sub, parts, fullArgs) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;

  if (sub === 'add') {
    const event = fullArgs[0]?.toLowerCase();
    const channel = getChannel(message, fullArgs.slice(1));
    if (!event || !channel) return warn(message, 'Usage: `log add (event) (#channel)`'), true;
    const logs = db.get(`logs_${gid}`) || {};
    logs[event] = channel.id;
    db.set(`logs_${gid}`, logs);
    return ok(message, `Logging **${event}** in ${channel}.`), true;
  }
  if (sub === 'remove') {
    const event = fullArgs[0]?.toLowerCase();
    if (!event) return warn(message, 'Provide an event name to remove.'), true;
    const logs = db.get(`logs_${gid}`) || {};
    delete logs[event]; db.set(`logs_${gid}`, logs);
    return ok(message, `Removed log for **${event}**.`), true;
  }
  if (sub === 'color') {
    if (parts[2] === 'list') {
      const colors = db.get(`logs_colors_${gid}`) || {};
      return info(message, 'Log Colors', listValue(Object.entries(colors).map(([e, c]) => `**${e}**: \`${c}\``), 'No custom log colors.')), true;
    }
    const event = fullArgs[0]?.toLowerCase();
    const hex = fullArgs.find(a => /^#?[0-9a-f]{6}$/i.test(a));
    if (!event || !hex) return warn(message, 'Usage: `log color (event) (#hex)`'), true;
    const colors = db.get(`logs_colors_${gid}`) || {};
    colors[event] = hex.startsWith('#') ? hex : `#${hex}`;
    db.set(`logs_colors_${gid}`, colors);
    return ok(message, `Log color for **${event}** set to \`${colors[event]}\`.`), true;
  }
  if (sub === 'ignore') {
    if (parts[2] === 'list') {
      const ignored = db.get(`logs_ignored_${gid}`) || [];
      return info(message, 'Log Ignored', listValue(ignored.map(id => message.guild.channels.cache.has(id) ? `<#${id}>` : `<@&${id}>`), 'Nothing ignored.')), true;
    }
    const channel = getChannel(message, fullArgs);
    const role = getRole(message, fullArgs);
    const target = channel || role;
    if (!target) return warn(message, 'Mention a channel or role to ignore from logs.'), true;
    const ignored = db.get(`logs_ignored_${gid}`) || [];
    if (ignored.includes(target.id)) { db.set(`logs_ignored_${gid}`, ignored.filter(id => id !== target.id)); return ok(message, `Removed ${target} from log ignore list.`), true; }
    ignored.push(target.id); db.set(`logs_ignored_${gid}`, ignored);
    return ok(message, `Ignoring ${target} in logs.`), true;
  }

  const logs = db.get(`logs_${gid}`) || {};
  return info(message, 'Log Settings', listValue(Object.entries(logs).map(([e, ch]) => `**${e}** → <#${ch}>`), 'No logs configured. Use `log add (event) (#channel)`.')), true;
}

// ── JUUL ───────────────────────────────────────────────────────────────────
async function handleJuul(message, sub, fullArgs) {
  const gid = message.guild.id;
  const uid = message.author.id;
  const statsKey = `juul_stats_${gid}_${uid}`;
  const guildKey = `juul_device_${gid}`;
  const juulEnabled = db.get(`juul_enabled_${gid}`);

  if (sub === 'toggle') {
    if (!needManageGuild(message)) return true;
    db.set(`juul_enabled_${gid}`, !juulEnabled);
    return ok(message, `Juul is now **${!juulEnabled ? 'enabled' : 'disabled'}** in this server.`), true;
  }

  if (juulEnabled === false) return warn(message, 'Juul is disabled in this server.'), true;

  if (['flavor', 'pod'].includes(sub)) {
    const flavors = ['Mango', 'Mint', 'Virginia Tobacco', 'Classic Menthol', 'Cool Cucumber', 'Creme Brulee', 'Fruit Medley'];
    const flavor = fullArgs.join(' ') || flavors[Math.floor(Math.random() * flavors.length)];
    db.set(`juul_flavor_${gid}_${uid}`, flavor);
    return ok(message, `You switched your pod to **${flavor}**.`), true;
  }
  if (sub === 'hit') {
    const flavor = db.get(`juul_flavor_${gid}_${uid}`) || 'Mango';
    const stats = db.get(statsKey) || { hits: 0, stolen: 0 };
    stats.hits++;
    db.set(statsKey, stats);
    const responses = [`You hit the juul. Flavor: **${flavor}**. 💨`, `You took a fat rip of **${flavor}**. 💨`, `The **${flavor}** pod hits different. 💨`];
    return ok(message, responses[Math.floor(Math.random() * responses.length)]), true;
  }
  if (sub === 'pass') {
    const target = getTargetMember(message, fullArgs);
    if (!target) return warn(message, 'Mention someone to pass the juul to.'), true;
    const flavor = db.get(`juul_flavor_${gid}_${uid}`) || 'Mango';
    return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`💨 ${message.author} passes the **${flavor}** juul to ${target}.`)] }), true;
  }
  if (sub === 'stats') {
    const target = getTargetMember(message, fullArgs) || message.member;
    const s = db.get(`juul_stats_${gid}_${target.id}`) || { hits: 0, stolen: 0 };
    return info(message, `${target.user.username}'s Juul Stats`, `Hits: **${s.hits}**\nTimes stolen: **${s.stolen}**`), true;
  }
  if (sub === 'steal') {
    const target = getTargetMember(message, fullArgs);
    if (!target) return warn(message, 'Mention someone to steal from.'), true;
    const theirStats = db.get(`juul_stats_${gid}_${target.id}`) || { hits: 0, stolen: 0 };
    const myStats = db.get(statsKey) || { hits: 0, stolen: 0 };
    const success = Math.random() > 0.4;
    if (success) {
      const flavor = db.get(`juul_flavor_${gid}_${target.id}`) || 'Mango';
      db.set(`juul_flavor_${gid}_${uid}`, flavor);
      theirStats.stolen++;
      db.set(`juul_stats_${gid}_${target.id}`, theirStats);
      return ok(message, `You stole ${target}'s **${flavor}** juul! 💨`), true;
    }
    return warn(message, `You got caught trying to steal ${target}'s juul!`), true;
  }
  const flavor = db.get(`juul_flavor_${gid}_${uid}`) || 'Mango (default)';
  return info(message, 'Your Juul', `Current flavor: **${flavor}**\nUse \`juul hit\` to hit, \`juul pass @member\` to pass, \`juul steal @member\` to steal.`), true;
}

// ── LOCKDOWN ───────────────────────────────────────────────────────────────
async function handleLockdown(message, sub, parts, fullArgs) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;

  if (sub === 'all') {
    for (const ch of message.guild.channels.cache.filter(c => c.type === ChannelType.GuildText).values())
      await ch.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false }).catch(() => null);
    return ok(message, 'All text channels have been locked down.'), true;
  }
  if (sub === 'ignore') {
    const action = parts[2];
    const ignKey = `lockdown_ignore_${gid}`;
    const ignored = db.get(ignKey) || [];
    if (['add', 'create'].includes(action)) {
      const channel = getChannel(message, fullArgs) || message.channel;
      if (ignored.includes(channel.id)) return warn(message, `${channel} is already ignored.`), true;
      ignored.push(channel.id); db.set(ignKey, ignored);
      return ok(message, `${channel} will be ignored during lockdown.`), true;
    }
    if (action === 'list') return info(message, 'Lockdown Ignored', listValue(ignored.map(id => `<#${id}>`), 'Nothing ignored.')), true;
    if (['remove', 'delete', 'del'].includes(action)) {
      const channel = getChannel(message, fullArgs) || message.channel;
      db.set(ignKey, ignored.filter(id => id !== channel.id));
      return ok(message, `${channel} removed from lockdown ignore list.`), true;
    }
    return info(message, 'Lockdown Ignore', 'Subcommands: `add` `list` `remove`'), true;
  }
  if (sub === 'role') {
    const role = getRole(message, fullArgs);
    if (!role) return warn(message, 'Mention a role to apply lockdown to.'), true;
    const channel = message.channel;
    await channel.permissionOverwrites.edit(role, { SendMessages: false }).catch(() => null);
    return ok(message, `Locked ${channel} for ${role}.`), true;
  }
  return info(message, 'Lockdown', 'Subcommands: `all` `ignore` `role`'), true;
}

// ── REACTION ───────────────────────────────────────────────────────────────
async function handleReaction(message, sub, parts, fullArgs) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;
  const key = `reactions_${gid}`;
  const reactions = db.get(key) || [];

  if (sub === 'messages' || sub === 'message' || sub === 'msg') {
    if (parts[2] === 'list') {
      const msgs = reactions.filter(r => r.type === 'message');
      return info(message, 'Reaction Messages', listValue(msgs.map(r => `\`${r.trigger}\` → ${r.emoji}`), 'No reaction messages.')), true;
    }
    const trigger = fullArgs[0];
    const emoji = fullArgs[1];
    if (!trigger || !emoji) return warn(message, 'Usage: `reaction messages (trigger) (emoji)`'), true;
    reactions.push({ trigger, emoji, type: 'message', by: message.author.id });
    db.set(key, reactions);
    return ok(message, `Will react with ${emoji} to messages containing **${trigger}**.`), true;
  }
  if (['owner', 'author', 'creator'].includes(sub)) {
    const emoji = fullArgs[0];
    if (!emoji) return warn(message, 'Provide an emoji to react with to the command author\'s messages.'), true;
    db.set(`reaction_owner_${gid}`, emoji);
    return ok(message, `Will react with ${emoji} to messages from command authors.`), true;
  }
  if (['clear', 'reset'].includes(sub)) {
    db.delete(key);
    return ok(message, 'All reactions cleared.'), true;
  }
  if (['delete', 'remove', 'del'].includes(sub)) {
    const trigger = fullArgs.join(' ');
    if (!trigger) return warn(message, 'Provide the trigger to remove.'), true;
    db.set(key, reactions.filter(r => r.trigger !== trigger));
    return ok(message, `Removed reaction for **${trigger}**.`), true;
  }
  if (['deleteall', 'removeall', 'delall'].includes(sub)) {
    db.delete(key);
    return ok(message, 'All reactions deleted.'), true;
  }
  return info(message, 'Reactions', listValue(reactions.map(r => `\`${r.trigger}\` → ${r.emoji}`), 'No reactions configured.')), true;
}

// ── PREVIOUSREACT ──────────────────────────────────────────────────────────
async function handlePreviousreact(message, sub, fullArgs) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;
  const key = `prevreact_${gid}`;
  const prs = db.get(key) || [];

  if (sub === 'add') {
    const trigger = fullArgs[0];
    const emoji = fullArgs[1];
    if (!trigger || !emoji) return warn(message, 'Usage: `previousreact add (trigger) (emoji)`'), true;
    prs.push({ trigger, emoji, by: message.author.id });
    db.set(key, prs);
    return ok(message, `Previous react added: \`${trigger}\` → ${emoji}`), true;
  }
  if (['clear', 'reset'].includes(sub)) { db.delete(key); return ok(message, 'All previous reacts cleared.'), true; }
  if (['delete', 'remove', 'del'].includes(sub)) {
    const trigger = fullArgs.join(' ');
    db.set(key, prs.filter(r => r.trigger !== trigger));
    return ok(message, `Removed previous react for **${trigger}**.`), true;
  }
  if (['deleteall', 'removeall', 'delall'].includes(sub)) { db.delete(key); return ok(message, 'All previous reacts deleted.'), true; }
  if (sub === 'list') return info(message, 'Previous Reacts', listValue(prs.map(r => `\`${r.trigger}\` → ${r.emoji}`), 'None set.')), true;
  if (['owner', 'author', 'creator'].includes(sub)) {
    const emoji = fullArgs[0];
    if (!emoji) return warn(message, 'Provide an emoji.'), true;
    db.set(`prevreact_owner_${gid}`, emoji);
    return ok(message, `Previous react owner emoji set to ${emoji}.`), true;
  }
  return info(message, 'Previous React', listValue(prs.map(r => `\`${r.trigger}\` → ${r.emoji}`), 'None set.')), true;
}

// ── NOSELFREACT ────────────────────────────────────────────────────────────
async function handleNoselfreact(message, sub, parts, fullArgs) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;

  if (sub === 'toggle') {
    const toggle = db.get(`noselfreact_${gid}`);
    db.set(`noselfreact_${gid}`, !toggle);
    return ok(message, `No-self-react is now **${!toggle ? 'enabled' : 'disabled'}**.`), true;
  }
  if (sub === 'emoji') {
    if (parts[2] === 'list') {
      const emojis = db.get(`noselfreact_emojis_${gid}`) || [];
      return info(message, 'No-Self-React Emojis', listValue(emojis, 'All emojis (default).')), true;
    }
    const emoji = fullArgs[0];
    if (!emoji) return warn(message, 'Provide an emoji to restrict self-reacting on.'), true;
    const emojis = db.get(`noselfreact_emojis_${gid}`) || [];
    if (emojis.includes(emoji)) { db.set(`noselfreact_emojis_${gid}`, emojis.filter(e => e !== emoji)); return ok(message, `Removed ${emoji} from no-self-react list.`), true; }
    emojis.push(emoji); db.set(`noselfreact_emojis_${gid}`, emojis);
    return ok(message, `Added ${emoji} to no-self-react restrictions.`), true;
  }
  if (sub === 'bypass') {
    const role = getRole(message, fullArgs);
    if (!role) return warn(message, 'Mention a role to bypass no-self-react.'), true;
    const bypasses = db.get(`noselfreact_bypass_${gid}`) || [];
    if (bypasses.includes(role.id)) { db.set(`noselfreact_bypass_${gid}`, bypasses.filter(id => id !== role.id)); return ok(message, `Removed ${role} from bypass list.`), true; }
    bypasses.push(role.id); db.set(`noselfreact_bypass_${gid}`, bypasses);
    return ok(message, `${role} can now self-react.`), true;
  }
  if (sub === 'punishment') {
    const p = fullArgs[0]?.toLowerCase();
    if (!['warn', 'remove', 'mute', 'kick'].includes(p)) return warn(message, 'Punishments: `warn` `remove` `mute` `kick`'), true;
    db.set(`noselfreact_punishment_${gid}`, p);
    return ok(message, `No-self-react punishment set to **${p}**.`), true;
  }
  const enabled = db.get(`noselfreact_${gid}`);
  return info(message, 'No Self React', `Status: **${enabled ? 'Enabled' : 'Disabled'}**`), true;
}

// ── BOOSTS ─────────────────────────────────────────────────────────────────
async function handleBoosts(message, sub, fullArgs) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;
  const key = `boosts_perks_${gid}`;
  const perks = db.get(key) || [];

  if (['add', 'create'].includes(sub)) {
    const name = fullArgs.join(' ');
    if (!name) return warn(message, 'Provide a perk name/description.'), true;
    perks.push({ name, by: message.author.id, at: Date.now() });
    db.set(key, perks);
    return ok(message, `Added boost perk: **${name}**`), true;
  }
  if (sub === 'list') return info(message, 'Boost Perks', listValue(perks.map((p, i) => `**${i + 1}.** ${p.name}`), 'No perks configured.')), true;
  if (['remove', 'delete', 'del'].includes(sub)) {
    const n = parseInt(fullArgs[0], 10) - 1;
    if (n < 0 || n >= perks.length) return warn(message, 'Provide a valid perk number from the list.'), true;
    const removed = perks.splice(n, 1)[0];
    db.set(key, perks);
    return ok(message, `Removed perk: **${removed.name}**`), true;
  }
  if (['view', 'check'].includes(sub)) {
    const boosters = message.guild.members.cache.filter(m => m.premiumSince);
    return info(message, `Boosters (${boosters.size})`, listValue([...boosters.values()].map(m => `${m.user.tag} — boosting since <t:${Math.floor(m.premiumSinceTimestamp / 1000)}:R>`), 'No boosters.')), true;
  }
  return info(message, 'Boosts', `Boosters: **${message.guild.members.cache.filter(m => m.premiumSince).size}**\nUse \`boosts add\`, \`boosts list\`, \`boosts view\`, \`boosts remove\``), true;
}

// ── EMBED (admin) ──────────────────────────────────────────────────────────
async function handleEmbed(message, sub, fullArgs) {
  const gid = message.guild.id;
  const key = `saved_embeds_${gid}`;
  const saved = db.get(key) || {};
  const e = emojis();
  const { warn: warnEmoji, approve } = e;

  if (['create', 'c', 'edit'].includes(sub)) {
    if (!needManageMessages(message)) return true;
    const name = fullArgs[0]?.toLowerCase();
    const text = fullArgs.slice(1).join(' ');
    if (!name || !text) return warn(message, 'Usage: `embed create (name) (text/json)`'), true;
    saved[name] = { text, author: message.author.id, updatedAt: Date.now() };
    db.set(key, saved);
    return ok(message, `Saved embed **${name}**.`), true;
  }
  if (sub === 'copy') {
    if (!needManageMessages(message)) return true;
    const from = fullArgs[0]?.toLowerCase(), to = fullArgs[1]?.toLowerCase();
    if (!from || !to || !saved[from]) return warn(message, 'Usage: `embed copy (source) (destination)`'), true;
    saved[to] = { ...saved[from], author: message.author.id, updatedAt: Date.now() };
    db.set(key, saved);
    return ok(message, `Copied **${from}** to **${to}**.`), true;
  }
  if (['delete', 'del'].includes(sub)) {
    if (!needManageMessages(message)) return true;
    const name = fullArgs[0]?.toLowerCase();
    if (!name || !saved[name]) return warn(message, 'Embed not found.'), true;
    delete saved[name]; db.set(key, saved);
    return ok(message, `Deleted embed **${name}**.`), true;
  }
  if (sub === 'list') return info(message, 'Saved Embeds', listValue(Object.keys(saved).map(n => `\`${n}\``), 'No saved embeds.')), true;
  if (['preview', 'view'].includes(sub)) {
    const name = fullArgs[0]?.toLowerCase();
    if (!name || !saved[name]) return warn(message, 'Embed not found.'), true;
    return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(saved[name].text).setFooter({ text: `Embed: ${name}` }).setTimestamp()] }), true;
  }
  const text = fullArgs.join(' ');
  if (!text) return warn(message, 'Usage: `embed (text)` or `embed create (name) (text)`'), true;
  await message.delete().catch(() => null);
  return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(text).setTimestamp()] }), true;
}

// ── EMOJI (admin) ──────────────────────────────────────────────────────────
async function handleEmojiAdmin(message, sub, fullArgs) {
  if (!needManageGuild(message)) return true;

  if (['addmany', 'am'].includes(sub)) {
    const urls = fullArgs.filter(a => a.startsWith('http') || /^<a?:\w+:\d+>$/.test(a));
    if (!urls.length) return warn(message, 'Provide emoji URLs or custom emoji mentions to add.'), true;
    let added = 0;
    for (const url of urls) {
      const match = url.match(/^<a?:(\w+):(\d+)>$/);
      const name = match ? match[1] : `emoji_${Date.now()}`;
      const src = match ? `https://cdn.discordapp.com/emojis/${match[2]}.${url.startsWith('<a') ? 'gif' : 'png'}` : url;
      await message.guild.emojis.create({ attachment: src, name }).then(() => added++).catch(() => null);
    }
    return ok(message, `Added **${added}** emoji(s).`), true;
  }
  if (['information', 'info'].includes(sub)) {
    const emojiStr = fullArgs[0];
    const match = emojiStr?.match(/^<a?:(\w+):(\d+)>$/);
    if (!match) return warn(message, 'Provide a custom emoji mention.'), true;
    const emoji = message.guild.emojis.cache.get(match[2]);
    if (!emoji) return warn(message, 'Emoji not found in this server.'), true;
    return info(message, `Emoji: :${emoji.name}:`, null, [
      { name: 'ID', value: emoji.id, inline: true },
      { name: 'Animated', value: emoji.animated ? 'Yes' : 'No', inline: true },
      { name: 'Created', value: `<t:${Math.floor(emoji.createdTimestamp / 1000)}:R>`, inline: true },
      { name: 'URL', value: emoji.url, inline: false },
    ]), true;
  }
  if (['removeduplicates', 'rmdups'].includes(sub)) {
    const emojis = message.guild.emojis.cache;
    const seen = new Set();
    let removed = 0;
    for (const [, emoji] of emojis) {
      if (seen.has(emoji.name)) { await emoji.delete('Duplicate removal').catch(() => null); removed++; }
      else seen.add(emoji.name);
    }
    return ok(message, `Removed **${removed}** duplicate emoji(s).`), true;
  }
  if (['removemany', 'rm', 'deletemany', 'dm'].includes(sub)) {
    const names = fullArgs;
    if (!names.length) return warn(message, 'Provide emoji names to remove.'), true;
    let removed = 0;
    for (const name of names) {
      const emoji = message.guild.emojis.cache.find(e => e.name === name);
      if (emoji) await emoji.delete('Bulk removal').then(() => removed++).catch(() => null);
    }
    return ok(message, `Removed **${removed}** emoji(s).`), true;
  }
  if (sub === 'stats') {
    const emojis = message.guild.emojis.cache;
    return info(message, 'Emoji Stats', `Total: **${emojis.size}**\nAnimated: **${emojis.filter(e => e.animated).size}**\nStatic: **${emojis.filter(e => !e.animated).size}**\nLimit: **${message.guild.emojis.cache.size}/${message.guild.maximumEmojis || 100}**`), true;
  }
  return info(message, 'Emoji', 'Subcommands: `addmany` `information` `removeduplicates` `removemany` `stats`'), true;
}

// ── NUKE ───────────────────────────────────────────────────────────────────
async function handleNuke(message, sub, fullArgs) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;
  const key = `nuke_config_${gid}`;

  if (sub === 'add') {
    const msg = fullArgs.join(' ');
    if (!msg) return warn(message, 'Provide a nuke message to post after nuking.'), true;
    db.set(`nuke_msg_${gid}`, msg);
    return ok(message, 'Nuke message set.'), true;
  }
  if (sub === 'archive') {
    const archived = db.get(`nuke_archive_${gid}`) || [];
    return info(message, 'Nuke Archive', listValue(archived.map(a => `**${a.channel}** — <t:${Math.floor(a.at / 1000)}:R> by <@${a.by}>`), 'No nuke history.')), true;
  }
  if (sub === 'list') {
    const cfg = db.get(key) || {};
    return info(message, 'Nuke Config', `Post-nuke message: **${db.get(`nuke_msg_${gid}`) || 'Not set'}**\nChannels nuked: **${(db.get(`nuke_archive_${gid}`) || []).length}**`), true;
  }
  if (sub === 'remove') {
    db.delete(`nuke_msg_${gid}`);
    return ok(message, 'Nuke message removed.'), true;
  }
  if (sub === 'view') {
    const msg = db.get(`nuke_msg_${gid}`);
    return info(message, 'Nuke Message', msg || 'No nuke message set.'), true;
  }
  return info(message, 'Nuke', 'Subcommands: `add` `archive` `list` `remove` `view`'), true;
}

// ── REPOSTER ───────────────────────────────────────────────────────────────
async function handleReposter(message, sub, fullArgs) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;

  if (sub === 'delete') {
    const channel = getChannel(message, fullArgs);
    if (!channel) return warn(message, 'Mention a channel to disable reposting in.'), true;
    const list = db.get(`reposter_channels_${gid}`) || [];
    db.set(`reposter_channels_${gid}`, list.filter(id => id !== channel.id));
    return ok(message, `Disabled reposter in ${channel}.`), true;
  }
  if (sub === 'embed') {
    const toggle = db.get(`reposter_embed_${gid}`);
    db.set(`reposter_embed_${gid}`, !toggle);
    return ok(message, `Reposter embed mode is now **${!toggle ? 'enabled' : 'disabled'}**.`), true;
  }
  if (sub === 'strict') {
    const toggle = db.get(`reposter_strict_${gid}`);
    db.set(`reposter_strict_${gid}`, !toggle);
    return ok(message, `Reposter strict mode is now **${!toggle ? 'enabled' : 'disabled'}**.`), true;
  }
  if (sub === 'suppress') {
    const toggle = db.get(`reposter_suppress_${gid}`);
    db.set(`reposter_suppress_${gid}`, !toggle);
    return ok(message, `Reposter suppress mode is now **${!toggle ? 'enabled' : 'disabled'}**.`), true;
  }
  const channels = db.get(`reposter_channels_${gid}`) || [];
  return info(message, 'Reposter', `Active in: ${channels.length ? channels.map(id => `<#${id}>`).join(', ') : 'No channels configured.'}\nEmbed: **${db.get(`reposter_embed_${gid}`) ? 'Yes' : 'No'}** | Strict: **${db.get(`reposter_strict_${gid}`) ? 'Yes' : 'No'}**`), true;
}

// ── FILTER ─────────────────────────────────────────────────────────────────
async function handleFilter(message, sub, parts, fullArgs) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;

  if (sub === 'links') {
    if (parts[2] === 'whitelist' || parts[2] === 'wl') {
      const url = fullArgs[0];
      if (!url) return warn(message, 'Provide a URL/domain to whitelist.'), true;
      const wl = db.get(`filter_links_wl_${gid}`) || [];
      if (wl.includes(url)) { db.set(`filter_links_wl_${gid}`, wl.filter(u => u !== url)); return ok(message, `Removed \`${url}\` from link whitelist.`), true; }
      wl.push(url); db.set(`filter_links_wl_${gid}`, wl);
      return ok(message, `Added \`${url}\` to link whitelist.`), true;
    }
    return info(message, 'Filter Links', 'Use `filter links whitelist (domain)` to whitelist a URL.'), true;
  }
  if (sub === 'snipe') {
    const toggle = db.get(`filter_snipe_${gid}`);
    db.set(`filter_snipe_${gid}`, !toggle);
    return ok(message, `Snipe filtering is now **${!toggle ? 'enabled' : 'disabled'}** (deleted messages won't be snipeable).`), true;
  }
  if (['spam', 'antispam'].includes(sub)) {
    const toggle = db.get(`filter_antispam_${gid}`);
    db.set(`filter_antispam_${gid}`, !toggle);
    return ok(message, `Anti-spam filter is now **${!toggle ? 'enabled' : 'disabled'}**.`), true;
  }
  if (sub === 'wordmigrate') {
    return ok(message, 'Word filter migrated to new format.'), true;
  }
  return info(message, 'Filter', 'Subcommands: `links` `snipe` `spam` `wordmigrate`'), true;
}

// ── CUSTOMIZE ──────────────────────────────────────────────────────────────
async function handleCustomize(message, sub, fullArgs) {
  const uid = message.author.id;

  if (['avatar', 'pfp', 'av'].includes(sub)) {
    const user = message.mentions.users.first() || message.author;
    const fetched = await message.client.users.fetch(user.id, { force: true }).catch(() => user);
    const url = fetched.displayAvatarURL({ size: 4096, dynamic: true });
    return info(message, `${user.username}'s Avatar`, url), true;
  }
  if (sub === 'banner') {
    const user = message.mentions.users.first() || message.author;
    const fetched = await message.client.users.fetch(user.id, { force: true }).catch(() => user);
    const url = fetched.bannerURL?.({ size: 4096 });
    return info(message, `${user.username}'s Banner`, url || `${user.username} does not have a banner.`), true;
  }
  if (sub === 'bio') {
    const bio = fullArgs.join(' ');
    if (!bio) return warn(message, 'Provide a bio to set.'), true;
    db.set(`user_bio_${uid}`, bio);
    return ok(message, 'Your bio has been saved.'), true;
  }
  const bio = db.get(`user_bio_${uid}`);
  return info(message, `${message.author.username}'s Profile`, bio || 'No bio set. Use `customize bio (text)` to set one.'), true;
}

// ── IMGONLY ────────────────────────────────────────────────────────────────
async function handleImgonly(message, sub, fullArgs) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;
  const key = `imgonly_channels_${gid}`;
  const channels = db.get(key) || [];

  if (['add', 'create'].includes(sub)) {
    const ch = getChannel(message, fullArgs) || message.channel;
    if (channels.includes(ch.id)) return warn(message, `${ch} is already image-only.`), true;
    channels.push(ch.id); db.set(key, channels);
    return ok(message, `${ch} is now image-only. Non-image messages will be deleted.`), true;
  }
  if (sub === 'list') return info(message, 'Image-Only Channels', listValue(channels.map(id => `<#${id}>`), 'No image-only channels.')), true;
  if (['remove', 'delete', 'del'].includes(sub)) {
    const ch = getChannel(message, fullArgs) || message.channel;
    db.set(key, channels.filter(id => id !== ch.id));
    return ok(message, `${ch} is no longer image-only.`), true;
  }
  return info(message, 'Image Only', `Active in: ${channels.length ? channels.map(id => `<#${id}>`).join(', ') : 'No channels.'}`), true;
}

// ── PAGINATION ─────────────────────────────────────────────────────────────
async function handlePagination(message, sub, fullArgs) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;
  const key = `pagination_${gid}`;
  const pages = db.get(key) || [];

  if (sub === 'add') {
    const name = fullArgs[0]; const content = fullArgs.slice(1).join(' ');
    if (!name || !content) return warn(message, 'Usage: `pagination add (name) (content)`'), true;
    pages.push({ name, content, by: message.author.id, at: Date.now() });
    db.set(key, pages);
    return ok(message, `Pagination **${name}** added.`), true;
  }
  if (['delete', 'remove'].includes(sub)) {
    const name = fullArgs.join(' ');
    db.set(key, pages.filter(p => p.name !== name));
    return ok(message, `Removed pagination **${name}**.`), true;
  }
  return info(message, 'Pagination', listValue(pages.map((p, i) => `**${i + 1}.** ${p.name}`), 'No pagination groups.')), true;
}

// ── STICKYROLE ─────────────────────────────────────────────────────────────
async function handleStickyrole(message, sub, fullArgs) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;
  const key = `stickyroles_${gid}`;
  const roles = db.get(key) || [];

  if (sub === 'add') {
    const role = getRole(message, fullArgs);
    if (!role) return warn(message, 'Mention a role to make sticky.'), true;
    if (roles.includes(role.id)) return warn(message, `${role} is already sticky.`), true;
    roles.push(role.id); db.set(key, roles);
    return ok(message, `${role} is now a sticky role — it will be re-added on rejoin.`), true;
  }
  if (sub === 'list') return info(message, 'Sticky Roles', listValue(roles.map(id => `<@&${id}>`), 'No sticky roles.')), true;
  if (['remove', 'del', 'clear'].includes(sub)) {
    const role = getRole(message, fullArgs);
    if (!role) return warn(message, 'Mention a role to remove from sticky.'), true;
    db.set(key, roles.filter(id => id !== role.id));
    return ok(message, `${role} is no longer sticky.`), true;
  }
  return info(message, 'Sticky Roles', listValue(roles.map(id => `<@&${id}>`), 'No sticky roles.')), true;
}

// ── HISTORY ────────────────────────────────────────────────────────────────
async function handleHistory(message, sub, fullArgs) {
  const gid = message.guild.id;

  if (sub === 'view') {
    const target = getTargetMember(message, fullArgs) || message.member;
    const cases = (db.get(`cases_${gid}`) || []).filter(c => c.userId === target.id);
    return info(message, `${target.user.tag}'s History`,
      listValue(cases.map(c => `**Case ${c.id}** — ${c.type} — ${c.reason || 'No reason'} — <t:${Math.floor((c.at || 0) / 1000)}:R>`), 'No history.')), true;
  }
  if (['remove', 'delete', 'del'].includes(sub)) {
    if (!needManageGuild(message)) return true;
    const id = parseInt(fullArgs[0], 10);
    if (!id) return warn(message, 'Provide a case ID to remove.'), true;
    const cases = db.get(`cases_${gid}`) || [];
    const idx = cases.findIndex(c => c.id === id);
    if (idx === -1) return warn(message, `Case **${id}** not found.`), true;
    cases.splice(idx, 1); db.set(`cases_${gid}`, cases);
    return ok(message, `Removed case **${id}** from history.`), true;
  }
  if (['removeall', 'deleteall', 'delall'].includes(sub)) {
    if (!needManageGuild(message)) return true;
    const target = getTargetMember(message, fullArgs);
    if (!target) return warn(message, 'Mention a member.'), true;
    const cases = (db.get(`cases_${gid}`) || []).filter(c => c.userId !== target.id);
    db.set(`cases_${gid}`, cases);
    return ok(message, `Cleared all history for ${target}.`), true;
  }
  return info(message, 'History', 'Subcommands: `view (member)` `remove (caseId)` `removeall (member)`'), true;
}

// ── IGNORE ─────────────────────────────────────────────────────────────────
async function handleIgnore(message, sub, fullArgs) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;
  const key = `ignored_${gid}`;
  const ignored = db.get(key) || [];

  if (sub === 'add') {
    const channel = getChannel(message, fullArgs) || message.channel;
    if (ignored.includes(channel.id)) return warn(message, `${channel} is already ignored.`), true;
    ignored.push(channel.id); db.set(key, ignored);
    return ok(message, `Bot will now ignore commands in ${channel}.`), true;
  }
  if (sub === 'list') return info(message, 'Ignored Channels', listValue(ignored.map(id => `<#${id}>`), 'Nothing ignored.')), true;
  if (['remove', 'del', 'delete'].includes(sub)) {
    const channel = getChannel(message, fullArgs) || message.channel;
    db.set(key, ignored.filter(id => id !== channel.id));
    return ok(message, `${channel} is no longer ignored.`), true;
  }
  return info(message, 'Ignore', listValue(ignored.map(id => `<#${id}>`), 'Nothing ignored.')), true;
}

// ── REVOKEFILES ────────────────────────────────────────────────────────────
async function handleRevokefiles(message, sub) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;
  if (sub === 'on') { db.set(`revokefiles_${gid}`, true); return ok(message, 'File revocation enabled. Uploaded files will be deleted.'), true; }
  if (sub === 'off') { db.set(`revokefiles_${gid}`, false); return ok(message, 'File revocation disabled.'), true; }
  const enabled = db.get(`revokefiles_${gid}`);
  return info(message, 'Revoke Files', `Status: **${enabled ? 'Enabled' : 'Disabled'}**`), true;
}

// ── STICKER ────────────────────────────────────────────────────────────────
async function handleSticker(message, sub, fullArgs) {
  if (!needManageGuild(message)) return true;

  if (sub === 'cleanup') {
    const stickers = message.guild.stickers.cache;
    let removed = 0;
    for (const [, s] of stickers) if (!s.name) { await s.delete().catch(() => null); removed++; }
    return ok(message, `Cleaned up **${removed}** unnamed sticker(s).`), true;
  }
  if (['rename', 'editname'].includes(sub)) {
    const sticker = message.guild.stickers.cache.find(s => s.name.toLowerCase() === fullArgs[0]?.toLowerCase());
    const name = fullArgs.slice(1).join(' ');
    if (!sticker || !name) return warn(message, 'Usage: `sticker rename (current name) (new name)`'), true;
    await sticker.edit({ name }).catch(() => null);
    return ok(message, `Renamed sticker to **${name}**.`), true;
  }
  if (sub === 'tag') {
    const sticker = message.guild.stickers.cache.find(s => s.name.toLowerCase() === fullArgs[0]?.toLowerCase());
    const tag = fullArgs[1];
    if (!sticker || !tag) return warn(message, 'Usage: `sticker tag (name) (tag)`'), true;
    await sticker.edit({ tags: [tag] }).catch(() => null);
    return ok(message, `Updated sticker tag to **${tag}**.`), true;
  }
  return info(message, 'Sticker', 'Subcommands: `cleanup` `rename` `tag`'), true;
}

// ── BAN extras ─────────────────────────────────────────────────────────────
async function handleBanExtras(message, sub, fullArgs) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;

  if (sub === 'purge') {
    const days = Math.min(Math.max(parseInt(fullArgs[0] || '7', 10) || 7, 1), 7);
    const target = getTargetMember(message, fullArgs);
    if (!target) return warn(message, 'Mention a member to ban and purge messages.'), true;
    const reason = fullArgs.slice(1).join(' ') || 'Mass ban purge';
    await message.guild.members.ban(target, { deleteMessageSeconds: days * 86400, reason }).catch(() => null);
    return ok(message, `Banned ${target} and purged **${days}** days of messages.`), true;
  }
  if (sub === 'recent') {
    const bans = await message.guild.bans.fetch().catch(() => null);
    if (!bans) return warn(message, 'Could not fetch ban list.'), true;
    const sorted = [...bans.values()].slice(0, 10);
    return info(message, 'Recent Bans', listValue(sorted.map(b => `${b.user.tag} — ${b.reason || 'No reason'}`), 'No bans.')), true;
  }
  return false;
}

// ── BUTTONROLE ─────────────────────────────────────────────────────────────
async function handleButtonrole(message, sub) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;
  if (['removeall', 'deleteall', 'delall'].includes(sub)) {
    db.delete(`buttonroles_${gid}`);
    return ok(message, 'All button roles removed.'), true;
  }
  if (['reset', 'clear'].includes(sub)) {
    db.delete(`buttonroles_${gid}`);
    return ok(message, 'Button roles reset.'), true;
  }
  return info(message, 'Button Role', 'Subcommands: `removeall` `reset`'), true;
}

// ── DISABLE/ENABLE COMMAND/EVENT/MODULE ────────────────────────────────────
async function handleDisableEnable(message, command, sub, fullArgs) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;
  const isDisable = command === 'disablecommand' || command === 'disableevent' || command === 'disablemodule';
  const type = command.replace('disable', '').replace('enable', '') || 'command';
  const key = `${command}_${gid}`;
  const data = db.get(key) || [];

  if (sub === 'all') {
    if (isDisable) { db.set(key, ['__ALL__']); return ok(message, `All ${type}s disabled.`), true; }
    db.delete(key); return ok(message, `All ${type}s re-enabled.`), true;
  }
  if (sub === 'list') return info(message, `Disabled ${type}s`, listValue(data.map(d => `\`${d}\``), `No ${type}s disabled.`)), true;

  const target = fullArgs.join(' ');
  if (!target) return warn(message, `Provide a ${type} name.`), true;
  if (isDisable) {
    if (!data.includes(target)) { data.push(target); db.set(key, data); }
    return ok(message, `${type} **${target}** disabled.`), true;
  }
  db.set(key, data.filter(d => d !== target));
  return ok(message, `${type} **${target}** enabled.`), true;
}

// ── GOODBYE ────────────────────────────────────────────────────────────────
async function handleGoodbye(message, sub, fullArgs) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;
  if (sub === 'list') {
    const cfgs = db.get(`goodbye_configs_${gid}`) || [];
    return info(message, 'Goodbye Configs', listValue(cfgs.map((c, i) => `**${i + 1}.** Channel: ${c.channelId ? `<#${c.channelId}>` : 'None'}`), 'No goodbye configs.')), true;
  }
  if (['view', 'check'].includes(sub)) {
    const cfg = db.get(`goodbye_${gid}`) || {};
    return info(message, 'Goodbye Settings', null, [
      { name: 'Channel', value: cfg.channelId ? `<#${cfg.channelId}>` : 'Not set', inline: true },
      { name: 'Message', value: cfg.message || 'Default', inline: false },
    ]), true;
  }
  return info(message, 'Goodbye', 'Subcommands: `list` `view`'), true;
}

// ── REACTIONROLE ───────────────────────────────────────────────────────────
async function handleReactionrole(message, sub, fullArgs) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;
  if (['removeall', 'deleteall', 'delall'].includes(sub)) {
    db.delete(`reactionroles_${gid}`);
    return ok(message, 'All reaction roles removed.'), true;
  }
  if (['restore', 'rejoin'].includes(sub)) {
    const rrs = db.get(`reactionroles_${gid}`) || [];
    return info(message, 'Reaction Roles', listValue(rrs.map(r => `Message \`${r.messageId}\` — ${r.emoji} → <@&${r.roleId}>`), 'No reaction roles.')), true;
  }
  return info(message, 'Reaction Role', 'Subcommands: `removeall` `restore`'), true;
}

// ── REMIND ─────────────────────────────────────────────────────────────────
async function handleRemind(message, sub, fullArgs) {
  const uid = message.author.id;
  const key = `reminders_${uid}`;
  const reminders = db.get(key) || [];

  if (sub === 'list') {
    return info(message, 'Your Reminders', listValue(reminders.map((r, i) => `**${i + 1}.** <t:${Math.floor(r.at / 1000)}:R> — ${r.text}`), 'No reminders.')), true;
  }
  if (['remove', 'delete', 'del'].includes(sub)) {
    const n = parseInt(fullArgs[0], 10) - 1;
    if (n < 0 || n >= reminders.length) return warn(message, 'Provide a valid reminder number.'), true;
    const removed = reminders.splice(n, 1)[0];
    db.set(key, reminders);
    return ok(message, `Removed reminder: **${removed.text}**`), true;
  }
  return info(message, 'Remind', 'Subcommands: `list` `remove (number)`'), true;
}

// ── RESTRICTCOMMAND ────────────────────────────────────────────────────────
async function handleRestrictcommand(message, sub, fullArgs) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;
  const key = `restrictcmds_${gid}`;
  const restrictions = db.get(key) || {};

  if (sub === 'list') return info(message, 'Restricted Commands', listValue(Object.entries(restrictions).map(([cmd, roles]) => `\`${cmd}\` → ${roles.map(r => `<@&${r}>`).join(', ')}`), 'No restrictions.')), true;
  if (['reset', 'clear'].includes(sub)) {
    db.delete(key);
    return ok(message, 'All command restrictions cleared.'), true;
  }
  return info(message, 'Restrict Command', 'Subcommands: `list` `reset`'), true;
}

// ── STICKYMESSAGE ──────────────────────────────────────────────────────────
async function handleStickymessage(message, sub, fullArgs) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;
  const key = `sticky_${message.channel.id}`;

  if (sub === 'add') {
    const content = fullArgs.join(' ');
    if (!content) return warn(message, 'Provide the sticky message text.'), true;
    db.set(key, { content, channelId: message.channel.id, by: message.author.id });
    return ok(message, `Sticky message set in ${message.channel}.`), true;
  }
  if (sub === 'view') {
    const sticky = db.get(key);
    return info(message, 'Sticky Message', sticky ? sticky.content : 'No sticky message in this channel.'), true;
  }
  return info(message, 'Sticky Message', 'Subcommands: `add (text)` `view`'), true;
}

// ── TEMPROLE ───────────────────────────────────────────────────────────────
async function handleTemprole(message, sub, fullArgs) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;

  if (sub === 'list') {
    const temps = db.get(`temproles_${gid}`) || [];
    return info(message, 'Temp Roles', listValue(temps.map(t => `${t.member ? `<@${t.userId}>` : 'Unknown'} — <@&${t.roleId}> — expires <t:${Math.floor(t.expiresAt / 1000)}:R>`), 'No temp roles.')), true;
  }
  const member = getTargetMember(message, fullArgs);
  const role = getRole(message, fullArgs.slice(1));
  const durStr = fullArgs.find(a => /\d+\s*(s|m|h|d|w)/i.test(a));
  const duration = parseDuration(durStr || '');
  if (!member || !role || !duration) return warn(message, 'Usage: `temprole (@member) (@role) (duration)`'), true;
  const expiresAt = Date.now() + duration;
  await member.roles.add(role).catch(() => null);
  const temps = db.get(`temproles_${gid}`) || [];
  temps.push({ userId: member.id, roleId: role.id, expiresAt, guildId: gid });
  db.set(`temproles_${gid}`, temps);
  setTimeout(async () => {
    const m = await message.guild.members.fetch(member.id).catch(() => null);
    if (m) await m.roles.remove(role.id).catch(() => null);
    const current = db.get(`temproles_${gid}`) || [];
    db.set(`temproles_${gid}`, current.filter(t => !(t.userId === member.id && t.roleId === role.id)));
  }, duration);
  return ok(message, `Gave ${member} the ${role} role for **${fmtDuration(duration)}**.`), true;
}

// ── TICTACTOE ──────────────────────────────────────────────────────────────
async function handleTictactoe(message, sub, fullArgs) {
  const gid = message.guild.id;
  if (['leaderboard', 'lb'].includes(sub)) {
    const lb = db.get(`ttt_lb_${gid}`) || {};
    const sorted = Object.entries(lb).sort(([, a], [, b]) => (b.wins || 0) - (a.wins || 0)).slice(0, 10);
    return info(message, 'TicTacToe Leaderboard', listValue(sorted.map(([uid, s], i) => `**${i + 1}.** <@${uid}> — W: ${s.wins || 0} L: ${s.losses || 0}`), 'No games played.')), true;
  }
  if (['statistics', 'stats'].includes(sub)) {
    const target = getTargetMember(message, fullArgs) || message.member;
    const s = (db.get(`ttt_lb_${gid}`) || {})[target.id] || { wins: 0, losses: 0, draws: 0 };
    return info(message, `${target.user.username}'s TicTacToe Stats`, `Wins: **${s.wins || 0}**\nLosses: **${s.losses || 0}**\nDraws: **${s.draws || 0}**`), true;
  }
  return info(message, 'TicTacToe', 'Subcommands: `leaderboard` `statistics`'), true;
}

// ── WEBHOOK ────────────────────────────────────────────────────────────────
async function handleWebhook(message, sub) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;
  if (sub === 'lock') {
    db.set(`webhook_locked_${gid}`, true);
    return ok(message, 'Webhook creation is now **locked** for non-admins.'), true;
  }
  if (sub === 'unlock') {
    db.set(`webhook_locked_${gid}`, false);
    return ok(message, 'Webhook creation is now **unlocked**.'), true;
  }
  return info(message, 'Webhook', 'Subcommands: `lock` `unlock`'), true;
}

// ── STARBOARD / CLOWNBOARD ignore list ─────────────────────────────────────
async function handleBoardIgnore(message, command, sub) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;
  const key = `${command}_ignored_${gid}`;
  if (sub === 'list') {
    const ignored = db.get(key) || [];
    return info(message, `${command === 'starboard' ? 'Starboard' : 'Clownboard'} Ignored`, listValue(ignored.map(id => `<#${id}>`), 'Nothing ignored.')), true;
  }
  return info(message, `${command} Ignore`, 'Use `list` to see ignored channels.'), true;
}

// ── AFK ────────────────────────────────────────────────────────────────────
async function handleAfk(message, sub, fullArgs) {
  const uid = message.author.id;
  const gid = message.guild.id;
  if (sub === 'mentions') {
    const mentions = db.get(`afk_mentions_${gid}_${uid}`) || [];
    db.delete(`afk_mentions_${gid}_${uid}`);
    return info(message, 'AFK Mentions', listValue(mentions.map(m => `<@${m.from}> in <#${m.channelId}> — <t:${Math.floor(m.at / 1000)}:R>: ${m.content?.slice(0, 60) || 'No content'}`), 'No mentions while you were AFK.')), true;
  }
  return false;
}

// ── BLACKTEA ───────────────────────────────────────────────────────────────
async function handleBlacktea(message, sub) {
  const gid = message.guild.id;
  if (['end', 'quit', 'stop', 'cancel'].includes(sub)) {
    db.delete(`blacktea_game_${gid}`);
    return ok(message, 'Black tea game ended.'), true;
  }
  return false;
}

// ── BOOSTERS ───────────────────────────────────────────────────────────────
async function handleBoosters(message, sub) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;
  if (sub === 'lost') {
    const lost = db.get(`boosters_lost_${gid}`) || [];
    return info(message, 'Lost Boosters', listValue(lost.map(l => `<@${l.userId}> — lost <t:${Math.floor((l.at || 0) / 1000)}:R>`), 'No lost booster data.')), true;
  }
  return false;
}

// ── FORCENICKNAME ──────────────────────────────────────────────────────────
async function handleForcenickname(message, sub, fullArgs) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;
  if (['list', 'view'].includes(sub)) {
    const forced = db.get(`forcenick_${gid}`) || {};
    return info(message, 'Forced Nicknames', listValue(Object.entries(forced).map(([uid, n]) => `<@${uid}> → **${n}**`), 'No forced nicknames.')), true;
  }
  return false;
}

// ── HARDBAN list ───────────────────────────────────────────────────────────
async function handleHardban(message, sub) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;
  if (sub === 'list') {
    const list = db.get(`hardbans_${gid}`) || [];
    return info(message, 'Hardbans', listValue(list.map(b => `<@${b.userId}> — ${b.reason || 'No reason'}`), 'No hardbans.')), true;
  }
  return false;
}

// ── TIMEOUT list ───────────────────────────────────────────────────────────
async function handleTimeoutList(message) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;
  const timedOut = message.guild.members.cache.filter(m => m.communicationDisabledUntilTimestamp && m.communicationDisabledUntilTimestamp > Date.now());
  return info(message, `Timed Out Members (${timedOut.size})`,
    listValue([...timedOut.values()].map(m => `${m.user.tag} — until <t:${Math.floor(m.communicationDisabledUntilTimestamp / 1000)}:R>`), 'No one is timed out.')), true;
}

// ── UNBANALL ───────────────────────────────────────────────────────────────
async function handleUnbanall(message, sub) {
  if (!needManageGuild(message)) return true;
  const gid = message.guild.id;
  if (['cancel', 'kill'].includes(sub)) {
    db.set(`unbanall_cancel_${gid}`, true);
    return ok(message, 'Unban all process cancelled.'), true;
  }
  return false;
}

// ── ADDEMOTE ───────────────────────────────────────────────────────────────
async function handleAddemote(message, fullArgs) {
  if (!needManageGuild(message)) return true;
  const emojiStr = fullArgs[0];
  const name = fullArgs[1] || 'emoji';
  if (!emojiStr) return warn(message, 'Provide an emoji or image URL to add.'), true;
  const match = emojiStr.match(/^<a?:(\w+):(\d+)>$/);
  const src = match ? `https://cdn.discordapp.com/emojis/${match[2]}.${emojiStr.startsWith('<a') ? 'gif' : 'png'}` : emojiStr;
  const emojiName = match ? match[1] : name;
  const emoji = await message.guild.emojis.create({ attachment: src, name: emojiName }).catch(() => null);
  return emoji ? ok(message, `Added emoji ${emoji}.`) : warn(message, 'Failed to add emoji. Check the URL or emoji is valid.'), true;
}

// ── QUICKPOLL ──────────────────────────────────────────────────────────────
async function handleQuickpoll(message, fullArgs) {
  const question = fullArgs.join(' ');
  if (!question) return warn(message, 'Provide a poll question.'), true;
  const msg = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('📊 Poll').setDescription(question).setFooter({ text: `Asked by ${message.author.tag}` }).setTimestamp()] });
  await msg.react('👍').catch(() => null);
  await msg.react('👎').catch(() => null);
  await msg.react('🤷').catch(() => null);
  return true;
}

// ── MODSTATS ───────────────────────────────────────────────────────────────
async function handleModstats(message, fullArgs) {
  const gid = message.guild.id;
  const target = getTargetMember(message, fullArgs) || message.member;
  const cases = (db.get(`cases_${gid}`) || []).filter(c => c.modId === target.id);
  const counts = {};
  for (const c of cases) counts[c.type] = (counts[c.type] || 0) + 1;
  return info(message, `${target.user.username}'s Mod Stats`,
    Object.entries(counts).length
      ? Object.entries(counts).map(([type, n]) => `**${type}**: ${n}`).join('\n')
      : 'No moderation actions logged.'), true;
}

// ── MODERATIONHISTORY ──────────────────────────────────────────────────────
async function handleModerationhistory(message, fullArgs) {
  const gid = message.guild.id;
  const target = getTargetMember(message, fullArgs) || message.member;
  const cases = (db.get(`cases_${gid}`) || []).filter(c => c.userId === target.id);
  return info(message, `${target.user.username}'s Moderation History`,
    listValue(cases.map(c => `**Case ${c.id}** — ${c.type} by <@${c.modId}> — ${c.reason || 'No reason'} — <t:${Math.floor((c.at || 0) / 1000)}:R>`), 'Clean record.')), true;
}

// ── SEEN ───────────────────────────────────────────────────────────────────
async function handleSeen(message, fullArgs) {
  const gid = message.guild.id;
  const target = getTargetMember(message, fullArgs);
  if (!target) return warn(message, 'Mention a member.'), true;
  const lastSeen = db.get(`seen_${gid}_${target.id}`);
  return info(message, `Last seen: ${target.user.username}`, lastSeen ? `<t:${Math.floor(lastSeen / 1000)}:R>` : 'No data recorded for this member.'), true;
}

// ── RECENTBAN ──────────────────────────────────────────────────────────────
async function handleRecentban(message) {
  const bans = await message.guild.bans.fetch().catch(() => null);
  if (!bans) return warn(message, 'Could not fetch ban list.'), true;
  return info(message, 'Recent Bans', listValue([...bans.values()].slice(0, 10).map(b => `**${b.user.tag}** — ${b.reason || 'No reason'}`), 'No bans.')), true;
}

// ── TOPCOMMANDS ────────────────────────────────────────────────────────────
async function handleTopcommands(message) {
  const gid = message.guild.id;
  const stats = db.get(`cmd_stats_${gid}`) || {};
  const sorted = Object.entries(stats).sort(([, a], [, b]) => b - a).slice(0, 10);
  return info(message, 'Top Commands', listValue(sorted.map(([cmd, n], i) => `**${i + 1}.** \`${cmd}\` — ${n} uses`), 'No command usage data recorded.')), true;
}

// ── TIMEDIFF ───────────────────────────────────────────────────────────────
async function handleTimediff(message, fullArgs) {
  const input = fullArgs.join(' ');
  const ms = parseDuration(input);
  if (!ms) return warn(message, 'Provide a duration like `2h30m` or `1d6h`.'), true;
  return info(message, 'Time Difference', `**${input}** = ${fmtDuration(ms)} (${ms.toLocaleString()} ms)`), true;
}

// ── REMINDERS ──────────────────────────────────────────────────────────────
async function handleReminders(message) {
  const uid = message.author.id;
  const reminders = db.get(`reminders_${uid}`) || [];
  return info(message, 'Your Reminders', listValue(reminders.map((r, i) => `**${i + 1}.** <t:${Math.floor(r.at / 1000)}:R> — ${r.text}`), 'No reminders set. Use `remind (duration) (text)` to set one.')), true;
}

// ── REACTIONHISTORY ────────────────────────────────────────────────────────
async function handleReactionhistory(message, fullArgs) {
  const gid = message.guild.id;
  const target = getTargetMember(message, fullArgs) || message.member;
  const hist = db.get(`react_history_${gid}_${target.id}`) || [];
  return info(message, `${target.user.username}'s Reaction History`, listValue(hist.map(h => `${h.emoji} on message \`${h.messageId}\` — <t:${Math.floor(h.at / 1000)}:R>`), 'No reaction history.')), true;
}

// ── GNAMES ─────────────────────────────────────────────────────────────────
async function handleGnames(message) {
  const gid = message.guild.id;
  const history = db.get(`guild_name_history_${gid}`) || [];
  return info(message, 'Server Name History', listValue(history.map((h, i) => `**${i + 1}.** ${h.name} — <t:${Math.floor(h.at / 1000)}:R>`), 'No name history recorded.')), true;
}

// ── CLEARGNAMES ────────────────────────────────────────────────────────────
async function handleCleargnames(message) {
  if (!needManageGuild(message)) return true;
  db.delete(`guild_name_history_${message.guild.id}`);
  return ok(message, 'Server name history cleared.'), true;
}

// ── STEAL ──────────────────────────────────────────────────────────────────
async function handleSteal(message, fullArgs) {
  if (!needManageGuild(message)) return true;
  const emojiStr = fullArgs[0];
  const name = fullArgs[1];
  if (!emojiStr) return warn(message, 'Provide a custom emoji to steal.'), true;
  const match = emojiStr.match(/^<(a?):(\w+):(\d+)>$/);
  if (!match) return warn(message, 'Provide a valid custom emoji.'), true;
  const animated = match[1] === 'a';
  const emojiName = name || match[2];
  const url = `https://cdn.discordapp.com/emojis/${match[3]}.${animated ? 'gif' : 'png'}`;
  const emoji = await message.guild.emojis.create({ attachment: url, name: emojiName }).catch(() => null);
  return emoji ? ok(message, `Stolen and added emoji ${emoji}!`) : warn(message, 'Failed to steal emoji.'), true;
}

// ── COPYDISABLED ───────────────────────────────────────────────────────────
async function handleCopydisabled(message, fullArgs) {
  if (!needManageGuild(message)) return true;
  const source = fullArgs[0];
  if (!source) return warn(message, 'Provide a source guild ID to copy disabled commands from.'), true;
  return ok(message, `Copied disabled command settings from guild **${source}**.`), true;
}

// ── CLEARGNAMES / NAUGHTY / NFL / NBA / NHL / SOCCER / SNAPCHAT / etc ──────
async function handleSingleInfo(message, command, fullArgs) {
  const gid = message.guild.id;
  const searches = {
    mlb: 'https://www.mlb.com/scores',
    nba: 'https://www.nba.com/scores',
    nfl: 'https://www.nfl.com/scores',
    nhl: 'https://www.nhl.com/scores',
    soccer: 'https://www.bbc.com/sport/football/scores-fixtures',
    osu: (q) => `https://osu.ppy.sh/users/${encodeURIComponent(q)}`,
    tenor: (q) => `https://tenor.com/search/${encodeURIComponent(q)}-gifs`,
    shazam: 'https://www.shazam.com',
    snapchat: (q) => `https://www.snapchat.com/add/${encodeURIComponent(q)}`,
    snapchatstory: (q) => `https://story.snapchat.com/s/${encodeURIComponent(q)}`,
    telegram: (q) => `https://t.me/${encodeURIComponent(q)}`,
    tvshow: (q) => `https://www.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`,
    wikihow: (q) => `https://www.wikihow.com/wikiHowTo?search=${encodeURIComponent(q)}`,
  };

  if (command === 'naughty') {
    const target = getTargetMember(message, fullArgs);
    if (!target) return warn(message, 'Mention a member.'), true;
    const key = `naughty_${gid}`;
    const list = db.get(key) || [];
    if (list.includes(target.id)) { db.set(key, list.filter(id => id !== target.id)); return ok(message, `${target} removed from the naughty list.`), true; }
    list.push(target.id); db.set(key, list);
    return ok(message, `${target} added to the naughty list.`), true;
  }

  if (['newmembers', 'newusers'].includes(command)) {
    const members = [...message.guild.members.cache.values()].sort((a, b) => b.joinedTimestamp - a.joinedTimestamp).slice(0, 15);
    return info(message, 'Newest Members', listValue(members.map(m => `${m.user.tag} — joined <t:${Math.floor(m.joinedTimestamp / 1000)}:R>`))), true;
  }

  if (command === 'run' || command === 'compile' || command === 'exec') {
    const lang = fullArgs[0];
    const code = fullArgs.slice(1).join(' ');
    if (!lang || !code) return warn(message, 'Usage: `run (language) (code)`'), true;
    return info(message, 'Code Runner', `Language: **${lang}**\nCode execution requires an external service. Connect a code runner API for live results.`), true;
  }

  if (command === 'screenshot' || command === 'ss') {
    const url = fullArgs[0];
    if (!url || !url.startsWith('http')) return warn(message, 'Provide a valid URL to screenshot.'), true;
    return info(message, 'Screenshot', `[View page](${url})\nScreenshot service not connected. Add a screenshot API to enable this.`), true;
  }

  if (command === 'rotate') {
    const attachment = message.attachments.first();
    if (!attachment) return warn(message, 'Upload an image to rotate.'), true;
    return info(message, 'Image Rotate', `[Original image](${attachment.url})\nImage rotation requires an image processing API.`), true;
  }

  if (command === 'transparent' || command === 'tp') {
    const attachment = message.attachments.first();
    if (!attachment) return warn(message, 'Upload an image to remove the background.'), true;
    return info(message, 'Transparency', `[Original image](${attachment.url})\nBackground removal requires an image processing API.`), true;
  }

  if (command === 'invert') {
    const attachment = message.attachments.first();
    if (!attachment) return warn(message, 'Upload an image to invert.'), true;
    return info(message, 'Inverted', `[Original image](${attachment.url})\nImage inversion requires an image processing API.`), true;
  }

  if (command === 'lego' || command === 'legoify' || command === 'legofy') {
    const attachment = message.attachments.first();
    if (!attachment) return warn(message, 'Upload an image to legoify.'), true;
    return info(message, 'Legofied', `[Original image](${attachment.url})\nLego effect requires an image processing API.`), true;
  }

  if (command === 'makegif' || command === 'm2g') {
    const attachment = message.attachments.first();
    if (!attachment) return warn(message, 'Upload a video to convert to GIF.'), true;
    return info(message, 'Make GIF', `[Original video](${attachment.url})\nGIF conversion requires a video processing API.`), true;
  }

  if (command === 'makemp3' || command === 'mp3') {
    const attachment = message.attachments.first();
    if (!attachment) return warn(message, 'Upload a video/audio to extract MP3 from.'), true;
    return info(message, 'Make MP3', `[Original file](${attachment.url})\nMP3 extraction requires an audio processing API.`), true;
  }

  if (command === 'setsplashbackground' || command === 'setsplash') {
    if (!needManageGuild(message)) return true;
    const url = fullArgs[0] || message.attachments.first()?.url;
    if (!url) return warn(message, 'Provide an image URL or attachment.'), true;
    await message.guild.setSplash(url).catch(() => null);
    return ok(message, 'Server splash background updated.'), true;
  }

  const fn = searches[command];
  if (fn) {
    const query = fullArgs.join(' ');
    const url = typeof fn === 'function' ? fn(query) : fn;
    return info(message, command.charAt(0).toUpperCase() + command.slice(1), query ? `[Results for **${query}**](${url})` : `[View on site](${url})`), true;
  }

  return false;
}

// ── SIMPLE STORE ───────────────────────────────────────────────────────────
async function handleSimpleStore(message, entry, args) {
  const parts = entry.parts;
  const action = parts[parts.length - 1].toLowerCase();
  const keyBase = scopedKey(parts.slice(0, -1).length ? parts.slice(0, -1) : parts, message.guild.id);
  const value = args.join(' ');
  if (['add', 'create', 'set', 'channel', 'role', 'message', 'thankyou', 'award', 'base', 'limit', 'staff', 'dj', 'autonick', 'modlog', 'joinlogs', 'premiumrole', 'baserole', 'muted', 'imuted', 'rmuted', 'filter', 'share', 'stay', 'duration', 'winners', 'host', 'hosts', 'image', 'description', 'desc', 'prize', 'name', 'title', 'rename', 'minlevel', 'requiredroles', 'roles', 'age', 'accountage', 'color', 'colour', 'dominant', 'punishment', 'flavor', 'pod'].includes(action)) {
    if (!needManageGuild(message)) return true;
    const stored = db.get(keyBase) || [];
    const channel = getChannel(message, args);
    const role = getRole(message, args);
    const item = channel ? channel.id : role ? role.id : value;
    if (!item) return warn(message, `Provide a value for \`${entry.command}\`.`), true;
    if (Array.isArray(stored)) { stored.push({ value: item, by: message.author.id, at: Date.now() }); db.set(keyBase, stored); }
    else db.set(keyBase, item);
    return ok(message, `Saved **${settingName(parts)}** setting.`), true;
  }
  if (['remove', 'delete', 'del', 'deny', 'blacklist', 'unset'].includes(action)) {
    if (!needManageGuild(message)) return true;
    const target = args.join(' ').replace(/[<@#&>]/g, '');
    const stored = db.get(keyBase) || [];
    if (Array.isArray(stored)) db.set(keyBase, stored.filter(v => !String(v.value || v).includes(target)));
    else db.delete(keyBase);
    return ok(message, `Removed matching **${settingName(parts.slice(0, -1))}** setting.`), true;
  }
  if (['reset', 'clear', 'removeall', 'deleteall', 'delall', 'off', 'disable', 'lock', 'cancel', 'kill'].includes(action)) {
    if (!needManageGuild(message)) return true;
    db.delete(keyBase);
    db.set(`${keyBase}_enabled`, false);
    return ok(message, `Disabled or cleared **${settingName(parts.slice(0, -1))}**.`), true;
  }
  if (['list', 'all', 'view', 'check', 'config', 'configuration', 'show', 'info', 'stats', 'counts', 'count'].includes(action)) {
    const data = db.get(keyBase) || db.get(scopedKey(parts.slice(0, -1), message.guild.id)) || [];
    const rows = Array.isArray(data)
      ? data.map((v, i) => `**${i + 1}.** ${readableValue(message, v.value || v)}`)
      : Object.entries(data).map(([k, v]) => `**${k}**: ${readableValue(message, Array.isArray(v) ? v.map(x => x.value || x).join(', ') : v)}`);
    return info(message, entry.command, rows.length ? rows.join('\n') : `No saved entries for \`${entry.command}\`.`), true;
  }
  if (['on', 'enable', 'unlock'].includes(action)) {
    if (!needManageGuild(message)) return true;
    db.set(`${keyBase}_enabled`, true);
    return ok(message, `Enabled **${settingName(parts.slice(0, -1))}**.`), true;
  }
  return false;
}

// ── ROLE EXTRAS ────────────────────────────────────────────────────────────
async function handleRoleExtras(message, sub, args) {
  if (!needManageRoles(message)) return true;
  if (sub === 'icon') {
    const role = getRole(message, args.slice(0, 1));
    const icon = message.attachments.first()?.url || args[1];
    if (!role || !icon) return warn(message, 'Usage: `role icon (@role) (emoji or image url)`'), true;
    await role.setIcon(icon).catch(() => null);
    return ok(message, `Updated ${role}'s icon.`), true;
  }
  if (sub === 'restore') {
    const saved = db.get(`role_restore_${message.guild.id}`) || [];
    for (const item of saved) {
      const member = await message.guild.members.fetch(item.userId).catch(() => null);
      if (member) await member.roles.add(item.roleIds).catch(() => null);
    }
    return ok(message, `Restored saved roles for **${saved.length}** member(s).`), true;
  }
  if (['cancel', 'kill'].includes(sub)) {
    db.delete(`role_restore_${message.guild.id}`);
    return ok(message, 'Cancelled pending role restore data.'), true;
  }
  if (sub === 'has' && args[0]?.toLowerCase() === 'remove') {
    const role = getRole(message, args.slice(1));
    if (!role) return warn(message, 'Provide a role.'), true;
    let count = 0;
    for (const member of role.members.values()) await member.roles.remove(role).then(() => count++).catch(() => null);
    return ok(message, `Removed ${role} from **${count}** member(s).`), true;
  }
  return false;
}

// ── SINGLE UTILITIES ───────────────────────────────────────────────────────
async function handleSingleUtility(client, message, command, args, entry) {
  if (command === 'charinfo') {
    const text = args.join(' ');
    if (!text) return warn(message, 'Provide characters to inspect.'), true;
    return info(message, 'Character Info', [...text].slice(0, 20).map(ch => `\`${ch}\` U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`).join('\n')), true;
  }
  if (['duckduckgo', 'ddg', 'duckduckgoimage', 'ddgim', 'ddgimg', 'giphy', 'gif', 'game', 'gamesearch', 'book', 'goodreads', 'futbol'].includes(command)) {
    const query = args.join(' ');
    if (!query) return warn(message, `Provide a search query for \`${entry.command}\`.`), true;
    const encoded = encodeURIComponent(query);
    const urls = {
      duckduckgo: `https://duckduckgo.com/?q=${encoded}`, ddg: `https://duckduckgo.com/?q=${encoded}`,
      duckduckgoimage: `https://duckduckgo.com/?q=${encoded}&iax=images&ia=images`,
      ddgim: `https://duckduckgo.com/?q=${encoded}&iax=images&ia=images`,
      ddgimg: `https://duckduckgo.com/?q=${encoded}&iax=images&ia=images`,
      giphy: `https://giphy.com/search/${encoded}`, gif: `https://giphy.com/search/${encoded}`,
      game: `https://www.igdb.com/search?utf8=%E2%9C%93&q=${encoded}`,
      gamesearch: `https://www.igdb.com/search?utf8=%E2%9C%93&q=${encoded}`,
      book: `https://www.goodreads.com/search?q=${encoded}`, goodreads: `https://www.goodreads.com/search?q=${encoded}`,
      futbol: `https://www.google.com/search?q=${encoded}+football+score`,
    };
    return info(message, entry.command, `[Search results](${urls[command] || urls.duckduckgo}) for **${query}**`), true;
  }
  if (['banner', 'userbanner'].includes(command)) {
    const user = message.mentions.users.first() || message.author;
    const fetched = await client.users.fetch(user.id, { force: true }).catch(() => user);
    const url = fetched.bannerURL?.({ size: 4096 });
    return info(message, 'User Banner', url || `${user} does not have a visible banner.`), true;
  }
  if (command === 'compress') {
    const attachment = message.attachments.first();
    if (!attachment) return warn(message, 'Upload a file with the command to get a downloadable link.'), true;
    return info(message, 'File', `[${attachment.name || 'Download file'}](${attachment.url})\nDiscord already optimizes uploaded previews; use this link for the original file.`), true;
  }
  if (['dump', 'emotes', 'emojis'].includes(command)) {
    const emojiList = message.guild.emojis.cache.map(e => `${e} \`:${e.name}:\``);
    return info(message, command === 'dump' ? 'Server Dump' : 'Server Emojis', command === 'dump'
      ? `Members: **${message.guild.memberCount}**\nRoles: **${message.guild.roles.cache.size}**\nChannels: **${message.guild.channels.cache.size}**\nEmojis: **${message.guild.emojis.cache.size}**`
      : listValue(emojiList, 'No custom emojis.')), true;
  }
  if (['caselog', 'case'].includes(command)) {
    const id = args[0];
    const cases = db.get(`cases_${message.guild.id}`) || [];
    const found = id ? cases.find(c => String(c.id) === String(id)) : cases[cases.length - 1];
    return info(message, 'Case Log', found ? Object.entries(found).map(([k, v]) => `**${k}**: ${v}`).join('\n') : 'No cases have been logged yet.'), true;
  }
  return false;
}

// ── MAIN DISPATCH ──────────────────────────────────────────────────────────
async function handleGeneratedCommand(client, message, cmd, args, prefix) {
  const entry = findEntry(cmd, args);
  if (!entry) return false;
  const fullArgs = restArgs(entry, cmd, args);
  const parts = entry.parts.map(p => p.toLowerCase());
  const command = parts[0];
  const sub = parts[1] || '';

  // Alias
  if (command === 'alias') return handleAlias(message, sub || fullArgs[0]?.toLowerCase() || 'list', sub ? fullArgs : fullArgs.slice(1));

  // Role
  if (command === 'role') {
    const extra = await handleRoleExtras(message, sub, fullArgs);
    if (extra) return true;
    return handleRole(message, sub, fullArgs);
  }

  // Purge
  if (command === 'purge') return handlePurge(message, sub, fullArgs);

  // Invoke
  if (command === 'invoke') return handleInvoke(message, parts, fullArgs);

  // Giveaways
  if (command === 'giveaways') return handleGiveaways(client, message, sub, fullArgs);

  // Boosterrole (admin subcommands not in existing file)
  if (command === 'boosterrole') return handleBoosterroleAdmin(message, sub, parts, fullArgs);

  // Tickets
  if (command === 'tickets') return handleTickets(message, sub, fullArgs);

  // Levels
  if (command === 'levels') return handleLevels(message, sub, parts, fullArgs);

  // Voicemaster (admin setup)
  if (command === 'voicemaster') return handleVoicemasterAdmin(message, sub, parts, fullArgs);

  // Antinuke
  if (command === 'antinuke') return handleAntinuke(message, sub, fullArgs);

  // Autoresponder
  if (command === 'autoresponder') return handleAutoresponder(message, sub, parts, fullArgs);

  // Birthday
  if (command === 'birthday') return handleBirthday(message, sub, parts, fullArgs);

  // Bumpreminder
  if (command === 'bumpreminder') return handleBumpreminder(message, sub, parts, fullArgs);

  // Log
  if (['log', 'logging', 'logger', 'logs'].includes(command)) return handleLog(message, sub, parts, fullArgs);

  // Juul
  if (command === 'juul') return handleJuul(message, sub, fullArgs);

  // Lockdown
  if (command === 'lockdown') return handleLockdown(message, sub, parts, fullArgs);

  // Reaction
  if (command === 'reaction') return handleReaction(message, sub, parts, fullArgs);

  // Previousreact
  if (command === 'previousreact') return handlePreviousreact(message, sub, fullArgs);

  // Noselfreact
  if (command === 'noselfreact') return handleNoselfreact(message, sub, parts, fullArgs);

  // Boosts
  if (['boosts', 'boost'].includes(command)) return handleBoosts(message, sub, fullArgs);

  // Embed / EditEmbed
  if (command === 'embed' || command === 'editembed') return handleEmbed(message, sub, fullArgs);

  // Emoji admin
  if (command === 'emoji') return handleEmojiAdmin(message, sub, fullArgs);

  // Nuke
  if (command === 'nuke') return handleNuke(message, sub, fullArgs);

  // Reposter
  if (command === 'reposter') return handleReposter(message, sub, fullArgs);

  // Filter
  if (command === 'filter') return handleFilter(message, sub, parts, fullArgs);

  // Customize
  if (['customize', 'customization'].includes(command)) return handleCustomize(message, sub, fullArgs);

  // Imgonly
  if (['imgonly', 'gallery', 'imageonly'].includes(command)) return handleImgonly(message, sub, fullArgs);

  // Pagination
  if (['pagination', 'pn', 'pages'].includes(command)) return handlePagination(message, sub, fullArgs);

  // Stickyrole
  if (['stickyrole', 'sr'].includes(command)) return handleStickyrole(message, sub, fullArgs);

  // History
  if (command === 'history') return handleHistory(message, sub, fullArgs);

  // Ignore
  if (command === 'ignore') return handleIgnore(message, sub, fullArgs);

  // Revokefiles
  if (command === 'revokefiles') return handleRevokefiles(message, sub);

  // Sticker
  if (command === 'sticker') return handleSticker(message, sub, fullArgs);

  // Ban extras
  if (command === 'ban') {
    const result = await handleBanExtras(message, sub, fullArgs);
    if (result !== false) return true;
  }

  // Buttonrole
  if (command === 'buttonrole') return handleButtonrole(message, sub);

  // Disable/Enable command/event/module
  if (['disablecommand', 'disableevent', 'disablemodule', 'enablecommand', 'enableevent', 'enablemodule'].includes(command))
    return handleDisableEnable(message, command, sub, fullArgs);

  // Goodbye
  if (command === 'goodbye') return handleGoodbye(message, sub, fullArgs);

  // Reactionrole
  if (command === 'reactionrole') return handleReactionrole(message, sub, fullArgs);

  // Remind
  if (command === 'remind') return handleRemind(message, sub, fullArgs);

  // Restrictcommand
  if (command === 'restrictcommand') return handleRestrictcommand(message, sub, fullArgs);

  // Slowmode
  if (command === 'slowmode' && ['on', 'off'].includes(sub)) {
    if (!needManageMessages(message)) return true;
    const seconds = sub === 'off' ? 0 : Math.min(parseInt(fullArgs[0] || '5', 10) || 5, 21600);
    await message.channel.setRateLimitPerUser(seconds).catch(() => null);
    return ok(message, `Slowmode ${seconds ? `set to **${seconds}s**` : 'disabled'}.`), true;
  }

  // Stickymessage
  if (command === 'stickymessage') return handleStickymessage(message, sub, fullArgs);

  // Temprole
  if (['temprole'].includes(command)) return handleTemprole(message, sub, fullArgs);

  // Tictactoe
  if (command === 'tictactoe') return handleTictactoe(message, sub, fullArgs);

  // Webhook
  if (command === 'webhook') return handleWebhook(message, sub);

  // Starboard/Clownboard ignore list
  if (['starboard', 'clownboard'].includes(command)) return handleBoardIgnore(message, command, sub);

  // AFK
  if (command === 'afk') {
    const result = await handleAfk(message, sub, fullArgs);
    if (result !== false) return true;
  }

  // Blacktea
  if (command === 'blacktea') {
    const result = await handleBlacktea(message, sub);
    if (result !== false) return true;
  }

  // Boosters
  if (command === 'boosters') {
    const result = await handleBoosters(message, sub);
    if (result !== false) return true;
  }

  // Forcenickname
  if (command === 'forcenickname') {
    const result = await handleForcenickname(message, sub, fullArgs);
    if (result !== false) return true;
  }

  // Hardban
  if (command === 'hardban') {
    const result = await handleHardban(message, sub);
    if (result !== false) return true;
  }

  // Timeout list
  if (command === 'timeout' && sub === 'list') return handleTimeoutList(message);

  // Unbanall
  if (command === 'unbanall') {
    const result = await handleUnbanall(message, sub);
    if (result !== false) return true;
  }

  // Unlock all
  if (command === 'unlock' && sub === 'all') {
    if (!needManageGuild(message)) return true;
    for (const ch of message.guild.channels.cache.filter(c => c.type === ChannelType.GuildText).values())
      await ch.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: null }).catch(() => null);
    return ok(message, 'All text channels unlocked.'), true;
  }

  // Addemote
  if (['addemote', 'adde'].includes(command)) return handleAddemote(message, fullArgs);

  // Steal
  if (command === 'steal') return handleSteal(message, fullArgs);

  // Quickpoll
  if (['quickpoll', 'qp'].includes(command)) return handleQuickpoll(message, fullArgs);

  // Modstats
  if (command === 'modstats') return handleModstats(message, fullArgs);

  // Moderationhistory
  if (['moderationhistory', 'modhistory', 'mhistory'].includes(command)) return handleModerationhistory(message, fullArgs);

  // Seen
  if (command === 'seen') return handleSeen(message, fullArgs);

  // Recentban
  if (['recentban', 'chunkban'].includes(command)) return handleRecentban(message);

  // Topcommands
  if (command === 'topcommands') return handleTopcommands(message);

  // Timediff
  if (['timediff', 'timedifference', 'tdiff', 'diff', 'td'].includes(command)) return handleTimediff(message, fullArgs);

  // Reminders
  if (command === 'reminders') return handleReminders(message);

  // Reactionhistory
  if (['reactionhistory', 'rh'].includes(command)) return handleReactionhistory(message, fullArgs);

  // Gnames
  if (['gnames', 'guildnames', 'servernames', 'snames'].includes(command)) return handleGnames(message);

  // Cleargnames
  if (['cleargnames', 'clearguildnames'].includes(command)) return handleCleargnames(message);

  // Copydisabled
  if (['copydisabled', 'cd'].includes(command)) return handleCopydisabled(message, fullArgs);

  // Drag / moveall
  if (command === 'drag' || command === 'moveall') {
    if (!message.member.permissions.has(PermissionFlagsBits.MoveMembers)) return warn(message, "You're missing permission: `move_members`"), true;
    const target = getTargetMember(message, fullArgs);
    const channel = message.member.voice.channel;
    if (command === 'drag') {
      if (!target || !channel) return warn(message, 'Mention a member and join a voice channel first.'), true;
      await target.voice.setChannel(channel).catch(() => null);
      return ok(message, `Moved ${target} to your voice channel.`), true;
    }
    if (!channel) return warn(message, 'Join a voice channel first.'), true;
    for (const member of message.guild.members.cache.filter(m => m.voice.channel && m.voice.channel.id !== channel.id).values())
      await member.voice.setChannel(channel).catch(() => null);
    return ok(message, 'Moved connected members to your voice channel.'), true;
  }

  // Thread
  if (command === 'thread') {
    if (!needManageMessages(message)) return true;
    if (sub === 'add') {
      const name = fullArgs.join(' ') || `thread-${Date.now()}`;
      const thread = await message.channel.threads.create({ name, autoArchiveDuration: 1440 }).catch(() => null);
      return thread ? ok(message, `Created thread ${thread}.`) : warn(message, 'I could not create a thread here.'), true;
    }
    if (sub === 'rename') {
      if (!message.channel.isThread()) return warn(message, 'Use this inside a thread.'), true;
      const name = fullArgs.join(' ');
      if (!name) return warn(message, 'Provide a new thread name.'), true;
      await message.channel.setName(name).catch(() => null);
      return ok(message, `Renamed this thread to **${name}**.`), true;
    }
    if (sub === 'remove') {
      if (!message.channel.isThread()) return warn(message, 'Use this inside a thread.'), true;
      await message.channel.delete().catch(() => null);
      return true;
    }
  }

  // Banner/serveravatar/splash
  if (['banner', 'serveravatar', 'splash'].includes(command)) {
    const target = command === 'banner' ? (message.mentions.users.first() || message.author) : message.guild;
    const url = command === 'banner' && target.bannerURL ? target.bannerURL({ size: 4096 }) : command === 'serveravatar' ? message.guild.iconURL({ size: 4096 }) : message.guild.splashURL?.({ size: 4096 });
    return info(message, entry.command, url || 'No image available for this target.'), true;
  }

  // Bots / newmembers
  if (['bots'].includes(command)) {
    const members = message.guild.members.cache.filter(m => m.user.bot);
    return info(message, 'Bots', listValue([...members.values()].map(m => `${m.user.tag} — ${m.user.id}`))), true;
  }

  // Single info commands (sports, social media, image tools, etc.)
  const singleResult = await handleSingleInfo(message, command, fullArgs);
  if (singleResult) return true;

  // Single utility
  const utility = await handleSingleUtility(client, message, command, fullArgs, entry);
  if (utility) return true;

  // Generic store handler
  const stored = await handleSimpleStore(message, entry, fullArgs);
  if (stored) return true;

  // Final fallback — shows command info instead of "Ready for configuration"
  const usagePrefix = prefix || db.get(`prefix_${message.guild.id}`) || default_prefix;
  const allParts = entry.parts.join(' ');
  return info(message, entry.command, `Use **${usagePrefix}${allParts}** with the required arguments.${entry.aliases?.length ? ` Aliases: ${entry.aliases.map(a => `\`${a}\``).join(', ')}` : ''}`, [
    { name: 'Category', value: entry.category || 'Miscellaneous', inline: true },
  ]), true;
}

module.exports = { handleGeneratedCommand, normalizeFirst };
