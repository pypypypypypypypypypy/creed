const { EmbedBuilder, PermissionFlagsBits, AuditLogEvent } = require('discord.js');
const client = require('../bleed');
const db = require('../db');

// ── HELPERS ───────────────────────────────────────────────────────────────────
function arCfg(guildId) { return db.get(`antiraid.${guildId}`) || {}; }
function anCfg(guildId) { return db.get(`antinuke.${guildId}`) || {}; }
function filterCfg(guildId) { return db.get(`filter.${guildId}`) || {}; }

function logIncident(guildId, type, userId, details) {
  const incidents = db.get(`incidents.${guildId}`) || [];
  const id = `INC-${Date.now().toString(36).toUpperCase()}`;
  incidents.push({ id, type, userId, details, timestamp: Date.now(), resolved: false });
  db.set(`incidents.${guildId}`, incidents);
  return id;
}

async function punish(member, punishment, reason) {
  try {
    if (punishment === 'kick') await member.kick(reason).catch(() => {});
    else if (punishment === 'ban') await member.ban({ reason, deleteMessageSeconds: 0 }).catch(() => {});
    else if (punishment === 'mute') await member.timeout(3600000, reason).catch(() => {});
    else if (punishment === 'strip') {
      const roles = member.roles.cache.filter(r => r.id !== member.guild.id && r.managed === false);
      await member.roles.remove(roles, reason).catch(() => {});
    }
  } catch {}
}

// ── ANTIRAID: MEMBER JOIN ─────────────────────────────────────────────────────
const joinTracker = new Map();

client.on('guildMemberAdd', async member => {
  if (member.user.bot) return;
  const c = arCfg(member.guild.id);
  if (!c.enabled) return;
  const whitelist = c.whitelist || [];
  if (whitelist.includes(member.id)) return;

  // Account age check
  if (c.age?.enabled) {
    const ageDays = (Date.now() - member.user.createdTimestamp) / 86400000;
    if (ageDays < (c.age.days || 7)) {
      await punish(member, c.age.punishment || 'kick', `[AntiRaid] Account too new (${Math.floor(ageDays)} days old)`);
      logIncident(member.guild.id, 'ANTIRAID_AGE', member.id, `Account age: ${Math.floor(ageDays)} days`);
      return;
    }
  }

  // No avatar check
  if (c.avatar?.enabled && !member.user.avatar) {
    await punish(member, c.avatar.punishment || 'kick', '[AntiRaid] No avatar');
    logIncident(member.guild.id, 'ANTIRAID_AVATAR', member.id, 'User has no avatar');
    return;
  }

  // Unverified bot check
  if (c.unverifiedbots?.enabled && member.user.bot && !member.user.flags?.has('VerifiedBot')) {
    await punish(member, c.unverifiedbots.punishment || 'ban', '[AntiRaid] Unverified bot');
    logIncident(member.guild.id, 'ANTIRAID_UNVERIFIED_BOT', member.id, 'Unverified bot added');
    return;
  }

  // Username pattern check
  if ((c.patterns || []).length) {
    const uname = member.user.username.toLowerCase();
    const match = c.patterns.find(p => uname.includes(p.toLowerCase()));
    if (match) {
      await punish(member, 'kick', `[AntiRaid] Username matches pattern: ${match}`);
      logIncident(member.guild.id, 'ANTIRAID_USERNAME', member.id, `Pattern match: ${match}`);
      return;
    }
  }

  // Mass join detection
  if (c.massjoin?.enabled) {
    const gid = member.guild.id;
    const threshold = c.massjoin.threshold || 10;
    const interval = (c.massjoin.interval || 60) * 1000;
    const now = Date.now();
    if (!joinTracker.has(gid)) joinTracker.set(gid, []);
    const joins = joinTracker.get(gid).filter(t => now - t < interval);
    joins.push(now);
    joinTracker.set(gid, joins);
    if (joins.length >= threshold) {
      await punish(member, c.massjoin.punishment || 'kick', '[AntiRaid] Mass join detected');
      logIncident(gid, 'ANTIRAID_MASSJOIN', member.id, `${joins.length} joins in ${c.massjoin.interval}s`);
    }
  }
});

// ── ANTIRAID: MASS MENTION ────────────────────────────────────────────────────
const mentionTracker = new Map();

client.on('messageCreate', async message => {
  if (!message.guild || message.author.bot) return;
  const c = arCfg(message.guild.id);
  if (!c.enabled || !c.massmention?.enabled) return;
  if ((c.whitelist || []).includes(message.author.id)) return;

  const mentions = message.mentions.users.size + message.mentions.roles.size;
  const threshold = c.massmention.threshold || 5;
  if (mentions >= threshold) {
    const member = message.member;
    if (!member) return;
    await message.delete().catch(() => {});
    await punish(member, c.massmention.punishment || 'mute', `[AntiRaid] Mass mention (${mentions} mentions)`);
    logIncident(message.guild.id, 'ANTIRAID_MASSMENTION', message.author.id, `${mentions} mentions in one message`);
  }

  // Filter: word filter
  const fc = filterCfg(message.guild.id);
  if ((fc.words || []).length) {
    const exemptRoles = fc.exemptRoles || [];
    const memberRoles = message.member?.roles.cache.map(r => r.id) || [];
    if (!memberRoles.some(r => exemptRoles.includes(r))) {
      const content = message.content.toLowerCase();
      const hit = (fc.words || []).find(w => content.includes(w));
      if (hit && !(fc.whitelist || []).includes(hit)) {
        await message.delete().catch(() => {});
        db.set(`filtersnipe.${message.guild.id}.words`, { author: message.author.id, content: message.content, time: Math.floor(Date.now() / 1000) });
        if (fc.strikes?.enabled) {
          fc.userStrikes = fc.userStrikes || {};
          fc.userStrikes[message.author.id] = (fc.userStrikes[message.author.id] || 0) + 1;
          db.set(`filter.${message.guild.id}`, fc);
        }
      }
    }
  }
  // Filter: domain blacklist
  if ((fc.blacklist || []).length) {
    const urlMatch = message.content.match(/https?:\/\/([^\/\s]+)/g);
    if (urlMatch) {
      for (const url of urlMatch) {
        try {
          const domain = new URL(url).hostname;
          if ((fc.blacklist || []).some(d => domain.includes(d))) {
            await message.delete().catch(() => {});
            break;
          }
        } catch {}
      }
    }
  }
  // Filter: regex patterns
  if (fc.regex && Object.keys(fc.regex).length) {
    for (const [name, pattern] of Object.entries(fc.regex)) {
      try {
        if (new RegExp(pattern, 'gi').test(message.content)) {
          await message.delete().catch(() => {});
          db.set(`filtersnipe.${message.guild.id}.regex`, { author: message.author.id, content: message.content, time: Math.floor(Date.now() / 1000) });
          break;
        }
      } catch {}
    }
  }
});

// ── ANTINUKE: ACTION TRACKER ──────────────────────────────────────────────────
const actionTracker = new Map();

function trackAction(guildId, userId, type, threshold, interval) {
  const key = `${guildId}:${userId}:${type}`;
  const now = Date.now();
  if (!actionTracker.has(key)) actionTracker.set(key, []);
  const actions = actionTracker.get(key).filter(t => now - t < interval * 1000);
  actions.push(now);
  actionTracker.set(key, actions);
  return actions.length >= threshold;
}

async function antinukeRespond(guild, userId, punishment, type, reason) {
  const c = anCfg(guild.id);
  if (!c.enabled) return;
  if ((c.whitelist || []).includes(userId)) return;
  if ((c.admins || []).includes(userId)) return;
  logIncident(guild.id, `ANTINUKE_${type.toUpperCase()}`, userId, reason);
  try {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (member) await punish(member, punishment, `[AntiNuke] ${reason}`);
    else await guild.bans.create(userId, { reason: `[AntiNuke] ${reason}` }).catch(() => {});
  } catch {}
}

// Guild Ban Add (mass ban)
client.on('guildBanAdd', async ban => {
  const c = anCfg(ban.guild.id);
  if (!c.enabled || !c.ban?.enabled) return;
  const logs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 }).catch(() => null);
  const entry = logs?.entries.first();
  if (!entry || Date.now() - entry.createdTimestamp > 5000) return;
  const exceeded = trackAction(ban.guild.id, entry.executor.id, 'ban', c.ban.threshold || 3, c.ban.interval || 10);
  if (exceeded) await antinukeRespond(ban.guild, entry.executor.id, c.ban.punishment || 'ban', 'BAN', `Mass ban detected`);
});

// Guild Member Remove (mass kick)
client.on('guildMemberRemove', async member => {
  const c = anCfg(member.guild.id);
  if (!c.enabled || !c.kick?.enabled) return;
  const logs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 1 }).catch(() => null);
  const entry = logs?.entries.first();
  if (!entry || Date.now() - entry.createdTimestamp > 5000) return;
  const exceeded = trackAction(member.guild.id, entry.executor.id, 'kick', c.kick.threshold || 3, c.kick.interval || 10);
  if (exceeded) await antinukeRespond(member.guild, entry.executor.id, c.kick.punishment || 'ban', 'KICK', `Mass kick detected`);
});

// Channel Delete/Create
client.on('channelDelete', async channel => {
  if (!channel.guild) return;
  const c = anCfg(channel.guild.id);
  if (!c.enabled || !c.channel?.enabled) return;
  const logs = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.ChannelDelete, limit: 1 }).catch(() => null);
  const entry = logs?.entries.first();
  if (!entry || Date.now() - entry.createdTimestamp > 5000) return;
  const exceeded = trackAction(channel.guild.id, entry.executor.id, 'channel', c.channel.threshold || 3, c.channel.interval || 10);
  if (exceeded) await antinukeRespond(channel.guild, entry.executor.id, c.channel.punishment || 'ban', 'CHANNEL', `Mass channel delete detected`);
});

// Role Delete
client.on('roleDelete', async role => {
  const c = anCfg(role.guild.id);
  if (!c.enabled || !c.role?.enabled) return;
  const logs = await role.guild.fetchAuditLogs({ type: AuditLogEvent.RoleDelete, limit: 1 }).catch(() => null);
  const entry = logs?.entries.first();
  if (!entry || Date.now() - entry.createdTimestamp > 5000) return;
  const exceeded = trackAction(role.guild.id, entry.executor.id, 'role', c.role.threshold || 3, c.role.interval || 10);
  if (exceeded) await antinukeRespond(role.guild, entry.executor.id, c.role.punishment || 'ban', 'ROLE', `Mass role delete detected`);
});

// Guild Update (vanity/name change protection)
client.on('guildUpdate', async (oldGuild, newGuild) => {
  const c = anCfg(newGuild.id);
  if (!c.enabled) return;
  if (c.vanity?.enabled && oldGuild.vanityURLCode && !newGuild.vanityURLCode) {
    const logs = await newGuild.fetchAuditLogs({ type: AuditLogEvent.GuildUpdate, limit: 1 }).catch(() => null);
    const entry = logs?.entries.first();
    if (entry && Date.now() - entry.createdTimestamp < 5000) {
      await antinukeRespond(newGuild, entry.executor.id, c.vanity.punishment || 'ban', 'VANITY', `Vanity URL removed`);
    }
  }
  if (c.guildupdate?.enabled) {
    const logs = await newGuild.fetchAuditLogs({ type: AuditLogEvent.GuildUpdate, limit: 1 }).catch(() => null);
    const entry = logs?.entries.first();
    if (entry && Date.now() - entry.createdTimestamp < 5000) {
      const exceeded = trackAction(newGuild.id, entry.executor.id, 'guildupdate', c.guildupdate.threshold || 2, c.guildupdate.interval || 10);
      if (exceeded) await antinukeRespond(newGuild, entry.executor.id, c.guildupdate.punishment || 'ban', 'GUILDUPDATE', `Guild settings changed`);
    }
  }
});

// Bot Add
client.on('guildMemberAdd', async member => {
  if (!member.user.bot) return;
  const c = anCfg(member.guild.id);
  if (!c.enabled || !c.botadd?.enabled) return;
  const logs = await member.guild.fetchAuditLogs({ type: AuditLogEvent.BotAdd, limit: 1 }).catch(() => null);
  const entry = logs?.entries.first();
  if (!entry || Date.now() - entry.createdTimestamp > 5000) return;
  if ((c.whitelist || []).includes(member.id)) return;
  await antinukeRespond(member.guild, entry.executor.id, c.botadd.punishment || 'ban', 'BOTADD', `Unauthorized bot added: ${member.user.tag}`);
  await member.ban({ reason: '[AntiNuke] Unauthorized bot' }).catch(() => {});
});

// Webhook Create
client.on('webhooksUpdate', async channel => {
  if (!channel.guild) return;
  const c = anCfg(channel.guild.id);
  if (!c.enabled || !c.webhook?.enabled) return;
  const logs = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.WebhookCreate, limit: 1 }).catch(() => null);
  const entry = logs?.entries.first();
  if (!entry || Date.now() - entry.createdTimestamp > 5000) return;
  const exceeded = trackAction(channel.guild.id, entry.executor.id, 'webhook', c.webhook.threshold || 2, c.webhook.interval || 10);
  if (exceeded) await antinukeRespond(channel.guild, entry.executor.id, c.webhook.punishment || 'ban', 'WEBHOOK', `Mass webhook creation`);
});
