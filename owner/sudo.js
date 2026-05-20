const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { canRunOwnerCmd } = require('../utils/owners');
const db = require('../db');
const fetch = require('node-fetch');
const {
  isEmail, isDiscordId,
  queryEmailRep, queryHudsonRockEmail, queryHudsonRockUsername,
  queryLeakCheck, queryDiscordUser,
  checkAllPlatforms, snowflakeToDate,
} = require('../utils/osint');

// ── GitHub helpers ────────────────────────────────────────────────────────
const REPO = 'abannition/drown-xd';

function ghHeaders() {
  const token = process.env.DROWN_GITHUB_TOKEN || process.env.GITHUB_TOKEN || '';
  return { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };
}

async function ghGet(path) {
  const r = await fetch(`https://api.github.com${path}`, { headers: ghHeaders() });
  return r.json();
}

async function ghPut(path, body) {
  const r = await fetch(`https://api.github.com${path}`, { method: 'PUT', headers: ghHeaders(), body: JSON.stringify(body) });
  return r.json();
}

// ── API list ──────────────────────────────────────────────────────────────
const APIS = [
  { name: 'Discord (bot gateway)', keys: ['DISCORD_TOKEN', 'TOKEN'], belongs: 'Bot login token.' },
  { name: 'GitHub API', keys: ['DROWN_GITHUB_TOKEN', 'GITHUB_TOKEN'], belongs: 'Auto-pushes emojis.json after ,uploademojis.' },
  { name: 'Spotify Web API', keys: ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'], belongs: 'Track / album / artist lookups.' },
  { name: 'Last.fm API', keys: ['LASTFM_API_KEY'], configKey: 'lfkey', belongs: 'Powers ,fm / ,lastfm scrobble system.' },
  { name: 'Reddit API', keys: ['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET'], belongs: 'OAuth client for ,meme.' },
  { name: 'Fortnite-API', keys: ['FORTNITE_API_KEY'], belongs: 'fun/fortnite.js + information/itemshop.js.' },
  { name: 'Lavalink', keys: ['LAVALINK_NODES', 'LAVALINK_HOST', 'LAVALINK_PORT', 'LAVALINK_PASSWORD', 'LAVALINK_SECURE'], belongs: 'Audio backend for ,play.' },
  { name: 'Donation URL', keys: ['DONATE_URL'], belongs: 'Public donate link shown by ,donate.' },
  { name: 'TikTok (public scrape)', keys: [], belongs: 'utility/tiktok.js — no auth.' },
  { name: 'Roblox API (public)', keys: [], belongs: 'utility/roblox.js — no auth.' },
  { name: 'OpenTDB (public)', keys: [], belongs: 'fun/trivia.js — no auth.' },
];

function checkPresent(api) {
  if (api.keys.length === 0) return { configured: true, source: 'public api (no credential needed)' };
  for (const k of api.keys) {
    const v = process.env[k];
    if (typeof v === 'string' && v.trim()) return { configured: true, source: `env: \`${k}\`` };
  }
  if (api.configKey) {
    try {
      const cfg = require('../config.json');
      const v = cfg[api.configKey];
      if (typeof v === 'string' && v.trim()) return { configured: true, source: `config.json: \`${api.configKey}\`` };
    } catch {}
  }
  return { configured: false, source: 'not configured' };
}

function renderApiList() {
  return APIS.map(api => {
    const s = checkPresent(api);
    const icon = s.configured ? '🟢' : '🔴';
    const keys = api.keys.length ? api.keys.map(k => `\`${k}\``).join(', ') : '*none*';
    const cfg = api.configKey ? ` (or config.json \`${api.configKey}\`)` : '';
    return `${icon} **${api.name}** — ${s.source}\n> Keys: ${keys}${cfg}\n> ${api.belongs}`;
  }).join('\n\n');
}

// ── OSINT helpers ─────────────────────────────────────────────────────────
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
    const profileList = Array.isArray(d.profiles) && d.profiles.length
      ? d.profiles.map(p => `\`${p}\``).join(', ')
      : 'none found';
    const repEmoji = { high: '🟢', medium: '🟡', low: '🔴', none: '⚫' }[emailRep.reputation] || '⚫';
    fields.push({
      name: '📊 Email Reputation (emailrep.io)',
      value: truncate(
        `${repEmoji} **Reputation:** ${emailRep.reputation || 'unknown'} • **Refs:** ${emailRep.references ?? 0}\n` +
        (flags.length ? `**Flags:** ${flags.join(', ')}\n` : '') +
        `**Last seen:** ${d.last_seen || 'never'} • **Domain:** ${d.domain_exists ? '✅ exists' : '❌ missing'}\n` +
        `**Linked profiles:** ${profileList}`,
        1024,
      ),
      inline: false,
    });
  } else {
    fields.push({ name: '📊 Email Reputation (emailrep.io)', value: '`No data returned`', inline: false });
  }

  if (hudsonRock) {
    const stealers = Array.isArray(hudsonRock.stealers) ? hudsonRock.stealers : [];
    if (stealers.length) {
      const lines = stealers.slice(0, 5).map((s, i) => {
        const parts = [];
        if (s.stealerFamily)   parts.push(`**Malware:** \`${s.stealerFamily}\``);
        if (s.dateAdded)       parts.push(`**Date:** ${s.dateAdded.slice(0, 10)}`);
        if (s.computerName)    parts.push(`**PC:** \`${s.computerName}\``);
        if (s.operatingSystem) parts.push(`**OS:** ${s.operatingSystem}`);
        if (s.ip)              parts.push(`**IP:** \`${s.ip}\``);
        return `${i + 1}. ${parts.join(' • ')}`;
      });
      if (stealers.length > 5) lines.push(`…and ${stealers.length - 5} more hits`);
      fields.push({ name: `🦠 Infostealer Logs (HudsonRock) — ${stealers.length} hit(s)`, value: truncate(lines.join('\n'), 1024), inline: false });
    } else {
      fields.push({ name: '🦠 Infostealer Logs (HudsonRock)', value: '✅ No infostealer records found', inline: false });
    }
  } else {
    fields.push({ name: '🦠 Infostealer Logs (HudsonRock)', value: '`API unavailable`', inline: false });
  }

  if (leakCheck && leakCheck.success !== false) {
    if (leakCheck.found > 0 && Array.isArray(leakCheck.sources) && leakCheck.sources.length) {
      const src = leakCheck.sources.map(s => `\`${s.name || s}\``).join(', ');
      fields.push({ name: `💀 Data Breaches (LeakCheck.io) — ${leakCheck.found} source(s)`, value: truncate(src, 1024), inline: false });
    } else if (typeof leakCheck.found === 'number') {
      fields.push({ name: '💀 Data Breaches (LeakCheck.io)', value: `${leakCheck.found > 0 ? `⚠️ Found in **${leakCheck.found}** source(s)` : '✅ Not found in any known breach'}`, inline: false });
    } else {
      fields.push({ name: '💀 Data Breaches (LeakCheck.io)', value: '`No data`', inline: false });
    }
  } else {
    fields.push({ name: '💀 Data Breaches (LeakCheck.io)', value: '`API unavailable`', inline: false });
  }

  const dangerous =
    (emailRep?.details?.data_breach || emailRep?.details?.credentials_leaked) ||
    (Array.isArray(hudsonRock?.stealers) && hudsonRock.stealers.length > 0) ||
    (leakCheck?.found > 0);

  return { fields, dangerous };
}

function formatUsernameReport(target, hudsonRock, platforms, discordUser) {
  const fields = [];

  if (discordUser) {
    const created = snowflakeToDate(discordUser.id);
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : null;
    const parts = [
      `**Tag:** ${discordUser.username}${discordUser.discriminator && discordUser.discriminator !== '0' ? `#${discordUser.discriminator}` : ''}`,
      `**ID:** \`${discordUser.id}\``,
      created ? `**Created:** <t:${Math.floor(created.getTime() / 1000)}:F>` : null,
      discordUser.bot ? `**Bot:** Yes` : null,
      avatarUrl ? `**Avatar:** [link](${avatarUrl})` : null,
    ].filter(Boolean);
    fields.push({ name: '🤖 Discord Profile', value: parts.join('\n'), inline: false });
  }

  if (hudsonRock) {
    const stealers = Array.isArray(hudsonRock.stealers) ? hudsonRock.stealers : [];
    if (stealers.length) {
      const lines = stealers.slice(0, 4).map((s, i) => {
        const parts = [];
        if (s.stealerFamily) parts.push(`**Malware:** \`${s.stealerFamily}\``);
        if (s.dateAdded)     parts.push(`**Date:** ${s.dateAdded.slice(0, 10)}`);
        if (s.ip)            parts.push(`**IP:** \`${s.ip}\``);
        if (s.top_logins && s.top_logins[0]) parts.push(`**Login:** \`${s.top_logins[0]}\``);
        return `${i + 1}. ${parts.join(' • ')}`;
      });
      if (stealers.length > 4) lines.push(`…and ${stealers.length - 4} more`);
      fields.push({ name: `🦠 Infostealer Logs (HudsonRock) — ${stealers.length} hit(s)`, value: truncate(lines.join('\n'), 1024), inline: false });
    } else {
      fields.push({ name: '🦠 Infostealer Logs (HudsonRock)', value: '✅ No infostealer records found', inline: false });
    }
  } else {
    fields.push({ name: '🦠 Infostealer Logs (HudsonRock)', value: '`API unavailable`', inline: false });
  }

  if (platforms && platforms.length) {
    const found  = platforms.filter(p => p.found).map(p => `✅ ${p.name}`);
    const missed = platforms.filter(p => !p.found).map(p => `❌ ${p.name}`);
    fields.push({
      name: `🌐 Platform Accounts (${found.length}/${platforms.length} found)`,
      value: truncate([...found, ...missed].join('  '), 1024) || 'No results',
      inline: false,
    });
  }

  return { fields };
}


// ── Case-preserving replace helper ───────────────────────────────────────
function preserveCase(match, replacement) {
  if (match === match.toUpperCase()) return replacement.toUpperCase();
  if (match[0] === match[0].toUpperCase() && match.slice(1) === match.slice(1).toLowerCase())
    return replacement[0].toUpperCase() + replacement.slice(1).toLowerCase();
  if (match === match.toLowerCase()) return replacement.toLowerCase();
  return replacement;
}

// ── Command ───────────────────────────────────────────────────────────────
module.exports = {
  category: 'owner',
  name: 'sudo',
  aliases: [],
  help: [
    { name: 'sudo api',        description: 'List every API the bot integrates with and whether each credential is configured.', aliases: 'n/a', parameters: '', information: 'BOT_OWNER only.', usage: 'sudo api', example: 'sudo api' },
    { name: 'sudo osint',      description: 'Run an OSINT lookup on an email address or Discord username/ID.', aliases: 'n/a', parameters: '<email | username | discord_id>', information: 'BOT_OWNER only.', usage: 'sudo osint <target>', example: 'sudo osint user@gmail.com' },
    { name: 'sudo username',   description: "Change the bot's Discord username.", aliases: 'n/a', parameters: '<new username>', information: 'BOT_OWNER only. 2 changes/hour limit.', usage: 'sudo username <name>', example: 'sudo username drown' },
    { name: 'sudo display',    description: "Change the bot's global display name.", aliases: 'n/a', parameters: '<new display name>', information: 'BOT_OWNER only.', usage: 'sudo display <name>', example: 'sudo display Drown' },
    { name: 'sudo changename', description: 'Replace every occurrence of the current bot name in the GitHub repo with a new name. The previous name is logged so future renames start from the new name, not the original.', aliases: 'n/a', parameters: '<new name>', information: 'BOT_OWNER only. Requires GITHUB_TOKEN env var.', usage: 'sudo changename <name>', example: 'sudo changename drown' },
  ],

  run: async (client, message, args) => {
    if (!canRunOwnerCmd(message.author.id, 'sudo')) return;

    const sub = (args[0] || '').toLowerCase();

    // ── sudo username ─────────────────────────────────────────────────────
    if (sub === 'username') {
      const newName = args.slice(1).join(' ').trim();
      if (!newName) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor('#efa23a').setDescription('⚠️ Usage: `,sudo username <new username>`')],
        });
      }
      try {
        await client.user.setUsername(newName);
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(color)
              .setDescription(`✅ Bot username changed to **${newName}**`)
              .setFooter({ text: 'Discord allows 2 username changes per hour.' }),
          ],
        });
      } catch (e) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`❌ Failed to change username: \`${e.message}\``)],
        });
      }
    }

    // ── sudo display ──────────────────────────────────────────────────────
    if (sub === 'display') {
      const newDisplay = args.slice(1).join(' ').trim();
      if (!newDisplay) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor('#efa23a').setDescription('⚠️ Usage: `,sudo display <new display name>`')],
        });
      }
      try {
        await client.user.setDisplayName(newDisplay);
        return message.channel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(color)
              .setDescription(`✅ Bot display name changed to **${newDisplay}**`),
          ],
        });
      } catch (e) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`❌ Failed to change display name: \`${e.message}\``)],
        });
      }
    }

    // ── sudo changename ───────────────────────────────────────────────────
    if (sub === 'changename') {
      const newName = args.slice(1).join(' ').trim();
      if (!newName) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(
            `⚠️ Usage: \`,sudo changename <new name>\`\n` +
            `Current logged name: \`${db.get('botName') || 'bored'}\``
          )],
        });
      }

      const currentName = db.get('botName') || 'bored';

      if (currentName.toLowerCase() === newName.toLowerCase()) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`⚠️ The logged name is already \`${currentName}\`.`)],
        });
      }

      const loading = await message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setDescription(
          `<a:loading:1499216008257339514> Searching for \`${currentName}\` across the repo…`
        )],
      });

      // Search GitHub for files containing the current name
      let items = [];
      try {
        const searchData = await ghGet(
          `/search/code?q=${encodeURIComponent(currentName)}+repo:${REPO}&per_page=100`
        );
        items = searchData.items || [];
      } catch (e) {
        return loading.edit({
          embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`❌ GitHub search failed: \`${e.message}\``)],
        });
      }

      if (items.length === 0) {
        // No files found — still update the log
        db.set('botName', newName);
        return loading.edit({
          embeds: [new EmbedBuilder().setColor(color).setDescription(
            `✅ No files contained \`${currentName}\`.\nName log updated: \`${currentName}\` → **${newName}**`
          )],
        });
      }

      await loading.edit({
        embeds: [new EmbedBuilder().setColor(color).setDescription(
          `<a:loading:1499216008257339514> Found **${items.length}** file(s). Replacing \`${currentName}\` → **${newName}**…`
        )],
      });

      // Escape the current name for use in a regex
      const escaped = currentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex   = new RegExp(escaped, 'gi');

      let updated = 0, skipped = 0, failed = 0;
      const failedPaths = [];

      for (const item of items) {
        try {
          const fileData = await ghGet(`/repos/${REPO}/contents/${item.path}`);
          if (!fileData.content) { skipped++; continue; }

          const original = Buffer.from(fileData.content, 'base64').toString('utf8');
          const replaced = original.replace(regex, (match) => preserveCase(match, newName));

          if (replaced === original) { skipped++; continue; }

          await ghPut(`/repos/${REPO}/contents/${item.path}`, {
            message: `chore: rename ${currentName} → ${newName}`,
            content:  Buffer.from(replaced).toString('base64'),
            sha:      fileData.sha,
          });

          updated++;
        } catch (e) {
          failed++;
          failedPaths.push(item.path);
        }
      }

      // Persist new name — this is the source of truth for the next rename
      db.set('botName', newName);

      const fields = [
        { name: 'Files updated',  value: `${updated}`,  inline: true },
        { name: 'Skipped',        value: `${skipped}`,  inline: true },
        { name: 'Failed',         value: `${failed}`,   inline: true },
        { name: 'Name now logged', value: `\`${newName}\``, inline: false },
      ];
      if (failedPaths.length) {
        fields.push({ name: 'Failed paths', value: failedPaths.slice(0, 10).join('\n'), inline: false });
      }

      return loading.edit({
        embeds: [
          new EmbedBuilder()
            .setColor(color)
            .setTitle(`Rename complete: ${currentName} → ${newName}`)
            .addFields(fields)
            .setFooter({ text: 'Next ,sudo changename will replace the new name, not the original.' }),
        ],
      });
    }

    // ── sudo api ──────────────────────────────────────────────────────────
    if (sub === 'api' || sub === 'apis') {
      const description = renderApiList();
      const configured  = APIS.filter(a => checkPresent(a).configured).length;
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(color)
            .setTitle(`Connected APIs (${configured}/${APIS.length})`)
            .setDescription(description.slice(0, 4090))
            .setFooter({ text: 'Credential values are never displayed — only whether the credential exists.' })
            .setTimestamp(),
        ],
      });
    }

    // ── sudo osint ────────────────────────────────────────────────────────
    if (sub === 'osint') {
      const target = (args[1] || '').trim();
      if (!target) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`⚠️ Usage: \`,sudo osint <email | discord_id | username>\``)],
        });
      }

      const loading = await message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setDescription(`<a:loading:1499216008257339514> Running OSINT on \`${target}\`.. this may take a moment`)],
      });

      let embed;

      if (isEmail(target)) {
        const [emailRep, hudsonRock, leakCheck] = await Promise.all([
          queryEmailRep(target),
          queryHudsonRockEmail(target),
          queryLeakCheck(target),
        ]);
        const { fields, dangerous } = formatEmailReport(target, emailRep, hudsonRock, leakCheck);
        embed = new EmbedBuilder()
          .setColor(dangerous ? '#ff3333' : '#1e1e2e')
          .setTitle(`🔍 OSINT — ${target}`)
          .setDescription(`**Type:** Email address${dangerous ? '\n⚠️ **This address has exposure in breach databases.**' : ''}`)
          .addFields(fields)
          .setFooter({ text: 'Sources: emailrep.io • HudsonRock Cavalier • LeakCheck.io • For authorized use only.' })
          .setTimestamp();
      } else if (isDiscordId(target)) {
        const botToken = process.env.DISCORD_TOKEN || process.env.TOKEN;
        const [discordUser, hudsonRock, platforms] = await Promise.all([
          queryDiscordUser(target, botToken),
          queryHudsonRockUsername(target),
          checkAllPlatforms(target),
        ]);
        const { fields } = formatUsernameReport(target, hudsonRock, platforms, discordUser);
        const displayName = discordUser
          ? (discordUser.username + (discordUser.discriminator && discordUser.discriminator !== '0' ? `#${discordUser.discriminator}` : ''))
          : target;
        const avatarUrl = discordUser?.avatar
          ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
          : null;
        embed = new EmbedBuilder()
          .setColor('#5865F2')
          .setTitle(`🔍 OSINT — ${displayName}`)
          .setDescription(`**Type:** Discord Snowflake ID`)
          .addFields(fields)
          .setFooter({ text: 'Sources: Discord API • HudsonRock Cavalier • 13 platform checks • For authorized use only.' })
          .setTimestamp();
        if (avatarUrl) embed.setThumbnail(avatarUrl);
      } else {
        const [hudsonRock, platforms] = await Promise.all([
          queryHudsonRockUsername(target),
          checkAllPlatforms(target),
        ]);
        const { fields } = formatUsernameReport(target, hudsonRock, platforms, null);
        embed = new EmbedBuilder()
          .setColor('#1e1e2e')
          .setTitle(`🔍 OSINT — ${target}`)
          .setDescription(`**Type:** Username  •  **Tip:** pass a Discord snowflake ID for full Discord profile data.`)
          .addFields(fields)
          .setFooter({ text: 'Sources: HudsonRock Cavalier • 13 platform checks • For authorized use only.' })
          .setTimestamp();
      }

      return loading.edit({ embeds: [embed] });
    }

    // ── Unknown subcommand ────────────────────────────────────────────────
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor(color).setDescription(
        'Subcommands: `api` • `osint <target>` • `username <name>` • `display <name>` • `changename <name>`'
      )],
    });
  },
};
