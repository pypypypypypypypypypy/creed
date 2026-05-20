const { EmbedBuilder, AttachmentBuilder, ActivityType } = require('discord.js');
const { color } = require('../config.json');
const { warn, deny, approve } = require('../emojis.json');
const { canRunOwnerCmd, isOwner, authorizeUser, revokeUser, listAuthorizations } = require('../utils/owners');
const db = require('../db');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const {
  isEmail, isDiscordId,
  queryEmailRep, queryHudsonRockEmail, queryHudsonRockUsername,
  queryLeakCheck, queryDiscordUser,
  checkAllPlatforms, snowflakeToDate,
} = require('../utils/osint');

// ── pfp ──────────────────────────────────────────────────────────────────────
const IMAGE_RE = /\.(png|jpe?g|gif|webp)(\?.*)?$/i;
const RESET_WORDS = new Set(['remove', 'reset', 'clear', 'none', 'off']);

// ── zipup helpers ─────────────────────────────────────────────────────────────
const EXCLUDE_DIRS = new Set([
  'node_modules', '.git', '.cache', '.local', '.replit',
  'dist', 'out', 'tmp', 'coverage', 'logs',
]);
const EXCLUDE_FILE_PATTERNS = [
  /^\.env(\.|$)/i,
  /^npm-debug\.log/i,
  /^yarn-error\.log/i,
  /\.log$/i,
  /\.DS_Store$/i,
  /^bored-bot-fixed\.zip$/i,
  /^bored-xd-source.*\.zip$/i,
  /^bored-xd-emojis.*\.zip$/i,
];

function shouldExcludeFile(name) {
  return EXCLUDE_FILE_PATTERNS.some(re => re.test(name));
}

function walkAndZip(zip, baseDir, currentDir = baseDir) {
  let entries;
  try { entries = fs.readdirSync(currentDir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    const full = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      walkAndZip(zip, baseDir, full);
    } else if (entry.isFile()) {
      if (shouldExcludeFile(entry.name)) continue;
      const rel = path.relative(baseDir, full);
      try { zip.addFile(rel.split(path.sep).join('/'), fs.readFileSync(full)); } catch {}
    }
  }
}

function extractEmojiTags(text) {
  const out = []; const re = /<(a?):([A-Za-z0-9_]+):(\d+)>/g; let m;
  while ((m = re.exec(text)) !== null) out.push({ animated: m[1] === 'a', name: m[2], id: m[3] });
  return out;
}

async function downloadEmoji(id, animated) {
  const ext = animated ? 'gif' : 'png';
  const res = await fetch(`https://cdn.discordapp.com/emojis/${id}.${ext}?size=128&quality=lossless`);
  if (!res.ok) {
    const alt = animated ? 'png' : 'gif';
    const altRes = await fetch(`https://cdn.discordapp.com/emojis/${id}.${alt}?size=128&quality=lossless`);
    if (!altRes.ok) return null;
    return { buf: Buffer.from(await altRes.arrayBuffer()), ext: alt };
  }
  return { buf: Buffer.from(await res.arrayBuffer()), ext };
}

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(2)} MB`;
}

async function buildSourceZip() {
  const root = path.resolve(__dirname, '..');
  const zip = new AdmZip();
  walkAndZip(zip, root);
  const buf = zip.toBuffer();
  return { buf, fileCount: zip.getEntries().length };
}

async function buildEmojiZip(client) {
  const appEmojis = [];
  try { const f = await client.application.emojis.fetch(); for (const e of f.values()) appEmojis.push({ id: e.id, name: e.name, animated: e.animated, source: 'app' }); } catch {}
  let jsonTags = [];
  try { const raw = fs.readFileSync(path.resolve(__dirname, '..', 'emojis.json'), 'utf8'); jsonTags = extractEmojiTags(raw).map(t => ({ ...t, source: 'json' })); } catch {}
  const seen = new Map();
  for (const e of [...appEmojis, ...jsonTags]) if (!seen.has(e.id)) seen.set(e.id, e);
  const all = [...seen.values()];
  const zip = new AdmZip(); let ok = 0, fail = 0;
  for (const e of all) {
    const dl = await downloadEmoji(e.id, e.animated).catch(() => null);
    if (!dl) { fail++; continue; }
    const safeName = e.name.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64) || `emoji_${e.id}`;
    zip.addFile(`${safeName}.${dl.ext}`, dl.buf); ok++;
  }
  zip.addFile('_manifest.txt', Buffer.from(all.map(e => `${e.name}.${e.animated ? 'gif' : 'png'}\tid=${e.id}\tsource=${e.source}`).join('\n'), 'utf8'));
  return { buf: zip.toBuffer(), total: all.length, ok, fail };
}

// ── variables helpers ─────────────────────────────────────────────────────────
const RAILWAY_AUTO_KEYS = new Set([
  'RAILWAY_STATIC_URL', 'RAILWAY_PUBLIC_DOMAIN', 'RAILWAY_PRIVATE_DOMAIN',
  'RAILWAY_PROJECT_ID', 'RAILWAY_PROJECT_NAME', 'RAILWAY_ENVIRONMENT_ID',
  'RAILWAY_ENVIRONMENT_NAME', 'RAILWAY_SERVICE_ID', 'RAILWAY_SERVICE_NAME',
  'RAILWAY_REPLICA_ID', 'RAILWAY_DEPLOYMENT_ID', 'RAILWAY_SNAPSHOT_ID',
  'RAILWAY_GIT_COMMIT_SHA', 'RAILWAY_GIT_AUTHOR', 'RAILWAY_GIT_BRANCH',
  'RAILWAY_GIT_REPO_NAME', 'RAILWAY_GIT_REPO_OWNER', 'RAILWAY_RUN_UID',
  'RAILWAY_HEALTHCHECK_TIMEOUT_SEC', 'RAILWAY_LOG_TIMESTAMP_FORMAT',
  'PORT', 'NIXPACKS_METADATA',
]);
const SYSTEM_PREFIXES = [
  'npm_', 'NODE_', 'PATH', 'HOME', 'USER', 'SHELL', 'LANG', 'LC_',
  'PWD', 'OLDPWD', 'SHLVL', 'LOGNAME', 'HOSTNAME', 'TERM', 'COLORTERM',
  'NIX_', 'NIXPKGS_', 'MANPATH', 'INFOPATH', 'PKG_CONFIG', 'XDG_',
  'DBUS_', 'DISPLAY', 'EDITOR', 'PAGER', 'LESS', 'LS_COLORS',
];
function isAutoSet(k) {
  return RAILWAY_AUTO_KEYS.has(k) || SYSTEM_PREFIXES.some(p => k.startsWith(p));
}

// ── authorize helpers ─────────────────────────────────────────────────────────
function resolveUserId(message, raw) {
  if (!raw) return null;
  const mention = message.mentions.users.first();
  if (mention) return mention.id;
  const cleaned = String(raw).replace(/[<@!>]/g, '').trim();
  return /^\d{15,21}$/.test(cleaned) ? cleaned : null;
}
function resolveCmdName(client, raw) {
  if (!raw) return null;
  const key = String(raw).toLowerCase().replace(/^,/, '');
  if (client.commands?.has(key)) return key;
  if (client.aliases?.has(key)) return client.aliases.get(key);
  return null;
}
function isOwnerCmd(client, name) {
  const cmd = client.commands?.get(name);
  return Boolean(cmd && cmd.category === 'owner');
}

// ── osint helpers ─────────────────────────────────────────────────────────────
function truncate(s, n) { return s && s.length > n ? s.slice(0, n - 1) + '…' : (s || ''); }

function formatEmailReport(target, emailRep, hudsonRock, leakCheck) {
  const fields = [];
  if (emailRep && !emailRep.error) {
    const d = emailRep.details || {};
    const flags = [];
    if (d.data_breach)               flags.push('💀 Data breach');
    if (d.credentials_leaked)        flags.push('🔑 Credentials leaked');
    if (d.credentials_leaked_recent) flags.push('🔑 Recently leaked');
    if (d.malicious_activity)        flags.push('☣️ Malicious activity');
    if (d.blacklisted)               flags.push('🚫 Blacklisted');
    if (d.spam)                      flags.push('📨 Spam');
    if (d.disposable)                flags.push('🗑️ Disposable address');
    if (d.free_provider)             flags.push('🆓 Free provider');
    const profileList = Array.isArray(d.profiles) && d.profiles.length ? d.profiles.map(p => `\`${p}\``).join(', ') : 'none found';
    const repEmoji = { high: '🟢', medium: '🟡', low: '🔴', none: '⚫' }[emailRep.reputation] || '⚫';
    fields.push({ name: '📊 Email Reputation (emailrep.io)', value: truncate(`${repEmoji} **Reputation:** ${emailRep.reputation || 'unknown'} • **Refs:** ${emailRep.references ?? 0}\n${flags.length ? `**Flags:** ${flags.join(', ')}\n` : ''}**Last seen:** ${d.last_seen || 'never'} • **Domain:** ${d.domain_exists ? '✅ exists' : '❌ missing'}\n**Linked profiles:** ${profileList}`, 1024), inline: false });
  } else {
    fields.push({ name: '📊 Email Reputation (emailrep.io)', value: '`No data returned`', inline: false });
  }
  if (hudsonRock) {
    const stealers = Array.isArray(hudsonRock.stealers) ? hudsonRock.stealers : [];
    if (stealers.length) {
      const lines = stealers.slice(0, 5).map((s, i) => { const p = []; if (s.stealerFamily) p.push(`**Malware:** \`${s.stealerFamily}\``); if (s.dateAdded) p.push(`**Date:** ${s.dateAdded.slice(0,10)}`); if (s.computerName) p.push(`**PC:** \`${s.computerName}\``); if (s.operatingSystem) p.push(`**OS:** ${s.operatingSystem}`); if (s.ip) p.push(`**IP:** \`${s.ip}\``); return `${i+1}. ${p.join(' • ')}`; });
      if (stealers.length > 5) lines.push(`…and ${stealers.length - 5} more`);
      fields.push({ name: `🦠 Infostealer Logs (HudsonRock) — ${stealers.length} hit(s)`, value: truncate(lines.join('\n'), 1024), inline: false });
    } else { fields.push({ name: '🦠 Infostealer Logs (HudsonRock)', value: '✅ No infostealer records found', inline: false }); }
  } else { fields.push({ name: '🦠 Infostealer Logs (HudsonRock)', value: '`API unavailable`', inline: false }); }
  if (leakCheck && leakCheck.success !== false) {
    if (leakCheck.found > 0 && Array.isArray(leakCheck.sources) && leakCheck.sources.length) {
      fields.push({ name: `💀 Data Breaches (LeakCheck.io) — ${leakCheck.found} source(s)`, value: truncate(leakCheck.sources.map(s => `\`${s.name || s}\``).join(', '), 1024), inline: false });
    } else if (typeof leakCheck.found === 'number') {
      fields.push({ name: '💀 Data Breaches (LeakCheck.io)', value: leakCheck.found > 0 ? `⚠️ Found in **${leakCheck.found}** source(s)` : '✅ Not found in any known breach', inline: false });
    } else { fields.push({ name: '💀 Data Breaches (LeakCheck.io)', value: '`No data`', inline: false }); }
  } else { fields.push({ name: '💀 Data Breaches (LeakCheck.io)', value: '`API unavailable`', inline: false }); }
  const dangerous = (emailRep?.details?.data_breach || emailRep?.details?.credentials_leaked) || (Array.isArray(hudsonRock?.stealers) && hudsonRock.stealers.length > 0) || (leakCheck?.found > 0);
  return { fields, dangerous };
}

function formatUsernameReport(target, hudsonRock, platforms, discordUser) {
  const fields = [];
  if (discordUser) {
    const created = snowflakeToDate(discordUser.id);
    const avatarUrl = discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null;
    const parts = [`**Tag:** ${discordUser.username}${discordUser.discriminator && discordUser.discriminator !== '0' ? `#${discordUser.discriminator}` : ''}`, `**ID:** \`${discordUser.id}\``, created ? `**Created:** <t:${Math.floor(created.getTime()/1000)}:F>` : null, discordUser.bot ? '**Bot:** Yes' : null, avatarUrl ? `**Avatar:** [link](${avatarUrl})` : null].filter(Boolean);
    fields.push({ name: '🤖 Discord Profile', value: parts.join('\n'), inline: false });
  }
  if (hudsonRock) {
    const stealers = Array.isArray(hudsonRock.stealers) ? hudsonRock.stealers : [];
    if (stealers.length) {
      const lines = stealers.slice(0, 4).map((s, i) => { const p = []; if (s.stealerFamily) p.push(`**Malware:** \`${s.stealerFamily}\``); if (s.dateAdded) p.push(`**Date:** ${s.dateAdded.slice(0,10)}`); if (s.ip) p.push(`**IP:** \`${s.ip}\``); if (s.top_logins?.[0]) p.push(`**Login:** \`${s.top_logins[0]}\``); return `${i+1}. ${p.join(' • ')}`; });
      if (stealers.length > 4) lines.push(`…and ${stealers.length - 4} more`);
      fields.push({ name: `🦠 Infostealer Logs (HudsonRock) — ${stealers.length} hit(s)`, value: truncate(lines.join('\n'), 1024), inline: false });
    } else { fields.push({ name: '🦠 Infostealer Logs (HudsonRock)', value: '✅ No infostealer records found', inline: false }); }
  } else { fields.push({ name: '🦠 Infostealer Logs (HudsonRock)', value: '`API unavailable`', inline: false }); }
  if (platforms?.length) {
    const found = platforms.filter(p => p.found).map(p => `✅ ${p.name}`);
    const missed = platforms.filter(p => !p.found).map(p => `❌ ${p.name}`);
    fields.push({ name: `🌐 Platform Accounts (${found.length}/${platforms.length} found)`, value: truncate([...found, ...missed].join('  '), 1024) || 'No results', inline: false });
  }
  return { fields };
}

// ── changename helpers ────────────────────────────────────────────────────────
const REPO = 'abannition/drown-xd';
function ghHeaders() {
  const token = process.env.DROWN_GITHUB_TOKEN || process.env.GITHUB_TOKEN || '';
  return { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };
}
async function ghGet(p) { const r = await fetch(`https://api.github.com${p}`, { headers: ghHeaders() }); return r.json(); }
async function ghPut(p, body) { const r = await fetch(`https://api.github.com${p}`, { method: 'PUT', headers: ghHeaders(), body: JSON.stringify(body) }); return r.json(); }

function preserveCase(match, replacement) {
  if (match === match.toUpperCase()) return replacement.toUpperCase();
  if (match[0] === match[0].toUpperCase() && match.slice(1) === match.slice(1).toLowerCase())
    return replacement[0].toUpperCase() + replacement.slice(1).toLowerCase();
  if (match === match.toLowerCase()) return replacement.toLowerCase();
  return replacement;
}

// ── Command ───────────────────────────────────────────────────────────────────
module.exports = {
  category: 'owner',
  name: 'sys',
  aliases: [],
  help: [
    { name: 'sys pfp',         description: "Update the bot's profile picture.",              aliases: 'n/a', parameters: '<attachment | url>', information: 'BOT_OWNER', usage: 'sys pfp', example: 'sys pfp' },
    { name: 'sys bio',         description: "Update the bot's About Me bio.",                 aliases: 'n/a', parameters: '<text | remove>',    information: 'BOT_OWNER', usage: 'sys bio <text>', example: 'sys bio chill bot' },
    { name: 'sys status',      description: "Set the bot's custom status.",                   aliases: 'n/a', parameters: '<text | clear>',      information: 'BOT_OWNER', usage: 'sys status <text>', example: 'sys status vibing' },
    { name: 'sys username',    description: "Change the bot's Discord username.",             aliases: 'n/a', parameters: '<new username>',      information: 'BOT_OWNER', usage: 'sys username <name>', example: 'sys username drown' },
    { name: 'sys displayname', description: "Change the bot's global display name.",          aliases: 'n/a', parameters: '<new display name>',  information: 'BOT_OWNER', usage: 'sys displayname <name>', example: 'sys displayname Drown' },
    { name: 'sys authorize',   description: 'Grant/revoke owner command access to a user.',  aliases: 'n/a', parameters: '[@user] [cmd] | remove [@user] [cmd] | list', information: 'BOT_OWNER', usage: 'sys authorize @user sys', example: 'sys authorize @friend sys' },
    { name: 'sys osint',       description: 'OSINT lookup on an email, username, or Discord ID.', aliases: 'n/a', parameters: '<target>', information: 'BOT_OWNER', usage: 'sys osint <target>', example: 'sys osint user@gmail.com' },
    { name: 'sys botbanner',   description: "Update the bot's profile banner.",               aliases: 'n/a', parameters: '<attachment | url | remove>', information: 'BOT_OWNER', usage: 'sys botbanner', example: 'sys botbanner' },
    { name: 'sys zipup',       description: 'DM full source zip + emoji zip.',                aliases: 'n/a', parameters: '',                    information: 'BOT_OWNER', usage: 'sys zipup', example: 'sys zipup' },
    { name: 'sys variables',   description: 'DM all Railway environment variables.',          aliases: 'n/a', parameters: '',                    information: 'BOT_OWNER', usage: 'sys variables', example: 'sys variables' },
    { name: 'sys changename',  description: 'Repo-wide rename with persistent name log.',    aliases: 'n/a', parameters: '<new name>',           information: 'BOT_OWNER', usage: 'sys changename <name>', example: 'sys changename drown' },
    { name: 'sys syncvariables', description: 'View, push, set or delete Railway environment variables via the Railway API.', aliases: 'syncvars', parameters: '[push | set KEY val | delete KEY]', information: 'BOT_OWNER. Requires RAILWAY_TOKEN env var.', usage: 'sys syncvariables', example: 'sys syncvariables push' },
  ],

  run: async (client, message, args) => {
    if (!canRunOwnerCmd(message.author.id, 'sys')) return;

    const sub = (args[0] || '').toLowerCase();
    const rest = args.slice(1);

    // ── sys pfp ────────────────────────────────────────────────────────────
    if (sub === 'pfp') {
      let source = null;
      const att = message.attachments.find(a => IMAGE_RE.test(a.name || '') || IMAGE_RE.test(a.url || ''));
      if (att) source = att.url;
      if (!source && rest[0] && /^https?:\/\//i.test(rest[0])) source = rest[0];
      if (!source) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Attach a **png/jpg/gif/webp** image or pass a direct image URL.`)] });
      try {
        await client.user.setAvatar(source);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`✅ Updated **${client.user.username}**'s avatar.`).setThumbnail(client.user.displayAvatarURL({ size: 512, extension: 'png', forceStatic: false }))] });
      } catch (e) { return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`❌ Failed: \`${e.message}\``)] }); }
    }

    // ── sys bio ────────────────────────────────────────────────────────────
    if (sub === 'bio') {
      const MAX = 400;
      const raw = rest.join(' ').trim();
      const wantsReset = RESET_WORDS.has(raw.toLowerCase());
      if (!raw) {
        const current = client.application?.description || '*(empty)*';
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Bot Bio').setDescription(`**Current:**\n${current}\n\nUse \`,sys bio <text>\` to update or \`,sys bio remove\` to clear.`)] });
      }
      if (!wantsReset && raw.length > MAX) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} Bio is too long (**${raw.length}/${MAX}** chars).`)] });
      try {
        if (!client.application) await client.application.fetch();
        await client.application.edit({ description: wantsReset ? '' : raw });
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Bot Bio').setDescription(`✅ ${wantsReset ? 'Cleared' : 'Updated'} **${client.user.username}**'s bio.\n\n${wantsReset ? '*(empty)*' : raw}`)] });
      } catch (e) { return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`❌ Failed: \`${e.message}\``)] }); }
    }

    // ── sys status ─────────────────────────────────────────────────────────
    if (sub === 'status') {
      if (!rest.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription('⚠️ Usage: `,sys status <text>`  •  `,sys status clear`')] });
      const presenceStatus = client.user.presence?.status || 'online';
      const first = rest[0].toLowerCase();
      if (['clear', 'off', 'none', 'remove'].includes(first)) {
        await client.user.setPresence({ activities: [], status: presenceStatus });
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription('✅ Custom status **cleared**.')] });
      }
      const text = rest.join(' ').slice(0, 128);
      await client.user.setPresence({ activities: [{ name: 'Custom Status', type: ActivityType.Custom, state: text }], status: presenceStatus });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`✅ Status set to: **${text}**`)] });
    }

    // ── sys username ───────────────────────────────────────────────────────
    if (sub === 'username') {
      const newName = rest.join(' ').trim();
      if (!newName) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription('⚠️ Usage: `,sys username <new username>`')] });
      try {
        await client.user.setUsername(newName);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`✅ Username changed to **${newName}**`).setFooter({ text: 'Discord allows 2 username changes per hour.' })] });
      } catch (e) { return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`❌ Failed: \`${e.message}\``)] }); }
    }

    // ── sys displayname ────────────────────────────────────────────────────
    if (sub === 'displayname') {
      const newDisplay = rest.join(' ').trim();
      if (!newDisplay) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription('⚠️ Usage: `,sys displayname <new display name>`')] });
      try {
        await client.user.setDisplayName(newDisplay);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`✅ Display name changed to **${newDisplay}**`)] });
      } catch (e) { return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`❌ Failed: \`${e.message}\``)] }); }
    }

    // ── sys authorize ──────────────────────────────────────────────────────
    if (sub === 'authorize') {
      if (!isOwner(message.author.id)) return;
      const s2 = (rest[0] || '').toLowerCase();

      if (s2 === 'list' || s2 === 'ls') {
        const all = listAuthorizations();
        const entries = Object.entries(all);
        if (!entries.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} No authorizations set.`)] });
        const lines = entries.map(([uid, cmds]) => `<@${uid}> (\`${uid}\`) → ${cmds.map(c => `\`${c}\``).join(', ')}`);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Authorized non-owners (${entries.length})`).setDescription(lines.join('\n').slice(0, 4090))] });
      }

      if (['remove', 'rm', 'revoke'].includes(s2)) {
        const userId = resolveUserId(message, rest[1]);
        const cmdRaw = rest[2];
        if (!userId || !cmdRaw) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Usage: \`,sys authorize remove @user <command>\``)] });
        const cmdName = resolveCmdName(client, cmdRaw) || String(cmdRaw).toLowerCase();
        const removed = revokeUser(userId, cmdName);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(removed ? `${approve} Revoked \`${cmdName}\` from <@${userId}>.` : `${warn} <@${userId}> was not authorized for \`${cmdName}\`.`)] });
      }

      const userId = resolveUserId(message, rest[0]);
      const cmdRaw = rest[1];
      if (!userId || !cmdRaw) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Usage: \`,sys authorize @user <command>\` • \`,sys authorize remove @user <command>\` • \`,sys authorize list\``)] });
      if (isOwner(userId)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} That user is already the owner.`)] });
      const cmdName = resolveCmdName(client, cmdRaw);
      if (!cmdName) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${deny} Unknown command \`${cmdRaw}\`.`)] });
      if (!isOwnerCmd(client, cmdName)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${deny} \`${cmdName}\` is not an owner command.`)] });
      if (cmdName === 'sys') return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${deny} \`sys\` cannot be self-delegated.`)] });
      const added = authorizeUser(userId, cmdName);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(added ? `${approve} Authorized <@${userId}> to use \`,${cmdName}\`.` : `${warn} <@${userId}> was already authorized for \`${cmdName}\`.`)] });
    }

    // ── sys osint ──────────────────────────────────────────────────────────
    if (sub === 'osint') {
      const target = (rest[0] || '').trim();
      if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription('⚠️ Usage: `,sys osint <email | discord_id | username>`')] });
      const loading = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`<a:loading:1499216008257339514> Running OSINT on \`${target}\`…`)] });
      let embed;
      if (isEmail(target)) {
        const [emailRep, hudsonRock, leakCheck] = await Promise.all([queryEmailRep(target), queryHudsonRockEmail(target), queryLeakCheck(target)]);
        const { fields, dangerous } = formatEmailReport(target, emailRep, hudsonRock, leakCheck);
        embed = new EmbedBuilder().setColor(dangerous ? '#ff3333' : '#1e1e2e').setTitle(`🔍 OSINT — ${target}`).setDescription(`**Type:** Email${dangerous ? '\n⚠️ **Exposure in breach databases.**' : ''}`).addFields(fields).setFooter({ text: 'emailrep.io • HudsonRock • LeakCheck.io' }).setTimestamp();
      } else if (isDiscordId(target)) {
        const botToken = process.env.DISCORD_TOKEN || process.env.TOKEN;
        const [discordUser, hudsonRock, platforms] = await Promise.all([queryDiscordUser(target, botToken), queryHudsonRockUsername(target), checkAllPlatforms(target)]);
        const { fields } = formatUsernameReport(target, hudsonRock, platforms, discordUser);
        const displayName = discordUser ? (discordUser.username + (discordUser.discriminator && discordUser.discriminator !== '0' ? `#${discordUser.discriminator}` : '')) : target;
        const avatarUrl = discordUser?.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null;
        embed = new EmbedBuilder().setColor('#5865F2').setTitle(`🔍 OSINT — ${displayName}`).setDescription('**Type:** Discord ID').addFields(fields).setFooter({ text: 'Discord API • HudsonRock • 13 platform checks' }).setTimestamp();
        if (avatarUrl) embed.setThumbnail(avatarUrl);
      } else {
        const [hudsonRock, platforms] = await Promise.all([queryHudsonRockUsername(target), checkAllPlatforms(target)]);
        const { fields } = formatUsernameReport(target, hudsonRock, platforms, null);
        embed = new EmbedBuilder().setColor('#1e1e2e').setTitle(`🔍 OSINT — ${target}`).setDescription('**Type:** Username').addFields(fields).setFooter({ text: 'HudsonRock • 13 platform checks' }).setTimestamp();
      }
      return loading.edit({ embeds: [embed] });
    }

    // ── sys botbanner ──────────────────────────────────────────────────────
    if (sub === 'botbanner') {
      const first = (rest[0] || '').toLowerCase().trim();
      const wantsReset = RESET_WORDS.has(first);
      let source = null;
      if (!wantsReset) {
        const att = message.attachments.find(a => IMAGE_RE.test(a.name || '') || IMAGE_RE.test(a.url || ''));
        if (att) source = att.url;
        if (!source && rest[0] && /^https?:\/\//i.test(rest[0])) source = rest[0];
      }
      if (!wantsReset && !source) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Attach a **png/jpg/gif/webp** image, pass a URL, or use \`,sys botbanner remove\`.`)] });
      try {
        await client.user.setBanner(wantsReset ? null : source);
        const embed = new EmbedBuilder().setColor(color).setDescription(`✅ ${wantsReset ? 'Cleared' : 'Updated'} **${client.user.username}**'s banner.`);
        if (!wantsReset) {
          const fresh = await client.user.fetch(true).catch(() => client.user);
          const bannerUrl = fresh.bannerURL?.({ size: 1024, extension: 'png', forceStatic: false });
          if (bannerUrl) embed.setImage(bannerUrl);
        }
        return message.channel.send({ embeds: [embed] });
      } catch (e) { return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`❌ Failed: \`${e.message}\``)] }); }
    }

    // ── sys zipup ──────────────────────────────────────────────────────────
    if (sub === 'zipup') {
      const status = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription('Packing bot source...')] });
      let source;
      try { source = await buildSourceZip(); }
      catch (e) { return status.edit({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`❌ Source zip failed: \`${e.message}\``)] }).catch(() => {}); }
      await status.edit({ embeds: [new EmbedBuilder().setColor(color).setDescription(`Source ready (${fmtBytes(source.buf.length)}, ${source.fileCount} files). Downloading emojis...`)] }).catch(() => {});
      let emojis;
      try { emojis = await buildEmojiZip(client); }
      catch (e) { return status.edit({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`❌ Emoji zip failed: \`${e.message}\``)] }).catch(() => {}); }
      const sourceAtt = new AttachmentBuilder(source.buf, { name: 'bot-source.zip' });
      const emojiAtt  = new AttachmentBuilder(emojis.buf, { name: 'bot-emojis.zip' });
      const summary = new EmbedBuilder().setColor(color).setTitle('zipup complete').setDescription(`**Source:** \`bot-source.zip\` — ${fmtBytes(source.buf.length)}, ${source.fileCount} files\n**Emojis:** \`bot-emojis.zip\` — ${fmtBytes(emojis.buf.length)}, ${emojis.ok}/${emojis.total} downloaded${emojis.fail ? ` (${emojis.fail} failed)` : ''}`);
      try {
        await message.author.send({ embeds: [summary], files: [sourceAtt, emojiAtt] });
        await status.edit({ embeds: [new EmbedBuilder().setColor(color).setDescription('✅ Sent both zips to your DMs.')] }).catch(() => {});
      } catch {
        try { await status.edit({ embeds: [summary] }); await message.channel.send({ files: [sourceAtt] }); await message.channel.send({ files: [emojiAtt] }); }
        catch (e2) { await status.edit({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`❌ Could not send files: \`${e2.message}\``)] }).catch(() => {}); }
      }
      return;
    }

    // ── sys variables ──────────────────────────────────────────────────────
    if (sub === 'variables') {
      const userVars = Object.entries(process.env).filter(([k]) => !isAutoSet(k));
      if (!userVars.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} No custom environment variables found.`)] });
      const lines = userVars.map(([k, v]) => `**[${k}]:** ||${v}||`);
      const pages = []; let cur = [], curLen = 0;
      for (const line of lines) {
        if (curLen + line.length + 1 > 3800 && cur.length) { pages.push(cur); cur = []; curLen = 0; }
        cur.push(line); curLen += line.length + 1;
      }
      if (cur.length) pages.push(cur);
      try {
        const dm = await message.author.createDM();
        for (let i = 0; i < pages.length; i++) {
          const embed = new EmbedBuilder().setColor(color).setTitle(i === 0 ? `Railway Variables (${userVars.length})` : 'Railway Variables (cont.)').setDescription(pages[i].join('\n')).setFooter({ text: 'Click spoilers to reveal values' });
          if (i === pages.length - 1) embed.setTimestamp();
          await dm.send({ embeds: [embed] });
        }
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} Sent **${userVars.length}** variable(s) to your DMs.`)] });
      } catch (e) { return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} Couldn't DM you — make sure your DMs are open.\n\`\`\`${e.message}\`\`\``)] }); }
    }

    // ── sys changename ─────────────────────────────────────────────────────
    if (sub === 'changename') {
      const newName = rest.join(' ').trim();
      const currentName = db.get('botName') || 'bored';
      if (!newName) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`⚠️ Usage: \`,sys changename <new name>\`\nCurrent logged name: \`${currentName}\``)] });
      if (currentName.toLowerCase() === newName.toLowerCase()) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`⚠️ The logged name is already \`${currentName}\`.`)] });
      const loading = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`<a:loading:1499216008257339514> Searching for \`${currentName}\` across the repo…`)] });
      let items = [];
      try { const s = await ghGet(`/search/code?q=${encodeURIComponent(currentName)}+repo:${REPO}&per_page=100`); items = s.items || []; }
      catch (e) { return loading.edit({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`❌ GitHub search failed: \`${e.message}\``)] }); }
      if (!items.length) {
        db.set('botName', newName);
        return loading.edit({ embeds: [new EmbedBuilder().setColor(color).setDescription(`✅ No files contained \`${currentName}\`. Name log updated: \`${currentName}\` → **${newName}**`)] });
      }
      await loading.edit({ embeds: [new EmbedBuilder().setColor(color).setDescription(`<a:loading:1499216008257339514> Found **${items.length}** file(s). Replacing \`${currentName}\` → **${newName}**…`)] });
      const escaped = currentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'gi');
      let updated = 0, skipped = 0, failed = 0; const failedPaths = [];
      for (const item of items) {
        try {
          const fileData = await ghGet(`/repos/${REPO}/contents/${item.path}`);
          if (!fileData.content) { skipped++; continue; }
          const original = Buffer.from(fileData.content, 'base64').toString('utf8');
          const replaced = original.replace(regex, (match) => preserveCase(match, newName));
          if (replaced === original) { skipped++; continue; }
          await ghPut(`/repos/${REPO}/contents/${item.path}`, { message: `chore: rename ${currentName} → ${newName}`, content: Buffer.from(replaced).toString('base64'), sha: fileData.sha });
          updated++;
        } catch { failed++; failedPaths.push(item.path); }
      }
      db.set('botName', newName);
      const fields = [{ name: 'Files updated', value: `${updated}`, inline: true }, { name: 'Skipped', value: `${skipped}`, inline: true }, { name: 'Failed', value: `${failed}`, inline: true }, { name: 'Name now logged', value: `\`${newName}\``, inline: false }];
      if (failedPaths.length) fields.push({ name: 'Failed paths', value: failedPaths.slice(0, 10).join('\n'), inline: false });
      return loading.edit({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Rename: ${currentName} → ${newName}`).addFields(fields).setFooter({ text: 'Next ,sys changename will replace the new name.' })] });
    }


    // ── sys syncvariables ──────────────────────────────────────────────────
    if (sub === 'syncvariables' || sub === 'syncvars') {
      const RAILWAY_TOKEN  = process.env.RAILWAY_TOKEN || process.env.RAILWAY_API_KEY;
      const SERVICE_ID     = process.env.RAILWAY_SERVICE_ID;
      const ENVIRONMENT_ID = process.env.RAILWAY_ENVIRONMENT_ID;

      if (!RAILWAY_TOKEN) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(
          '⚠️ `RAILWAY_TOKEN` is not set.\nGo to **Railway → Account Settings → Tokens**, create a token, then add it as a variable named `RAILWAY_TOKEN` on your Railway service.'
        )] });
      }
      if (!SERVICE_ID || !ENVIRONMENT_ID) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(
          '⚠️ `RAILWAY_SERVICE_ID` or `RAILWAY_ENVIRONMENT_ID` not found. Is this bot running on Railway?'
        )] });
      }

      const s2 = (rest[0] || '').toLowerCase();

      // Helper: call Railway GraphQL
      async function railwayGQL(query, variables) {
        const res = await fetch('https://backboard.railway.app/graphql/v2', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RAILWAY_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query, variables }),
        });
        return res.json();
      }

      // Fetch Railway's stored variables
      async function fetchRailwayVars() {
        const data = await railwayGQL(
          `query Variables($serviceId: String!, $environmentId: String!) {
             variables(serviceId: $serviceId, environmentId: $environmentId)
           }`,
          { serviceId: SERVICE_ID, environmentId: ENVIRONMENT_ID }
        );
        if (data.errors) throw new Error(data.errors[0]?.message || 'GraphQL error');
        return data.data?.variables || {};
      }

      // Upsert a single variable on Railway
      async function upsertVar(name, value) {
        const data = await railwayGQL(
          `mutation Upsert($input: VariableUpsertInput!) {
             variableUpsert(input: $input)
           }`,
          { input: { serviceId: SERVICE_ID, environmentId: ENVIRONMENT_ID, name, value } }
        );
        if (data.errors) throw new Error(data.errors[0]?.message || 'GraphQL error');
        return data.data?.variableUpsert;
      }

      // Delete a variable from Railway
      async function deleteVar(name) {
        const data = await railwayGQL(
          `mutation Delete($input: VariableDeleteInput!) {
             variableDelete(input: $input)
           }`,
          { input: { serviceId: SERVICE_ID, environmentId: ENVIRONMENT_ID, name } }
        );
        if (data.errors) throw new Error(data.errors[0]?.message || 'GraphQL error');
        return data.data?.variableDelete;
      }

      // ── sys syncvariables set KEY value ────────────────────────────────
      if (s2 === 'set') {
        const key   = rest[1];
        const value = rest.slice(2).join(' ').trim();
        if (!key || !value) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription('⚠️ Usage: `,sys syncvariables set KEY value`')] });
        const loading = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`<a:loading:1499216008257339514> Setting \`${key}\` on Railway…`)] });
        try {
          await upsertVar(key, value);
          return loading.edit({ embeds: [new EmbedBuilder().setColor(color).setDescription(`✅ Set \`${key}\` on Railway. **Redeploy** for it to take effect.`)] });
        } catch (e) {
          return loading.edit({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`❌ Failed: \`${e.message}\``)] });
        }
      }

      // ── sys syncvariables delete KEY ───────────────────────────────────
      if (s2 === 'delete' || s2 === 'del' || s2 === 'remove') {
        const key = rest[1];
        if (!key) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription('⚠️ Usage: `,sys syncvariables delete KEY`')] });
        const loading = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`<a:loading:1499216008257339514> Deleting \`${key}\` from Railway…`)] });
        try {
          await deleteVar(key);
          return loading.edit({ embeds: [new EmbedBuilder().setColor(color).setDescription(`✅ Deleted \`${key}\` from Railway.`)] });
        } catch (e) {
          return loading.edit({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`❌ Failed: \`${e.message}\``)] });
        }
      }

      // ── sys syncvariables push ─────────────────────────────────────────
      if (s2 === 'push') {
        const loading = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription('<a:loading:1499216008257339514> Pushing all running variables to Railway…')] });
        try {
          const railwayVars = await fetchRailwayVars();
          const userVars = Object.entries(process.env).filter(([k]) => !isAutoSet(k));
          let pushed = 0, skipped = 0;
          for (const [k, v] of userVars) {
            if (railwayVars[k] === v) { skipped++; continue; }
            await upsertVar(k, v);
            pushed++;
          }
          return loading.edit({ embeds: [new EmbedBuilder().setColor(color)
            .setTitle('Variables pushed to Railway')
            .addFields(
              { name: 'Pushed / updated', value: `${pushed}`, inline: true },
              { name: 'Already in sync',  value: `${skipped}`, inline: true },
            )
            .setFooter({ text: 'Redeploy on Railway for new values to apply.' })
          ] });
        } catch (e) {
          return loading.edit({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`❌ Failed: \`${e.message}\``)] });
        }
      }

      // ── sys syncvariables (diff view, default) ─────────────────────────
      const loading = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription('<a:loading:1499216008257339514> Fetching Railway variables…')] });
      try {
        const railwayVars = await fetchRailwayVars();
        const userVars    = Object.fromEntries(Object.entries(process.env).filter(([k]) => !isAutoSet(k)));

        const railwayKeys = new Set(Object.keys(railwayVars));
        const runningKeys = new Set(Object.keys(userVars));

        const inSync     = [...railwayKeys].filter(k => runningKeys.has(k) && railwayVars[k] === userVars[k]);
        const diffValue  = [...railwayKeys].filter(k => runningKeys.has(k) && railwayVars[k] !== userVars[k]);
        const onlyRailway = [...railwayKeys].filter(k => !runningKeys.has(k));
        const onlyRunning = [...runningKeys].filter(k => !railwayKeys.has(k));

        const lines = [];
        if (inSync.length)      lines.push(`**✅ In sync (${inSync.length}):** ${inSync.map(k => \`\\`${k}\\`\`).join(', ')}`);
        if (diffValue.length)   lines.push(`**⚠️ Value differs (${diffValue.length}):** ${diffValue.map(k => \`\\`${k}\\`\`).join(', ')}`);
        if (onlyRailway.length) lines.push(`**🔵 Railway only (${onlyRailway.length}):** ${onlyRailway.map(k => \`\\`${k}\\`\`).join(', ')}`);
        if (onlyRunning.length) lines.push(`**🟡 Running only (${onlyRunning.length}):** ${onlyRunning.map(k => \`\\`${k}\\`\`).join(', ')}`);

        return loading.edit({ embeds: [new EmbedBuilder().setColor(color)
          .setTitle(`Variable Sync — ${Object.keys(railwayVars).length} on Railway / ${Object.keys(userVars).length} running`)
          .setDescription(lines.join('\n\n') || '*(no user variables found)*')
          .setFooter({ text: 'Use ,sys syncvariables push to push running vars → Railway | set KEY val | delete KEY' })
        ] });
      } catch (e) {
        return loading.edit({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`❌ Railway API error: \`${e.message}\``)] });
      }
    }

    // ── help ───────────────────────────────────────────────────────────────
    return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('sys — developer portal').setDescription(
      '`,sys pfp` — update bot avatar\n' +
      '`,sys bio` — update About Me\n' +
      '`,sys status` — set custom status\n' +
      '`,sys username` — change username\n' +
      '`,sys displayname` — change display name\n' +
      '`,sys authorize` — grant/revoke owner cmd access\n' +
      '`,sys osint` — OSINT lookup\n' +
      '`,sys botbanner` — update bot banner\n' +
      '`,sys zipup` — DM source + emoji zips\n' +
      '`,sys variables` — DM Railway env vars\n' +
      '`,sys changename` — repo-wide rename'
    )] });
  },
};
