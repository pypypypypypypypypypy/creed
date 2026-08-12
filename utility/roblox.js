const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ComponentType,
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
} = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');

const UA = { 'User-Agent': 'bored-xd-bot/1.0 (+https://github.com/abannition/bored-xd)' };

const ROLIMONS_LOGO = 'https://www.rolimons.com/imgs/icons/rolimons_logo_512.png';

// ---------- HTTP helpers ----------
async function jget(url) {
  try {
    const r = await fetch(url, { headers: UA, timeout: 10000 });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

async function jpost(url, body) {
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { ...UA, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      timeout: 10000,
    });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

// ---------- Roblox API ----------
async function resolveUser(input) {
  if (/^\d+$/.test(input)) {
    const u = await jget(`https://users.roblox.com/v1/users/${input}`);
    if (u && u.id) return u;
  }
  const data = await jpost('https://users.roblox.com/v1/usernames/users', {
    usernames: [input],
    excludeBannedUsers: false,
  });
  const hit = data && data.data && data.data[0];
  if (!hit) return null;
  return await jget(`https://users.roblox.com/v1/users/${hit.id}`);
}

async function getAvatarThumb(userId, size = '420x420') {
  for (let attempt = 0; attempt < 3; attempt++) {
    const d = await jget(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=${size}&format=Png&isCircular=false`);
    const item = d && d.data && d.data[0];
    if (!item) return null;
    if (item.state === 'Completed' && item.imageUrl) return item.imageUrl;
    if (item.state === 'Blocked' || item.state === 'Error') return null;
    if (attempt < 2) await new Promise(r => setTimeout(r, 1200));
  }
  return null;
}

async function getAvatarHeadshot(userId, size = '150x150') {
  for (let attempt = 0; attempt < 3; attempt++) {
    const d = await jget(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=${size}&format=Png&isCircular=false`);
    const item = d && d.data && d.data[0];
    if (!item) return null;
    if (item.state === 'Completed' && item.imageUrl) return item.imageUrl;
    if (item.state === 'Blocked' || item.state === 'Error') return null;
    if (attempt < 2) await new Promise(r => setTimeout(r, 1200));
  }
  return null;
}

async function getHeadshotsBatch(userIds) {
  const map = {};
  if (!userIds.length) return map;
  for (let i = 0; i < userIds.length; i += 100) {
    const chunk = userIds.slice(i, i + 100);
    const d = await jget(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${chunk.join(',')}&size=150x150&format=Png&isCircular=false`);
    if (!d || !d.data) continue;
    for (const t of d.data) {
      if (t.state === 'Completed' && t.imageUrl) map[t.targetId] = t.imageUrl;
    }
  }
  return map;
}

async function getPresence(userId) {
  const d = await jpost('https://presence.roblox.com/v1/presence/users', { userIds: [Number(userId)] });
  return d && d.userPresences && d.userPresences[0];
}

async function getFriendCount(userId) {
  const d = await jget(`https://friends.roblox.com/v1/users/${userId}/friends/count`);
  return d ? d.count : 0;
}
async function getFollowerCount(userId) {
  const d = await jget(`https://friends.roblox.com/v1/users/${userId}/followers/count`);
  return d ? d.count : 0;
}
async function getFollowingCount(userId) {
  const d = await jget(`https://friends.roblox.com/v1/users/${userId}/followings/count`);
  return d ? d.count : 0;
}
// Bulk-resolve user IDs -> { id, name, displayName, hasVerifiedBadge }.
// The friends/followers/following endpoints now return only `{id}` (or empty
// name fields), so we have to look names up separately in batches of 100.
async function getUsersByIds(userIds) {
  const map = {};
  if (!userIds.length) return map;
  for (let i = 0; i < userIds.length; i += 100) {
    const chunk = userIds.slice(i, i + 100);
    const d = await jpost('https://users.roblox.com/v1/users', {
      userIds: chunk,
      excludeBannedUsers: false,
    });
    if (!d || !d.data) continue;
    for (const u of d.data) map[u.id] = u;
  }
  return map;
}

async function enrichWithNames(people) {
  if (!people.length) return people;
  // Only look up the ones missing a usable name.
  const needIds = people
    .filter((p) => !p.name || !p.displayName)
    .map((p) => p.id);
  if (!needIds.length) return people;
  const map = await getUsersByIds([...new Set(needIds)]);
  return people.map((p) => {
    const hit = map[p.id];
    if (!hit) return p;
    return {
      ...p,
      name: p.name || hit.name,
      displayName: p.displayName || hit.displayName || hit.name,
      hasVerifiedBadge: p.hasVerifiedBadge ?? hit.hasVerifiedBadge,
    };
  });
}

async function getFriends(userId) {
  const d = await jget(`https://friends.roblox.com/v1/users/${userId}/friends`);
  return await enrichWithNames((d && d.data) || []);
}
async function getFollowers(userId) {
  const d = await jget(`https://friends.roblox.com/v1/users/${userId}/followers?limit=100&sortOrder=Asc`);
  return await enrichWithNames((d && d.data) || []);
}
async function getFollowing(userId) {
  const d = await jget(`https://friends.roblox.com/v1/users/${userId}/followings?limit=100&sortOrder=Asc`);
  return await enrichWithNames((d && d.data) || []);
}
async function getGroups(userId) {
  const d = await jget(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
  return (d && d.data) || [];
}
// /v2/users/{userId}/groups/roles does NOT include owner info on each group.
// Fetch the missing fields (owner, memberCount, publicEntryAllowed, description,
// created) in bulk via /v2/groups, then resolve owner usernames in one batch
// users.roblox.com call. Mutates the original `groups` array in place so the
// existing renderer keeps working.
async function enrichGroupsWithOwners(groups) {
  if (!groups || !groups.length) return;
  const ids = [...new Set(groups.map((g) => g.group && g.group.id).filter(Boolean))];
  if (!ids.length) return;

  const detailsById = {};
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const d = await jget(`https://groups.roblox.com/v2/groups?groupIds=${chunk.join(',')}`);
    if (!d || !d.data) continue;
    for (const g of d.data) detailsById[g.id] = g;
  }

  // Resolve owner usernames in one POST.
  const ownerIds = [...new Set(
    Object.values(detailsById)
      .map((g) => g.owner && g.owner.id)
      .filter(Boolean)
  )];
  const ownerById = {};
  if (ownerIds.length) {
    const u = await jpost('https://users.roblox.com/v1/users', { userIds: ownerIds, excludeBannedUsers: false });
    if (u && Array.isArray(u.data)) {
      for (const o of u.data) ownerById[o.id] = o;
    }
  }

  for (const item of groups) {
    const grp = item.group;
    if (!grp || !grp.id) continue;
    const info = detailsById[grp.id];
    if (!info) continue;
    if (info.memberCount != null) grp.memberCount = info.memberCount;
    if (info.created) grp.created = info.created;
    if (info.description) grp.description = info.description;
    if (info.publicEntryAllowed != null) grp.publicEntryAllowed = info.publicEntryAllowed;
    if (info.owner && info.owner.id) {
      const ownerUser = ownerById[info.owner.id];
      grp.owner = {
        userId: info.owner.id,
        username: (ownerUser && (ownerUser.name || ownerUser.requestedUsername)) || (info.owner.username || null),
        displayName: (ownerUser && ownerUser.displayName) || null,
      };
    }
  }
}
async function getGames(userId) {
  const d = await jget(`https://games.roblox.com/v2/users/${userId}/games?accessFilter=Public&sortOrder=Asc&limit=50`);
  return (d && d.data) || [];
}
async function getNameHistory(userId) {
  const d = await jget(`https://users.roblox.com/v1/users/${userId}/username-history?limit=100&sortOrder=Asc`);
  return (d && d.data) || [];
}
async function getCurrentlyWearing(userId) {
  const d = await jget(`https://avatar.roblox.com/v1/users/${userId}/currently-wearing`);
  return (d && d.assetIds) || [];
}
async function getCanViewInventory(userId) {
  const d = await jget(`https://inventory.roblox.com/v1/users/${userId}/can-view-inventory`);
  if (!d) return null;
  return d.canView;
}

// The classic "Verified, Bonafide, Plaidafied" hat (asset 102611803), given to
// every account that verified their email back when Roblox handed it out, is
// the canonical way to confirm an account had a verified email.
// Returns true if owned, false if not, or null if the inventory is private /
// the request failed (so callers can show "Unknown" instead of lying).
const VERIFIED_EMAIL_HAT_ID = 102611803;
async function hasVerifiedEmailHat(userId) {
  try {
    const r = await fetch(
      `https://inventory.roblox.com/v1/users/${userId}/items/Asset/${VERIFIED_EMAIL_HAT_ID}`,
      { headers: UA, timeout: 10000 },
    );
    if (!r.ok) return null; // 403 = private inventory, anything else = unknown
    const d = await r.json();
    if (!d || !Array.isArray(d.data)) return null;
    return d.data.length > 0;
  } catch {
    return null;
  }
}
async function getAssetDetails(assetIds) {
  if (!assetIds.length) return [];
  const out = [];
  for (let i = 0; i < assetIds.length; i += 50) {
    const chunk = assetIds.slice(i, i + 50);
    const items = chunk.map((id) => ({ itemType: 'Asset', id }));
    const d = await jpost('https://catalog.roblox.com/v1/catalog/items/details', { items });
    if (d && d.data) out.push(...d.data);
  }
  return out;
}
async function getRobloxBadges(userId) {
  const d = await jget(`https://accountinformation.roblox.com/v1/users/${userId}/roblox-badges`);
  return d || [];
}
async function getRolimons(userId) {
  return await jget(`https://api.rolimons.com/players/v1/playerinfo/${userId}`);
}
async function getGameThumbs(universeIds) {
  if (!universeIds.length) return {};
  const map = {};
  for (let attempt = 0; attempt < 3; attempt++) {
    const d = await jget(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeIds.join(',')}&size=150x150&format=Png&isCircular=false`);
    if (!d || !d.data) return map;
    let allDone = true;
    for (const t of d.data) {
      if (map[t.targetId]) continue;
      if (t.state === 'Completed' && t.imageUrl) map[t.targetId] = t.imageUrl;
      else if (t.state !== 'Blocked' && t.state !== 'Error') allDone = false;
    }
    if (allDone) break;
    if (attempt < 2) await new Promise(r => setTimeout(r, 1200));
  }
  return map;
}

// ---------- Format helpers ----------
function fmtNum(n) {
  if (n === null || n === undefined) return 'N/A';
  return Number(n).toLocaleString('en-US');
}
function fmtDate(d) {
  if (!d) return 'N/A';
  return moment(d).format('MMMM D, YYYY [at] h:mm A');
}
function statusFromPresence(p) {
  if (!p) return 'Offline';
  switch (p.userPresenceType) {
    case 0: return 'Offline';
    case 1: return 'Online';
    case 2: return 'In-Game';
    case 3: return 'In Studio';
    case 4: return 'Invisible';
    default: return 'Offline';
  }
}

// ---------- Custom-emoji lookup (application-owned, uploaded to the bot) ----------
// Resolve by the current application emoji name instead of hardcoded IDs. IDs
// change whenever an emoji is replaced, which previously caused Discord to show
// raw names such as :language: and :combat_initiation:.
function applicationEmoji(name, client) {
  return client?.application?.emojis?.cache?.find((emoji) => emoji.name === name) || null;
}

function configuredEmojiTag(name) {
  const live = global.botEmojis?.[name];
  if (typeof live === 'string' && live) return live;
  try {
    const configured = require('../emojis.json')[name];
    return typeof configured === 'string' ? configured : '';
  } catch {
    return '';
  }
}

function parseCustomEmojiTag(tag) {
  const match = /^<(a)?:([A-Za-z0-9_]+):(\d+)>$/.exec(tag || '');
  return match ? { animated: Boolean(match[1]), name: match[2], id: match[3] } : null;
}

function appEmojiObj(name, client, fallback = null) {
  const live = applicationEmoji(name, client);
  if (live) return { id: live.id, name: live.name, animated: Boolean(live.animated) };
  return parseCustomEmojiTag(configuredEmojiTag(name)) || fallback;
}

function appEmojiStr(name, fallback = '', client) {
  const live = applicationEmoji(name, client);
  if (live) return `<${live.animated ? 'a' : ''}:${live.name}:${live.id}>`;
  return configuredEmojiTag(name) || fallback;
}

// Roblox player-badge ID -> application emoji name.
const BADGE_EMOJIS = {
  1: 'administrator',
  2: 'friendship',
  3: 'combat_initiation',
  4: 'warrior',
  5: 'bloxxer',
  6: 'homestead',
  7: 'bricksmith',
  8: 'inviter',
  12: 'veteran',
  17: 'official_model_maker',
  18: 'welcome_to_the_club',
};
function badgeEmojiStr(badge, client) {
  const name = BADGE_EMOJIS[badge.id];
  return name ? appEmojiStr(name, `\`${badge.name}\``, client) : `\`${badge.name}\``;
}

// Maps view value -> { label, emojiName, fallbackEmoji }
const VIEWS = {
  profile:   { label: 'User Profile',       emojiName: 'profile',   fallback: '👤' },
  avatar:    { label: 'Avatar',             emojiName: 'avatar',    fallback: '🧍' },
  groups:    { label: 'Groups',             emojiName: 'groups',    fallback: '👥' },
  games:     { label: 'Games',              emojiName: 'games',     fallback: '🎮' },
  wearing:   { label: 'Currently Wearing',  emojiName: 'inventory', fallback: '👕' },
  names:     { label: 'Previous Usernames', emojiName: 'names',     fallback: '🕘' },
  friends:   { label: 'Friends',            emojiName: 'friends',   fallback: '🧑‍🤝‍🧑' },
  followers: { label: 'Followers',          emojiName: 'followers', fallback: '🌟' },
  following: { label: 'Following',          emojiName: 'following', fallback: '➡️' },
  rolimons:  { label: 'Rolimons',           emojiName: 'roblox',    fallback: '💎' },
};

// ---------- UI: Select / Pager / Links ----------
function buildSelect(guild, active, client) {
  const options = Object.entries(VIEWS).map(([value, v]) => {
    const eo = appEmojiObj(v.emojiName, client, v.fallback);
    return {
      label: v.label,
      value,
      emoji: eo || v.fallback,
      default: value === active,
    };
  });
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('rblx_view')
      .setPlaceholder(VIEWS[active]?.label || 'View')
      .addOptions(options)
  );
}

function buildPager(page, totalPages, client) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('rblx_prev').setStyle(ButtonStyle.Primary).setEmoji(appEmojiObj('previous', client, '◀️')).setDisabled(totalPages <= 1),
    new ButtonBuilder().setCustomId('rblx_next').setStyle(ButtonStyle.Primary).setEmoji(appEmojiObj('next', client, '▶️')).setDisabled(totalPages <= 1),
    new ButtonBuilder().setCustomId('rblx_nav').setStyle(ButtonStyle.Secondary).setEmoji(appEmojiObj('navigate', client, '🔢')).setDisabled(totalPages <= 1),
    new ButtonBuilder().setCustomId('rblx_close').setStyle(ButtonStyle.Danger).setEmoji(appEmojiObj('cancel', client, '✖️'))
  );
}

function buildLinkRow(userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Profile').setURL(`https://www.roblox.com/users/${userId}/profile`),
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Rolimon's").setURL(`https://www.rolimons.com/player/${userId}`)
  );
}

// ---------- Components V2 helpers ----------
function colorToInt(c) {
  if (typeof c === 'number') return c >>> 0;
  if (typeof c === 'string') {
    const m = c.replace(/^#/, '');
    const n = parseInt(m, 16);
    if (!Number.isNaN(n)) return n;
  }
  return 0xFFFFFF;
}

// Convert any EmbedBuilder (or built embed) into a ContainerBuilder so we can
// keep all of our existing embed authoring code while shipping the message
// using Components V2. The conversion mirrors common embed pieces: title,
// author, description (alongside thumbnail as a section accessory), fields,
// image as a media gallery, and footer as small text below a separator.
function embedToContainer(embedLike) {
  const data = embedLike?.data || embedLike || {};
  const c = new ContainerBuilder();
  if (data.color != null) c.setAccentColor(colorToInt(data.color));

  const headerBits = [];
  if (data.author?.name) headerBits.push(data.author.name);
  if (data.title) headerBits.push(data.title);
  if (headerBits.length) {
    c.addTextDisplayComponents((td) => td.setContent(`**${headerBits.join(' • ')}**`));
  }

  const desc = data.description || '';
  const thumb = data.thumbnail?.url;
  if (thumb && desc) {
    c.addSectionComponents((s) =>
      s.addTextDisplayComponents((td) => td.setContent(desc))
       .setThumbnailAccessory((t) => t.setURL(thumb))
    );
  } else if (desc) {
    c.addTextDisplayComponents((td) => td.setContent(desc));
  } else if (thumb) {
    c.addMediaGalleryComponents((g) => g.addItems((i) => i.setURL(thumb)));
  }

  if (Array.isArray(data.fields) && data.fields.length) {
    for (const f of data.fields) {
      c.addTextDisplayComponents((td) => td.setContent(`**${f.name}**\n${f.value}`));
    }
  }

  if (data.image?.url) {
    c.addMediaGalleryComponents((g) => g.addItems((i) => i.setURL(data.image.url)));
  }

  if (data.footer?.text) {
    c.addSeparatorComponents((s) => s);
    c.addTextDisplayComponents((td) => td.setContent(`-# ${data.footer.text}`));
  }

  return c;
}

function buildSimpleContainer(text, accent) {
  return new ContainerBuilder()
    .setAccentColor(colorToInt(accent || color))
    .addTextDisplayComponents((td) => td.setContent(text));
}

// ---------- Embeds ----------
function userLink(user) {
  return `https://www.roblox.com/users/${user.id}/profile`;
}
function userMention(user) {
  return `[${user.displayName || user.name}](${userLink(user)})`;
}
function userHandle(user) {
  return `[@${user.name}](${userLink(user)})`;
}

async function buildProfileEmbed(ctx) {
  const {
    guild, user, presence, friendCount, followerCount, followingCount,
    rolimons, badges, headshot, totalVisits, canViewInventory,
    hasVerifiedEmail,
  } = ctx;

  const emailVerified =
    hasVerifiedEmail === true ? 'True'
    : hasVerifiedEmail === false ? 'False'
    : 'Unknown';
  const inventory =
    canViewInventory === true ? 'Public'
    : canViewInventory === false ? 'Private'
    : 'Unknown';

  const friendsLink = `https://www.roblox.com/users/${user.id}/friends`;
  const followersLink = `https://www.roblox.com/users/${user.id}/friends#!/followers`;
  const followingLink = `https://www.roblox.com/users/${user.id}/friends#!/following`;
  const rolimonsLink = `https://www.rolimons.com/player/${user.id}`;
  const langEmoji = appEmojiStr('language', '🌐', ctx.client);

  const lines = [];
  lines.push(`**User:** ${userMention(user)} ${user.hasVerifiedBadge ? '☑️' : ''}`);
  lines.push(`(${userHandle(user)})`);
  lines.push(`**ID:** \`${user.id}\``);
  lines.push(`**Status:** ${statusFromPresence(presence)}`);
  lines.push(`**Inventory:** ${inventory}`);
  lines.push(`**Email Verified:** ${emailVerified}`);
  lines.push(`${langEmoji} **Language:** ${user.locale || 'English (US)'}`);
  lines.push('');
  lines.push(
    `[**${fmtNum(friendCount)}**](${friendsLink}) Friends • ` +
    `[**${fmtNum(followerCount)}**](${followersLink}) Followers • ` +
    `[**${fmtNum(followingCount)}**](${followingLink}) Following`
  );
  if (rolimons && rolimons.success !== false) {
    const rap = rolimons.rap ?? rolimons.RAP;
    const value = rolimons.value ?? rolimons.Value;
    if (rap !== undefined || value !== undefined) {
      lines.push(`[**${fmtNum(rap)}**](${rolimonsLink}) RAP • [**${fmtNum(value)}**](${rolimonsLink}) Value`);
    }
  }
  lines.push('');
  if (user.description) {
    lines.push(user.description.slice(0, 400));
    lines.push('');
  }
  lines.push(`**Created:** ${fmtDate(user.created)} (${moment(user.created).fromNow(true)} ago)`);
  lines.push(`**Visits:** ${fmtNum(totalVisits)}`);
  if (badges && Array.isArray(badges) && badges.length) {
    lines.push(`**Badges (${badges.length}):** ${badges.map((badge) => badgeEmojiStr(badge, ctx.client)).join(' ')}`);
  } else {
    lines.push(`**Badges (0):** None`);
  }

  return new EmbedBuilder()
    .setColor(color)
    .setDescription(lines.join('\n'))
    .setThumbnail(headshot || null);
}

function buildAvatarEmbed(guild, user, fullBody, headshot) {
  const img = fullBody || headshot;
  const e = new EmbedBuilder()
    .setColor(color)
    .setDescription(`${userMention(user)}\n(${userHandle(user)})`);
  if (img) e.setImage(img);
  else e.setDescription(`${userMention(user)}\n(${userHandle(user)})\n\nAvatar image is currently unavailable from Roblox. Try again in a moment.`);
  return e;
}

function buildGroupEmbed(guild, user, groups, page) {
  const total = groups.length;
  if (!total) {
    return new EmbedBuilder()
      .setColor(color)
      .setDescription(`${userHandle(user)}'s Joined Groups (0)\n\nNo groups.`);
  }
  const g = groups[page];
  const grp = g.group || {};
  const role = g.role || {};
  const ownerName = grp.owner ? grp.owner.username : null;
  const ownerId = grp.owner ? grp.owner.userId : null;
  const ownerStr = ownerName && ownerId
    ? `[${ownerName}](https://www.roblox.com/users/${ownerId}/profile)`
    : (ownerName || 'N/A');

  const groupLink = grp.id ? `https://www.roblox.com/groups/${grp.id}` : null;
  const titleLine = groupLink ? `[**${grp.name || 'Group'}**](${groupLink})` : `**${grp.name || 'Group'}**`;

  const lines = [
    titleLine,
    `${userHandle(user)}'s Joined Groups (${total})`,
    grp.description ? `*${grp.description.split('\n')[0].slice(0, 80)}*` : '',
    '',
    `**Owner:** ${ownerStr}`,
    `**Members:** ${fmtNum(grp.memberCount)}`,
    `**Public:** ${grp.publicEntryAllowed ? 'True' : 'False'}`,
    `**Group ID:** ${grp.id}`,
    grp.created ? `**Created:** ${moment(grp.created).format('MMMM D, YYYY')}` : '',
    '',
    `**Role:** ${role.name || 'N/A'}`,
    `**Rank:** ${role.rank ?? 'N/A'}`,
    `**Role ID:** ${role.id ?? 'N/A'}`,
  ].filter(Boolean);

  return new EmbedBuilder()
    .setColor(color)
    .setDescription(lines.join('\n'))
    .setFooter({ text: `Page ${page + 1}/${total}` });
}

function buildGamesEmbed(guild, user, games, page, thumbs) {
  const totalPages = Math.max(1, games.length);
  const e = new EmbedBuilder()
    .setColor(color)
    .setFooter({ text: `Page ${page + 1}/${totalPages}` });
  if (!games.length) {
    return e.setDescription(`Games (0) — ${userHandle(user)}\n\nNo public games.`);
  }
  const g = games[page];
  const placeId = g.rootPlace?.id || g.id;
  const gameLink = placeId ? `https://www.roblox.com/games/${placeId}` : null;
  const title = gameLink ? `[**${g.name || 'Untitled'}**](${gameLink})` : `**${g.name || 'Untitled'}**`;

  const desc = [
    `Games (${games.length}) — ${userHandle(user)}`,
    '',
    title,
    g.description ? g.description.slice(0, 300) : '',
    '',
    `\`${fmtNum(g.placeVisits ?? 0)} visits\``,
    `Created ${fmtDate(g.created)}`,
    `Updated ${fmtDate(g.updated)}`,
  ].filter(Boolean).join('\n');

  e.setDescription(desc);
  if (thumbs[g.id]) e.setThumbnail(thumbs[g.id]);
  return e;
}

function buildWearingEmbed(guild, user, assets, page) {
  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(assets.length / perPage));
  const slice = assets.slice(page * perPage, page * perPage + perPage);
  const desc = slice.length
    ? [
        `Currently Wearing (${assets.length}) — ${userHandle(user)}`,
        '',
        slice.map((a) => `• [${a.name || 'Asset'}](https://www.roblox.com/catalog/${a.id}) \`${a.id}\``).join('\n'),
      ].join('\n')
    : `Currently Wearing (0) — ${userHandle(user)}\n\nWearing nothing visible.`;
  return new EmbedBuilder()
    .setColor(color)
    .setDescription(desc)
    .setFooter({ text: `Page ${page + 1}/${totalPages}` });
}

function buildNamesEmbed(guild, user, names, page) {
  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(names.length / perPage));
  const slice = names.slice(page * perPage, page * perPage + perPage);
  const header = `${userMention(user)}\n(${userHandle(user)})\n`;
  if (!names.length) {
    return new EmbedBuilder()
      .setColor(color)
      .setDescription(`${header}\nThis user has no past usernames.`);
  }
  return new EmbedBuilder()
    .setColor(color)
    .setDescription(`${header}\n${slice.map((n) => `• ${n.name}`).join('\n')}`)
    .setFooter({ text: `Page ${page + 1}/${totalPages}` });
}

// Builds a single Components V2 Container for a friends/followers/following
// page. Each person becomes a Section with the person's text + their headshot
// as a thumbnail accessory, separated by horizontal lines — matching the
// "all in one embed" layout the user requested.
async function buildPeopleContainer(guild, user, people, page, label, total, headshots) {
  const perPage = 5;
  const totalPages = Math.max(1, Math.ceil(people.length / perPage));
  const slice = people.slice(page * perPage, page * perPage + perPage);
  const header = `**${label} (${fmtNum(total)})** — ${userHandle(user)}`;

  const container = new ContainerBuilder().setAccentColor(colorToInt(color));
  container.addTextDisplayComponents((td) => td.setContent(header));

  if (!slice.length) {
    let emptyText;
    if (label === 'Friends') emptyText = 'This user has no friends.';
    else if (label === 'Followers') emptyText = 'This user has no followers.';
    else if (label === 'Following') emptyText = 'This user is not following anyone.';
    else emptyText = 'Nobody to show.';
    container.addSeparatorComponents((s) => s);
    container.addTextDisplayComponents((td) => td.setContent(emptyText));
    return container;
  }

  // Lazily fetch any missing headshots for this page so pagination still works.
  const need = slice.map((p) => p.id).filter((id) => !(headshots && headshots[id]));
  if (need.length) {
    try {
      const got = await getHeadshotsBatch(need);
      Object.assign(headshots, got);
    } catch { /* keep going without thumbnails */ }
  }

  for (const p of slice) {
    container.addSeparatorComponents((s) => s);
    const link = `https://www.roblox.com/users/${p.id}/profile`;
    const text = [
      `[**${p.displayName || p.name}**](${link}) [@${p.name}](${link})`,
      `\`${p.id}\``,
    ].join('\n');
    const thumbUrl = headshots && headshots[p.id];
    if (thumbUrl) {
      container.addSectionComponents((s) =>
        s.addTextDisplayComponents((td) => td.setContent(text))
         .setThumbnailAccessory((t) => t.setURL(thumbUrl))
      );
    } else {
      container.addTextDisplayComponents((td) => td.setContent(text));
    }
  }

  container.addSeparatorComponents((s) => s);
  container.addTextDisplayComponents((td) => td.setContent(`-# Page ${page + 1}/${totalPages}`));
  return container;
}

function buildRolimonsEmbed(guild, user, rolimons) {
  const link = `https://www.rolimons.com/player/${user.id}`;
  const e = new EmbedBuilder()
    .setColor(color)
    .setThumbnail(ROLIMONS_LOGO);

  const header = `[**${user.displayName || user.name}**](${link})\ncached by rolimons.com`;

  if (!rolimons || rolimons.success === false) {
    e.setDescription(`${header}\n\nRolimon's data unavailable for this user.`);
    return e;
  }
  const rap = rolimons.rap ?? rolimons.RAP;
  const value = rolimons.value ?? rolimons.Value;
  const limiteds = (rolimons.limiteds && Object.keys(rolimons.limiteds).length) || rolimons.limiteds_count || 0;
  const isPrivate = rolimons.privateinventory ?? rolimons.private ?? false;
  const isPremium = rolimons.premium ?? false;
  e.setDescription(
    `${header}\n\n` +
    [
      `**RAP:** \`${fmtNum(rap)}\` R$`,
      `**Value:** \`${fmtNum(value)}\` R$`,
      `**Limiteds:** \`${fmtNum(limiteds)}\``,
      `**Private:** \`${isPrivate ? 'True' : 'False'}\``,
      `**Premium:** \`${isPremium ? 'True' : 'False'}\``,
    ].join('\n')
  );
  return e;
}

// ---------- Command ----------
module.exports = {
  category: 'utility',
  help: [
    {
      name: 'roblox',
      description: 'Look up a Roblox user — profile, avatar, groups, games, wearing, name history, friends, followers, following, Rolimon\'s.',
      aliases: 'rblx, robloxuser, rbx',
      parameters: '(username|userId)',
      information: 'Uses public Roblox APIs and Rolimon\'s — no API key required.',
      usage: 'roblox (username|userId)',
      example: 'roblox builderman',
    },
  ],
  name: 'roblox',
  aliases: ['rblx', 'robloxuser', 'rbx'],

  run: async (client, message, args) => {
    if (!args[0]) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Provide a Roblox username or user ID. \`,roblox builderman\``)],
      });
    }

    const query = args.join(' ').trim();
    const scanEmoji = appEmojiStr('loading', '⏳', client);
    // Roblox supports a username-based redirect URL, so we can hyperlink
    // the query immediately even before we've resolved the numeric ID.
    const queryLink = `https://www.roblox.com/user.aspx?username=${encodeURIComponent(query)}`;
    // The whole interactive lifecycle uses Components V2, so the initial
    // "scanning" message must also be created with the V2 flag — otherwise
    // we wouldn't be able to swap in V2 components on later edits.
    const thinking = await message.channel.send({
      components: [buildSimpleContainer(`${scanEmoji} scanning [**${query}**](${queryLink})'s Roblox profile..`, color)],
      flags: MessageFlags.IsComponentsV2,
    });

    const user = await resolveUser(query);
    if (!user || !user.id) {
      return thinking.edit({
        components: [buildSimpleContainer(`${warn} ${message.author}: No Roblox user found for \`${query}\`.`, '#efa23a')],
      });
    }

    // Now that we know the real user, update the scanning line with the
    // proper display name + handle hyperlinked to the actual profile.
    thinking.edit({
      components: [buildSimpleContainer(`${scanEmoji} scanning ${userMention(user)} (${userHandle(user)})'s Roblox profile..`, color)],
    }).catch(() => {});

    const [
      headshot, fullBody, presence,
      friendCount, followerCount, followingCount,
      groups, games, names, friends, followers, following,
      wearingIds, badges, rolimons, canViewInventory, hasVerifiedEmail,
    ] = await Promise.all([
      getAvatarHeadshot(user.id),
      getAvatarThumb(user.id),
      getPresence(user.id),
      getFriendCount(user.id),
      getFollowerCount(user.id),
      getFollowingCount(user.id),
      getGroups(user.id),
      getGames(user.id),
      getNameHistory(user.id),
      getFriends(user.id),
      getFollowers(user.id),
      getFollowing(user.id),
      getCurrentlyWearing(user.id),
      getRobloxBadges(user.id),
      getRolimons(user.id),
      getCanViewInventory(user.id),
      hasVerifiedEmailHat(user.id),
    ]);

    const wearingDetails = await getAssetDetails(wearingIds);
    const totalVisits = games.reduce((s, g) => s + (g.placeVisits || 0), 0);
    const gameThumbs = await getGameThumbs(games.map((g) => g.id).filter(Boolean));
    // Backfill group owner / member count / created — the user-groups endpoint omits these.
    await enrichGroupsWithOwners(groups);

    // Pre-fetch headshots for the first page of friends/followers/following so the
    // person embed can show one as a thumbnail.
    const peopleHeadshots = await getHeadshotsBatch(
      [...new Set([
        ...friends.slice(0, 5).map((p) => p.id),
        ...followers.slice(0, 5).map((p) => p.id),
        ...following.slice(0, 5).map((p) => p.id),
      ])]
    );

    const ctx = {
      guild: message.guild,
      user, presence, friendCount, followerCount, followingCount, rolimons, badges,
      headshot, fullBody, totalVisits, canViewInventory, hasVerifiedEmail, client,
      groups, games, names, friends, followers, following,
      wearingDetails, gameThumbs, peopleHeadshots,
    };

    const state = { view: 'profile', page: 0 };

    // Build the message body as Components V2 Containers. People views build
    // their container natively (one Container with a Section per person);
    // every other view still uses our existing EmbedBuilder code and gets
    // converted to a Container via embedToContainer so the whole message can
    // ship under one consistent V2 flag.
    const embedFor = async () => {
      switch (state.view) {
        case 'friends':
          return [await buildPeopleContainer(message.guild, user, ctx.friends,   state.page, 'Friends',   ctx.friends.length, ctx.peopleHeadshots)];
        case 'followers':
          return [await buildPeopleContainer(message.guild, user, ctx.followers, state.page, 'Followers', followerCount,      ctx.peopleHeadshots)];
        case 'following':
          return [await buildPeopleContainer(message.guild, user, ctx.following, state.page, 'Following', followingCount,     ctx.peopleHeadshots)];
        case 'profile':   return [embedToContainer(await buildProfileEmbed(ctx))];
        case 'avatar':    return [embedToContainer(buildAvatarEmbed(message.guild, user, fullBody, headshot))];
        case 'groups':    return [embedToContainer(buildGroupEmbed(message.guild, user, ctx.groups, state.page))];
        case 'games':     return [embedToContainer(buildGamesEmbed(message.guild, user, ctx.games, state.page, ctx.gameThumbs))];
        case 'wearing':   return [embedToContainer(buildWearingEmbed(message.guild, user, ctx.wearingDetails, state.page))];
        case 'names':     return [embedToContainer(buildNamesEmbed(message.guild, user, ctx.names, state.page))];
        case 'rolimons':  return [embedToContainer(buildRolimonsEmbed(message.guild, user, rolimons))];
        default:          return [embedToContainer(await buildProfileEmbed(ctx))];
      }
    };

    const pageInfo = () => {
      switch (state.view) {
        case 'groups':    return { total: ctx.groups.length };
        case 'games':     return { total: Math.max(1, ctx.games.length) };
        case 'wearing':   return { total: Math.max(1, Math.ceil(ctx.wearingDetails.length / 10)) };
        case 'names':     return { total: Math.max(1, Math.ceil(ctx.names.length / 10)) };
        case 'friends':   return { total: Math.max(1, Math.ceil(ctx.friends.length / 5)) };
        case 'followers': return { total: Math.max(1, Math.ceil(ctx.followers.length / 5)) };
        case 'following': return { total: Math.max(1, Math.ceil(ctx.following.length / 5)) };
        default: return { total: 1 };
      }
    };

    const components = () => {
      const pi = pageInfo();
      const rows = [];
      rows.push(buildSelect(message.guild, state.view, client));
      if (pi.total > 1) rows.push(buildPager(state.page, pi.total, client));
      return rows;
    };

    // The thinking message was created with IsComponentsV2, so each edit
    // simply replaces the components array (the flag is sticky and may not
    // be removed). Container body + select/pager rows live side-by-side at
    // the top level of the message.
    await thinking.edit({ components: [...(await embedFor()), ...components()] });

    const collector = thinking.createMessageComponentCollector({ time: 5 * 60 * 1000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: 'Only the command runner can use these controls.', ephemeral: true }).catch(() => {});
      }
      if (i.customId === 'rblx_nav') {
        try { await i.reply({ content: '🔢 What **page** would you like to skip to?', ephemeral: true }); } catch {}
        const filter = (m) => m.author.id === message.author.id && m.channel.id === message.channel.id && /^\d+$/.test(m.content.trim());
        try {
          const collected = await message.channel.awaitMessages({ filter, max: 1, time: 30_000, errors: ['time'] });
          const userMsg = collected.first();
          const num = parseInt(userMsg.content.trim(), 10);
          userMsg.delete().catch(() => {});
          const total = pageInfo().total;
          if (num >= 1 && num <= total) state.page = num - 1;
        } catch {}
        try { await i.deleteReply(); } catch {}
        await thinking.edit({ components: [...(await embedFor()), ...components()] }).catch(() => {});
        return;
      }
      try {
        if (i.customId === 'rblx_view' && i.componentType === ComponentType.StringSelect) {
          state.view = i.values[0];
          state.page = 0;
        } else if (i.customId === 'rblx_prev') {
          const total = pageInfo().total;
          state.page = (state.page - 1 + total) % total;
        } else if (i.customId === 'rblx_next') {
          const total = pageInfo().total;
          state.page = (state.page + 1) % total;
        } else if (i.customId === 'rblx_close') {
          collector.stop('closed');
          await i.deferUpdate().catch(() => {});
          return thinking.delete().catch(() => {});
        }
        await i.update({ components: [...(await embedFor()), ...components()] });
      } catch (e) {
        try { await i.followUp({ content: 'Something went wrong updating the view.', ephemeral: true }); } catch {}
      }
    });

    collector.on('end', async () => {
      try { await thinking.edit({ components: [] }); } catch {}
    });
  },
};
