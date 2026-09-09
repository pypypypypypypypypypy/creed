const { EmbedBuilder, AttachmentBuilder, ActivityType } = require('discord.js');
const { color } = require('../config.json');
const { warn, deny, approve } = require('../emojis.json');
const { canRunOwnerCmd, isOwner, authorizeUser, revokeUser, listAuthorizations } = require('../utils/owners');
const { fmt, getWallet, setWallet, isEnabled, hasAccount, openAccount, parseAmount } = require('../economy/utils');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// ── Constants ─────────────────────────────────────────────────────────────────
const IMAGE_RE    = /\.(png|jpe?g|gif|webp)(\?.*)?$/i;
const RESET_WORDS = new Set(['remove', 'reset', 'clear', 'none', 'off']);
const REPO        = process.env.DROWN_GITHUB_REPO || 'pypypypypypypypypypy/drown-xd';

// ── GitHub archive helper ─────────────────────────────────────────────────────
function ghHeaders() {
  const t = process.env.DROWN_GITHUB_TOKEN || process.env.GITHUB_TOKEN || '';
  return { Authorization: `token ${t}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };
}

// ── zipup helpers ─────────────────────────────────────────────────────────────
const EXCLUDE_DIRS = new Set(['node_modules', '.git', '.cache', '.local', '.replit', 'dist', 'out', 'tmp', 'coverage', 'logs']);
const EXCLUDE_FILE_RE = [/^\.env(\.|$)/i, /^npm-debug\.log/i, /\.log$/i, /\.DS_Store$/i, /^bored-xd-source.*\.zip$/i, /^bored-xd-emojis.*\.zip$/i];

function shouldExclude(name) { return EXCLUDE_FILE_RE.some(r => r.test(name)); }

function shouldExcludePath(relativePath) {
  const parts = relativePath.split('/');
  return parts.some(part => EXCLUDE_DIRS.has(part)) || shouldExclude(path.basename(relativePath));
}

async function buildLatestSourceZip() {
  const repoResponse = await fetch(`https://api.github.com/repos/${REPO}`, { headers: ghHeaders() });
  if (!repoResponse.ok) throw new Error(`GitHub repository lookup failed (${repoResponse.status})`);
  const repo = await repoResponse.json();
  const branch = repo.default_branch || 'main';

  const archiveResponse = await fetch(
    `https://api.github.com/repos/${REPO}/zipball/${encodeURIComponent(branch)}`,
    { headers: ghHeaders() },
  );
  if (!archiveResponse.ok) throw new Error(`GitHub archive download failed (${archiveResponse.status})`);

  const archive = new AdmZip(Buffer.from(await archiveResponse.arrayBuffer()));
  const output = new AdmZip();
  let fileCount = 0;
  for (const entry of archive.getEntries()) {
    if (entry.isDirectory()) continue;
    const relativePath = entry.entryName.split('/').slice(1).join('/');
    if (!relativePath || shouldExcludePath(relativePath)) continue;
    output.addFile(relativePath, entry.getData());
    fileCount++;
  }
  return { buf: output.toBuffer(), fileCount, sourceRef: `${REPO}@${branch}` };
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

// ── Command ───────────────────────────────────────────────────────────────────
const SUBCOMMANDS = [
  { name: 'pfp',            desc: 'Update the bot\'s profile picture',                 usage: 'sys pfp <attachment | url>' },
  { name: 'bio',            desc: 'Update the bot\'s About Me bio',                    usage: 'sys bio <text | remove>' },
  { name: 'status',         desc: 'Set the bot\'s custom status',                      usage: 'sys status <text | clear>' },
  { name: 'username',       desc: 'Change the bot\'s Discord username',                usage: 'sys username <name>' },
  { name: 'displayname',    desc: 'Change the bot\'s global display name',             usage: 'sys displayname <name>' },
  { name: 'authorize',      desc: 'Grant / revoke owner cmd access to a user',         usage: 'sys authorize @user <cmd> | remove @user <cmd> | list' },
  { name: 'give',           desc: 'Add coins to a user\'s wallet',                     usage: 'sys give <user> <amount>' },
  { name: 'botbanner',      desc: 'Update the bot\'s profile banner',                  usage: 'sys botbanner <attachment | url | remove>' },
  { name: 'zipup',          desc: 'DM full source zip + emoji zip',                    usage: 'sys zipup' },
  { name: 'list',           desc: 'List all sys subcommands',                          usage: 'sys list' },
  { name: 'reset',          desc: 'Resets the bots Cache',                           usage: 'sys reset' }
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

    // ── sys give ───────────────────────────────────────────────────────────
    if (sub === 'give') {
      if (!isEnabled(message.guild.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} The economy system is **disabled** in this server.`)] });

      const targetId = resolveUserId(message, rest[0]);
      if (!targetId) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} Usage: \`,sys give @user <amount>\``)] });

      const target = await message.guild.members.fetch(targetId).catch(() => null);
      if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} Please mention a valid server member.`)] });

      const amount = parseAmount(rest[1]);
      if (!rest[1] || !Number.isFinite(amount) || amount <= 0) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} Please provide a valid amount, such as \`1000\`, \`5k\`, or \`1m\`.`)] });
      }

      const guildId = message.guild.id;
      if (!hasAccount(guildId, target.id)) openAccount(guildId, target.id);
      setWallet(guildId, target.id, getWallet(guildId, target.id) + amount);

      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(color)
            .setDescription(`${approve} Added **${fmt(amount)}** to **${target.user.username}**'s wallet.`),
        ],
      });
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
      const status = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`Downloading the latest source from \`${REPO}\`…`)] });
      let source;
      try { source = await buildLatestSourceZip(); }
      catch (e) { return status.edit({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`❌ Source zip failed: \`${e.message}\``)] }).catch(() => {}); }
      await status.edit({ embeds: [new EmbedBuilder().setColor(color).setDescription(`Latest source ready from \`${source.sourceRef}\` (${fmtBytes(source.buf.length)}, ${source.fileCount} files). Downloading emojis…`)] }).catch(() => {});
      let emojis;
      try { emojis = await buildEmojiZip(client); }
      catch (e) { return status.edit({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`❌ Emoji zip failed: \`${e.message}\``)] }).catch(() => {}); }
      const srcAtt   = new AttachmentBuilder(source.buf, { name: 'bot-source.zip' });
      const emojiAtt = new AttachmentBuilder(emojis.buf, { name: 'bot-emojis.zip' });
      const summary  = new EmbedBuilder().setColor(color).setTitle('zipup complete').setDescription(`**Source:** \`bot-source.zip\` — latest \`${source.sourceRef}\`, ${fmtBytes(source.buf.length)}, ${source.fileCount} files\n**Emojis:** \`bot-emojis.zip\` — ${fmtBytes(emojis.buf.length)}, ${emojis.ok}/${emojis.total} downloaded${emojis.fail ? ` (${emojis.fail} failed)` : ''}`);
      try {
        await message.author.send({ embeds: [summary], files: [srcAtt, emojiAtt] });
        await status.edit({ embeds: [new EmbedBuilder().setColor(color).setDescription('✅ Sent both zips to your DMs.')] }).catch(() => {});
      } catch {
        try { await status.edit({ embeds: [summary] }); await message.channel.send({ files: [srcAtt] }); await message.channel.send({ files: [emojiAtt] }); }
        catch (e2) { await status.edit({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`❌ Could not send files: \`${e2.message}\``)] }).catch(() => {}); }
      }
      return;
    }

    // ── unknown subcommand ─────────────────────────────────────────────────
    return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`Unknown subcommand \`${sub}\`. Run \`,sys list\` to see all commands.`)] });
  },
};
