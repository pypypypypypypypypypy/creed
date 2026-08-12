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

// ── Constants ─────────────────────────────────────────────────────────────────
const IMAGE_RE    = /\.(png|jpe?g|gif|webp)(\?.*)?$/i;
const RESET_WORDS = new Set(['remove', 'reset', 'clear', 'none', 'off']);
const REPO        = 'abannition/drown-xd';

// ── Railway / GitHub API helpers ──────────────────────────────────────────────
function ghHeaders() {
  const t = process.env.DROWN_GITHUB_TOKEN || process.env.GITHUB_TOKEN || '';
  return { Authorization: `token ${t}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };
}
async function ghGet(p)       { return fetch(`https://api.github.com${p}`, { headers: ghHeaders() }).then(r => r.json()); }
async function ghPut(p, body) { return fetch(`https://api.github.com${p}`, { method: 'PUT', headers: ghHeaders(), body: JSON.stringify(body) }).then(r => r.json()); }

async function railwayGQL(query, variables) {
  const token = process.env.RAILWAY_TOKEN || process.env.RAILWAY_API_KEY;
  const res = await fetch('https://backboard.railway.app/graphql/v2', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

async function fetchRailwayVars(serviceId, environmentId) {
  const data = await railwayGQL(
    `query Variables($serviceId: String!, $environmentId: String!) {
       variables(serviceId: $serviceId, environmentId: $environmentId)
     }`,
    { serviceId, environmentId }
  );
  if (data.errors) throw new Error(data.errors[0]?.message || 'GraphQL error');
  return data.data?.variables || {};
}

async function upsertRailwayVar(serviceId, environmentId, name, value) {
  const data = await railwayGQL(
    `mutation Upsert($input: VariableUpsertInput!) { variableUpsert(input: $input) }`,
    { input: { serviceId, environmentId, name, value } }
  );
  if (data.errors) throw new Error(data.errors[0]?.message || 'GraphQL error');
  return data.data?.variableUpsert;
}

async function deleteRailwayVar(serviceId, environmentId, name) {
  const data = await railwayGQL(
    `mutation Delete($input: VariableDeleteInput!) { variableDelete(input: $input) }`,
    { input: { serviceId, environmentId, name } }
  );
  if (data.errors) throw new Error(data.errors[0]?.message || 'GraphQL error');
  return data.data?.variableDelete;
}

// ── changename helpers ────────────────────────────────────────────────────────
function preserveCase(match, replacement) {
  if (match === match.toUpperCase()) return replacement.toUpperCase();
  if (match[0] === match[0].toUpperCase() && match.slice(1) === match.slice(1).toLowerCase())
    return replacement[0].toUpperCase() + replacement.slice(1).toLowerCase();
  if (match === match.toLowerCase()) return replacement.toLowerCase();
  return replacement;
}

// ── zipup helpers ─────────────────────────────────────────────────────────────
const EXCLUDE_DIRS = new Set(['node_modules', '.git', '.cache', '.local', '.replit', 'dist', 'out', 'tmp', 'coverage', 'logs']);
const EXCLUDE_FILE_RE = [/^\.env(\.|$)/i, /^npm-debug\.log/i, /\.log$/i, /\.DS_Store$/i, /^bored-xd-source.*\.zip$/i, /^bored-xd-emojis.*\.zip$/i];

function shouldExclude(name) { return EXCLUDE_FILE_RE.some(r => r.test(name)); }

function walkAndZip(zip, base, cur = base) {
  let entries; try { entries = fs.readdirSync(cur, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(cur, e.name);
    if (e.isDirectory()) { if (!EXCLUDE_DIRS.has(e.name)) walkAndZip(zip, base, full); }
    else if (e.isFile() && !shouldExclude(e.name)) {
      try { zip.addFile(path.relative(base, full).split(path.sep).join('/'), fs.readFileSync(full)); } catch {}
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
    const r2 = await fetch(`https://cdn.discordapp.com/emojis/${id}.${alt}?size=128&quality=lossless`);
    if (!r2.ok) return null;
    return { buf: Buffer.from(await r2.arrayBuffer()), ext: alt };
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
  return { buf: zip.toBuffer(), fileCount: zip.getEntries().length };
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
    const name = e.name.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64) || `emoji_${e.id}`;
    zip.addFile(`${name}.${dl.ext}`, dl.buf); ok++;
  }
  zip.addFile('_manifest.txt', Buffer.from(all.map(e => `${e.name}.${e.animated ? 'gif' : 'png'}\tid=${e.id}\tsource=${e.source}`).join('\n'), 'utf8'));
  return { buf: zip.toBuffer(), total: all.length, ok, fail };
}

// ── variables helpers ─────────────────────────────────────────────────────────
const RAILWAY_AUTO_KEYS = new Set([
  'RAILWAY_STATIC_URL', 'RAILWAY_PUBLIC_DOMAIN', 'RAILWAY_PRIVATE_DOMAIN', 'RAILWAY_PROJECT_ID',
  'RAILWAY_PROJECT_NAME', 'RAILWAY_ENVIRONMENT_ID', 'RAILWAY_ENVIRONMENT_NAME', 'RAILWAY_SERVICE_ID',
  'RAILWAY_SERVICE_NAME', 'RAILWAY_REPLICA_ID', 'RAILWAY_DEPLOYMENT_ID', 'RAILWAY_SNAPSHOT_ID',
  'RAILWAY_GIT_COMMIT_SHA', 'RAILWAY_GIT_AUTHOR', 'RAILWAY_GIT_BRANCH', 'RAILWAY_GIT_REPO_NAME',
  'RAILWAY_GIT_REPO_OWNER', 'RAILWAY_RUN_UID', 'RAILWAY_HEALTHCHECK_TIMEOUT_SEC',
  'RAILWAY_LOG_TIMESTAMP_FORMAT', 'PORT', 'NIXPACKS_METADATA',
]);
const SYSTEM_PFXS = ['npm_', 'NODE_', 'PATH', 'HOME', 'USER', 'SHELL', 'LANG', 'LC_', 'PWD', 'OLDPWD', 'SHLVL', 'LOGNAME', 'HOSTNAME', 'TERM', 'COLORTERM', 'NIX_', 'NIXPKGS_', 'MANPATH', 'INFOPATH', 'PKG_CONFIG', 'XDG_', 'DBUS_', 'DISPLAY', 'EDITOR', 'PAGER', 'LESS', 'LS_COLORS'];
function isAutoSet(k) { return RAILWAY_AUTO_KEYS.has(k) || SYSTEM_PFXS.some(p => k.startsWith(p)); }

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
function isOwnerCmd(client, name) { return Boolean(client.commands?.get(name)?.category === 'owner'); }

// ── osint helpers ─────────────────────────────────────────────────────────────
function trunc(s, n) { return s && s.length > n ? s.slice(0, n - 1) + '…' : (s || ''); }

function fmtEmailReport(target, emailRep, hudsonRock, leakCheck) {
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
    if (d.disposable)                flags.push('🗑️ Disposable');
    if (d.free_provider)             flags.push('🆓 Free provider');
    const profiles = Array.isArray(d.profiles) && d.profiles.length ? d.profiles.map(p => `\`${p}\``).join(', ') : 'none';
    const repEmoji = { high: '🟢', medium: '🟡', low: '🔴', none: '⚫' }[emailRep.reputation] || '⚫';
    fields.push({ name: '📊 Email Reputation', value: trunc(`${repEmoji} **Rep:** ${emailRep.reputation || 'unknown'} • **Refs:** ${emailRep.references ?? 0}\n${flags.length ? `**Flags:** ${flags.join(', ')}\n` : ''}**Last seen:** ${d.last_seen || 'never'} • **Domain:** ${d.domain_exists ? '✅' : '❌'}\n**Profiles:** ${profiles}`, 1024), inline: false });
  } else { fields.push({ name: '📊 Email Reputation', value: '`No data`', inline: false }); }

  if (hudsonRock) {
    const st = Array.isArray(hudsonRock.stealers) ? hudsonRock.stealers : [];
    if (st.length) {
      const lines = st.slice(0, 5).map((s, i) => { const p = []; if (s.stealerFamily) p.push(`**Malware:** \`${s.stealerFamily}\``); if (s.dateAdded) p.push(`**Date:** ${s.dateAdded.slice(0,10)}`); if (s.ip) p.push(`**IP:** \`${s.ip}\``); return `${i+1}. ${p.join(' • ')}`; });
      if (st.length > 5) lines.push(`…and ${st.length-5} more`);
      fields.push({ name: `🦠 Infostealer Logs — ${st.length} hit(s)`, value: trunc(lines.join('\n'), 1024), inline: false });
    } else { fields.push({ name: '🦠 Infostealer Logs', value: '✅ No records', inline: false }); }
  } else { fields.push({ name: '🦠 Infostealer Logs', value: '`Unavailable`', inline: false }); }

  if (leakCheck && leakCheck.success !== false) {
    if (leakCheck.found > 0 && Array.isArray(leakCheck.sources) && leakCheck.sources.length)
      fields.push({ name: `💀 Data Breaches — ${leakCheck.found} source(s)`, value: trunc(leakCheck.sources.map(s => `\`${s.name || s}\``).join(', '), 1024), inline: false });
    else
      fields.push({ name: '💀 Data Breaches', value: leakCheck.found > 0 ? `⚠️ ${leakCheck.found} source(s)` : '✅ Not found', inline: false });
  } else { fields.push({ name: '💀 Data Breaches', value: '`Unavailable`', inline: false }); }

  const dangerous = (emailRep?.details?.data_breach || emailRep?.details?.credentials_leaked) || (Array.isArray(hudsonRock?.stealers) && hudsonRock.stealers.length > 0) || leakCheck?.found > 0;
  return { fields, dangerous };
}

function fmtUserReport(target, hudsonRock, platforms, discordUser) {
  const fields = [];
  if (discordUser) {
    const created = snowflakeToDate(discordUser.id);
    const avatar = discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png` : null;
    fields.push({ name: '🤖 Discord', value: [
      `**Tag:** ${discordUser.username}${discordUser.discriminator && discordUser.discriminator !== '0' ? `#${discordUser.discriminator}` : ''}`,
      `**ID:** \`${discordUser.id}\``,
      created ? `**Created:** <t:${Math.floor(created.getTime()/1000)}:F>` : null,
      avatar ? `**Avatar:** [link](${avatar})` : null,
    ].filter(Boolean).join('\n'), inline: false });
  }
  if (hudsonRock) {
    const st = Array.isArray(hudsonRock.stealers) ? hudsonRock.stealers : [];
    if (st.length) {
      const lines = st.slice(0, 4).map((s, i) => { const p = []; if (s.stealerFamily) p.push(`**Malware:** \`${s.stealerFamily}\``); if (s.dateAdded) p.push(`**Date:** ${s.dateAdded.slice(0,10)}`); if (s.ip) p.push(`**IP:** \`${s.ip}\``); return `${i+1}. ${p.join(' • ')}`; });
      if (st.length > 4) lines.push(`…and ${st.length-4} more`);
      fields.push({ name: `🦠 Infostealer Logs — ${st.length} hit(s)`, value: trunc(lines.join('\n'), 1024), inline: false });
    } else { fields.push({ name: '🦠 Infostealer Logs', value: '✅ No records', inline: false }); }
  } else { fields.push({ name: '🦠 Infostealer Logs', value: '`Unavailable`', inline: false }); }
  if (platforms?.length) {
    const found = platforms.filter(p => p.found).map(p => `✅ ${p.name}`);
    const miss  = platforms.filter(p => !p.found).map(p => `❌ ${p.name}`);
    fields.push({ name: `🌐 Platforms (${found.length}/${platforms.length})`, value: trunc([...found, ...miss].join('  '), 1024) || 'No results', inline: false });
  }
  return { fields };
}

// ── Command ───────────────────────────────────────────────────────────────────
const SUBCOMMANDS = [
  { name: 'pfp',            desc: 'Update the bot\'s profile picture',                 usage: 'sys pfp <attachment | url>' },
  { name: 'bio',            desc: 'Update the bot\'s About Me bio',                    usage: 'sys bio <text | remove>' },
  { name: 'status',         desc: 'Set the bot\'s custom status',                      usage: 'sys status <text | clear>' },
  { name: 'username',       desc: 'Change the bot\'s Discord username',                usage: 'sys username <name>' },
  { name: 'displayname',    desc: 'Change the bot\'s global display name',             usage: 'sys displayname <name>' },
  { name: 'authorize',      desc: 'Grant / revoke owner cmd access to a user',         usage: 'sys authorize @user <cmd> | remove @user <cmd> | list' },
  { name: 'osint',          desc: 'OSINT lookup on email, username, or Discord ID',    usage: 'sys osint <target>' },
  { name: 'botbanner',      desc: 'Update the bot\'s profile banner',                  usage: 'sys botbanner <attachment | url | remove>' },
  { name: 'zipup',          desc: 'DM full source zip + emoji zip',                    usage: 'sys zipup' },
  { name: 'variables',      desc: 'DM all Railway environment variables',              usage: 'sys variables' },
  { name: 'changename',     desc: 'Repo-wide name replace with persistent log',        usage: 'sys changename <new name>' },
  { name: 'syncvariables',  desc: 'View, push, set, or delete Railway env vars via API', usage: 'sys syncvariables [push | set KEY val | delete KEY]' },
  { name: 'list',           desc: 'List all sys subcommands',                          usage: 'sys list' },
];

module.exports = {
  category: 'owner',
  name: 'sys',
  aliases: [],
  help: SUBCOMMANDS.map(s => ({ name: s.usage, description: s.desc, aliases: 'n/a', parameters: '', information: 'BOT_OWNER', usage: s.usage, example: s.usage })),

  run: async (client, message, args) => {
    if (!canRunOwnerCmd(message.author.id, 'sys')) return;

    const sub  = (args[0] || '').toLowerCase().replace(/:$/, '');
    const rest = args.slice(1);

    // ── sys list ───────────────────────────────────────────────────────────
    if (sub === 'list' || sub === '') {
      const lines = SUBCOMMANDS.map(s => `\`,sys ${s.name}\` — ${s.desc}`);
      return message.channel.send({ embeds: [
        new EmbedBuilder()
          .setColor(color)
          .setTitle('sys — developer portal')
          .setDescription(lines.join('\n'))
          .setFooter({ text: 'All subcommands are owner-only.' }),
      ] });
    }

    // ── sys pfp ────────────────────────────────────────────────────────────
    if (sub === 'pfp') {
      let src = null;
      const att = message.attachments.find(a => IMAGE_RE.test(a.name || '') || IMAGE_RE.test(a.url || ''));
      if (att) src = att.url;
      if (!src && rest[0] && /^https?:\/\//i.test(rest[0])) src = rest[0];
      if (!src) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Attach a **png/jpg/gif/webp** image or pass a direct image URL.`)] });
      try {
        await client.user.setAvatar(src);
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
      if (!wantsReset && raw.length > MAX) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} Bio too long (**${raw.length}/${MAX}** chars).`)] });
      try {
        if (!client.application) await client.application.fetch();
        await client.application.edit({ description: wantsReset ? '' : raw });
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Bot Bio').setDescription(`✅ ${wantsReset ? 'Cleared' : 'Updated'} bio.\n\n${wantsReset ? '*(empty)*' : raw}`)] });
      } catch (e) { return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`❌ Failed: \`${e.message}\``)] }); }
    }

    // ── sys status ─────────────────────────────────────────────────────────
    if (sub === 'status') {
      if (!rest.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription('⚠️ Usage: `,sys status <text>` • `,sys status clear`')] });
      const currentPresenceStatus = client.user.presence?.status;
      const presenceStatus = ['online', 'idle', 'dnd', 'invisible'].includes(currentPresenceStatus)
        ? currentPresenceStatus
        : 'online';
      if (['clear', 'off', 'none', 'remove'].includes(rest[0].toLowerCase())) {
        await client.user.setPresence({ activities: [], status: presenceStatus });
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription('✅ Custom status **cleared**.')] });
      }
      const text = rest.join(' ').slice(0, 128);
      await client.user.setPresence({ activities: [{ name: 'Custom Status', type: ActivityType.Custom, state: text }], status: presenceStatus });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`✅ Status set to: **${text}**`)] });
    }

    // ── sys username ───────────────────────────────────────────────────────
    if (sub === 'username') {
      const name = rest.join(' ').trim();
      if (!name) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription('⚠️ Usage: `,sys username <new username>`')] });
      try {
        await client.user.setUsername(name);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`✅ Username changed to **${name}**`).setFooter({ text: 'Discord allows 2 username changes per hour.' })] });
      } catch (e) { return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`❌ Failed: \`${e.message}\``)] }); }
    }

    // ── sys displayname ────────────────────────────────────────────────────
    if (sub === 'displayname') {
      const name = rest.join(' ').trim();
      if (!name) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription('⚠️ Usage: `,sys displayname <new display name>`')] });
      try {
        await client.user.setDisplayName(name);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`✅ Display name changed to **${name}**`)] });
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
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Authorized users (${entries.length})`).setDescription(entries.map(([uid, cmds]) => `<@${uid}> — ${cmds.map(c => `\`${c}\``).join(', ')}`).join('\n').slice(0, 4090))] });
      }

      if (['remove', 'rm', 'revoke'].includes(s2)) {
        const userId = resolveUserId(message, rest[1]);
        const cmdName = resolveCmdName(client, rest[2]) || String(rest[2] || '').toLowerCase();
        if (!userId || !cmdName) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Usage: \`,sys authorize remove @user <command>\``)] });
        const removed = revokeUser(userId, cmdName);
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(removed ? `${approve} Revoked \`${cmdName}\` from <@${userId}>.` : `${warn} <@${userId}> wasn't authorized for \`${cmdName}\`.`)] });
      }

      const userId  = resolveUserId(message, rest[0]);
      const cmdRaw  = rest[1];
      if (!userId || !cmdRaw) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Usage: \`,sys authorize @user <command>\` | \`,sys authorize remove @user <command>\` | \`,sys authorize list\``)] });
      if (isOwner(userId)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} That user is already the owner.`)] });
      const cmdName = resolveCmdName(client, cmdRaw);
      if (!cmdName) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${deny} Unknown command \`${cmdRaw}\`.`)] });
      if (!isOwnerCmd(client, cmdName)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${deny} \`${cmdName}\` is not an owner command.`)] });
      if (cmdName === 'sys') return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${deny} \`sys\` cannot be delegated.`)] });
      const added = authorizeUser(userId, cmdName);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(added ? `${approve} Authorized <@${userId}> for \`,${cmdName}\`.` : `${warn} Already authorized.`)] });
    }

    // ── sys osint ──────────────────────────────────────────────────────────
    if (sub === 'osint') {
      const target = (rest[0] || '').trim();
      if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription('⚠️ Usage: `,sys osint <email | discord_id | username>`')] });
      const loading = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`<a:loading:1499216008257339514> Running OSINT on \`${target}\`…`)] });
      let embed;
      if (isEmail(target)) {
        const [er, hr, lc] = await Promise.all([queryEmailRep(target), queryHudsonRockEmail(target), queryLeakCheck(target)]);
        const { fields, dangerous } = fmtEmailReport(target, er, hr, lc);
        embed = new EmbedBuilder().setColor(dangerous ? '#ff3333' : '#1e1e2e').setTitle(`🔍 OSINT — ${target}`).setDescription(`**Type:** Email${dangerous ? '\n⚠️ Exposure in breach databases.' : ''}`).addFields(fields).setTimestamp();
      } else if (isDiscordId(target)) {
        const botToken = process.env.DISCORD_TOKEN || process.env.TOKEN;
        const [du, hr, pl] = await Promise.all([queryDiscordUser(target, botToken), queryHudsonRockUsername(target), checkAllPlatforms(target)]);
        const { fields } = fmtUserReport(target, hr, pl, du);
        const displayName = du ? `${du.username}${du.discriminator && du.discriminator !== '0' ? `#${du.discriminator}` : ''}` : target;
        const avatar = du?.avatar ? `https://cdn.discordapp.com/avatars/${du.id}/${du.avatar}.png` : null;
        embed = new EmbedBuilder().setColor('#5865F2').setTitle(`🔍 OSINT — ${displayName}`).setDescription('**Type:** Discord ID').addFields(fields).setTimestamp();
        if (avatar) embed.setThumbnail(avatar);
      } else {
        const [hr, pl] = await Promise.all([queryHudsonRockUsername(target), checkAllPlatforms(target)]);
        const { fields } = fmtUserReport(target, hr, pl, null);
        embed = new EmbedBuilder().setColor('#1e1e2e').setTitle(`🔍 OSINT — ${target}`).setDescription('**Type:** Username').addFields(fields).setTimestamp();
      }
      return loading.edit({ embeds: [embed] });
    }

    // ── sys botbanner ──────────────────────────────────────────────────────
    if (sub === 'botbanner') {
      const wantsReset = RESET_WORDS.has((rest[0] || '').toLowerCase());
      let src = null;
      if (!wantsReset) {
        const att = message.attachments.find(a => IMAGE_RE.test(a.name || '') || IMAGE_RE.test(a.url || ''));
        if (att) src = att.url;
        if (!src && rest[0] && /^https?:\/\//i.test(rest[0])) src = rest[0];
      }
      if (!wantsReset && !src) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} Attach an image, pass a URL, or use \`,sys botbanner remove\`.`)] });
      try {
        await client.user.setBanner(wantsReset ? null : src);
        const embed = new EmbedBuilder().setColor(color).setDescription(`✅ ${wantsReset ? 'Cleared' : 'Updated'} **${client.user.username}**'s banner.`);
        if (!wantsReset) { const fresh = await client.user.fetch(true).catch(() => client.user); const url = fresh.bannerURL?.({ size: 1024, extension: 'png', forceStatic: false }); if (url) embed.setImage(url); }
        return message.channel.send({ embeds: [embed] });
      } catch (e) { return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`❌ Failed: \`${e.message}\``)] }); }
    }

    // ── sys zipup ──────────────────────────────────────────────────────────
    if (sub === 'zipup') {
      const status = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription('Packing bot source…')] });
      let source;
      try { source = await buildSourceZip(); }
      catch (e) { return status.edit({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`❌ Source zip failed: \`${e.message}\``)] }).catch(() => {}); }
      await status.edit({ embeds: [new EmbedBuilder().setColor(color).setDescription(`Source ready (${fmtBytes(source.buf.length)}, ${source.fileCount} files). Downloading emojis…`)] }).catch(() => {});
      let emojis;
      try { emojis = await buildEmojiZip(client); }
      catch (e) { return status.edit({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`❌ Emoji zip failed: \`${e.message}\``)] }).catch(() => {}); }
      const srcAtt   = new AttachmentBuilder(source.buf, { name: 'bot-source.zip' });
      const emojiAtt = new AttachmentBuilder(emojis.buf, { name: 'bot-emojis.zip' });
      const summary  = new EmbedBuilder().setColor(color).setTitle('zipup complete').setDescription(`**Source:** \`bot-source.zip\` — ${fmtBytes(source.buf.length)}, ${source.fileCount} files\n**Emojis:** \`bot-emojis.zip\` — ${fmtBytes(emojis.buf.length)}, ${emojis.ok}/${emojis.total} downloaded${emojis.fail ? ` (${emojis.fail} failed)` : ''}`);
      try {
        await message.author.send({ embeds: [summary], files: [srcAtt, emojiAtt] });
        await status.edit({ embeds: [new EmbedBuilder().setColor(color).setDescription('✅ Sent both zips to your DMs.')] }).catch(() => {});
      } catch {
        try { await status.edit({ embeds: [summary] }); await message.channel.send({ files: [srcAtt] }); await message.channel.send({ files: [emojiAtt] }); }
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
      for (const line of lines) { if (curLen + line.length + 1 > 3800 && cur.length) { pages.push(cur); cur = []; curLen = 0; } cur.push(line); curLen += line.length + 1; }
      if (cur.length) pages.push(cur);
      try {
        const dm = await message.author.createDM();
        for (let i = 0; i < pages.length; i++) {
          const e = new EmbedBuilder().setColor(color).setTitle(i === 0 ? `Railway Variables (${userVars.length})` : 'Railway Variables (cont.)').setDescription(pages[i].join('\n')).setFooter({ text: 'Click spoilers to reveal values' });
          if (i === pages.length - 1) e.setTimestamp();
          await dm.send({ embeds: [e] });
        }
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} Sent **${userVars.length}** variable(s) to your DMs.`)] });
      } catch (e) { return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} Couldn't DM you: \`${e.message}\``)] }); }
    }

    // ── sys changename ─────────────────────────────────────────────────────
    if (sub === 'changename') {
      const newName     = rest.join(' ').trim();
      const currentName = db.get('botName') || 'bored';
      if (!newName) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`⚠️ Usage: \`,sys changename <new name>\`\nCurrent logged name: \`${currentName}\``)] });
      if (currentName.toLowerCase() === newName.toLowerCase()) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`⚠️ The logged name is already \`${currentName}\`.`)] });
      const loading = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`<a:loading:1499216008257339514> Searching for \`${currentName}\` across the repo…`)] });
      let items = [];
      try { const s = await ghGet(`/search/code?q=${encodeURIComponent(currentName)}+repo:${REPO}&per_page=100`); items = s.items || []; }
      catch (e) { return loading.edit({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`❌ GitHub search failed: \`${e.message}\``)] }); }
      if (!items.length) { db.set('botName', newName); return loading.edit({ embeds: [new EmbedBuilder().setColor(color).setDescription(`✅ No files contained \`${currentName}\`. Name log updated: \`${currentName}\` → **${newName}**`)] }); }
      await loading.edit({ embeds: [new EmbedBuilder().setColor(color).setDescription(`<a:loading:1499216008257339514> Found **${items.length}** file(s). Replacing…`)] });
      const regex = new RegExp(currentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      let updated = 0, skipped = 0, failed = 0; const failedPaths = [];
      for (const item of items) {
        try {
          const fd = await ghGet(`/repos/${REPO}/contents/${item.path}`);
          if (!fd.content) { skipped++; continue; }
          const original = Buffer.from(fd.content, 'base64').toString('utf8');
          const replaced = original.replace(regex, (m) => preserveCase(m, newName));
          if (replaced === original) { skipped++; continue; }
          await ghPut(`/repos/${REPO}/contents/${item.path}`, { message: `chore: rename ${currentName} → ${newName}`, content: Buffer.from(replaced).toString('base64'), sha: fd.sha });
          updated++;
        } catch { failed++; failedPaths.push(item.path); }
      }
      db.set('botName', newName);
      const fields = [{ name: 'Updated', value: `${updated}`, inline: true }, { name: 'Skipped', value: `${skipped}`, inline: true }, { name: 'Failed', value: `${failed}`, inline: true }, { name: 'Name logged', value: `\`${newName}\``, inline: false }];
      if (failedPaths.length) fields.push({ name: 'Failed paths', value: failedPaths.slice(0, 10).join('\n'), inline: false });
      return loading.edit({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Rename: ${currentName} → ${newName}`).addFields(fields)] });
    }

    // ── sys syncvariables ──────────────────────────────────────────────────
    if (sub === 'syncvariables' || sub === 'syncvars') {
      const RAILWAY_TOKEN  = process.env.RAILWAY_TOKEN || process.env.RAILWAY_API_KEY;
      const SERVICE_ID     = process.env.RAILWAY_SERVICE_ID;
      const ENVIRONMENT_ID = process.env.RAILWAY_ENVIRONMENT_ID;

      if (!RAILWAY_TOKEN) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription('⚠️ `RAILWAY_TOKEN` is not set.\nGo to **Railway → Account Settings → Tokens**, create a token, then add it as `RAILWAY_TOKEN` on your Railway service.')] });
      if (!SERVICE_ID || !ENVIRONMENT_ID) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription('⚠️ `RAILWAY_SERVICE_ID` or `RAILWAY_ENVIRONMENT_ID` not found. Is this bot running on Railway?')] });

      const s2 = (rest[0] || '').toLowerCase();

      // set KEY value
      if (s2 === 'set') {
        const key   = rest[1];
        const value = rest.slice(2).join(' ').trim();
        if (!key || !value) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription('⚠️ Usage: `,sys syncvariables set KEY value`')] });
        const loading = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`<a:loading:1499216008257339514> Setting \`${key}\` on Railway…`)] });
        try {
          await upsertRailwayVar(SERVICE_ID, ENVIRONMENT_ID, key, value);
          return loading.edit({ embeds: [new EmbedBuilder().setColor(color).setDescription(`✅ Set \`${key}\` on Railway.\n> **Redeploy** for the new value to apply.`)] });
        } catch (e) { return loading.edit({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`❌ Failed: \`${e.message}\``)] }); }
      }

      // delete KEY
      if (s2 === 'delete' || s2 === 'del' || s2 === 'remove') {
        const key = rest[1];
        if (!key) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription('⚠️ Usage: `,sys syncvariables delete KEY`')] });
        const loading = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`<a:loading:1499216008257339514> Deleting \`${key}\` from Railway…`)] });
        try {
          await deleteRailwayVar(SERVICE_ID, ENVIRONMENT_ID, key);
          return loading.edit({ embeds: [new EmbedBuilder().setColor(color).setDescription(`✅ Deleted \`${key}\` from Railway.`)] });
        } catch (e) { return loading.edit({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`❌ Failed: \`${e.message}\``)] }); }
      }

      // push — running process.env → Railway
      if (s2 === 'push') {
        const loading = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription('<a:loading:1499216008257339514> Pushing all running variables to Railway…')] });
        try {
          const railwayVars = await fetchRailwayVars(SERVICE_ID, ENVIRONMENT_ID);
          const userVars    = Object.entries(process.env).filter(([k]) => !isAutoSet(k));
          let pushed = 0, same = 0;
          for (const [k, v] of userVars) {
            if (railwayVars[k] === v) { same++; continue; }
            await upsertRailwayVar(SERVICE_ID, ENVIRONMENT_ID, k, v);
            pushed++;
          }
          return loading.edit({ embeds: [new EmbedBuilder().setColor(color).setTitle('Variables pushed to Railway').addFields({ name: 'Pushed / updated', value: `${pushed}`, inline: true }, { name: 'Already in sync', value: `${same}`, inline: true }).setFooter({ text: 'Redeploy on Railway for new values to apply.' })] });
        } catch (e) { return loading.edit({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`❌ Failed: \`${e.message}\``)] }); }
      }

      // default — diff view
      const loading = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription('<a:loading:1499216008257339514> Fetching Railway variables…')] });
      try {
        const railwayVars = await fetchRailwayVars(SERVICE_ID, ENVIRONMENT_ID);
        const userVars    = Object.fromEntries(Object.entries(process.env).filter(([k]) => !isAutoSet(k)));
        const rKeys = new Set(Object.keys(railwayVars));
        const pKeys = new Set(Object.keys(userVars));
        const inSync      = [...rKeys].filter(k => pKeys.has(k) && railwayVars[k] === userVars[k]);
        const diffValue   = [...rKeys].filter(k => pKeys.has(k) && railwayVars[k] !== userVars[k]);
        const onlyRailway = [...rKeys].filter(k => !pKeys.has(k));
        const onlyRunning = [...pKeys].filter(k => !rKeys.has(k));
        const lines = [];
        if (inSync.length)      lines.push(`**✅ In sync (${inSync.length}):** ${inSync.map(k => `\`${k}\``).join(', ')}`);
        if (diffValue.length)   lines.push(`**⚠️ Value differs (${diffValue.length}):** ${diffValue.map(k => `\`${k}\``).join(', ')}`);
        if (onlyRailway.length) lines.push(`**🔵 Railway only (${onlyRailway.length}):** ${onlyRailway.map(k => `\`${k}\``).join(', ')}`);
        if (onlyRunning.length) lines.push(`**🟡 Running only (${onlyRunning.length}):** ${onlyRunning.map(k => `\`${k}\``).join(', ')}`);
        return loading.edit({ embeds: [new EmbedBuilder().setColor(color)
          .setTitle(`Variable Sync — ${rKeys.size} on Railway / ${pKeys.size} running`)
          .setDescription(lines.join('\n\n') || '*(no user variables found)*')
          .setFooter({ text: 'push · set KEY val · delete KEY' })
        ] });
      } catch (e) { return loading.edit({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`❌ Railway API error: \`${e.message}\``)] }); }
    }

    // ── unknown subcommand ─────────────────────────────────────────────────
    return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`Unknown subcommand \`${sub}\`. Run \`,sys list\` to see all commands.`)] });
  },
};
