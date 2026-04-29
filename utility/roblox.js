const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ComponentType,
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
// These work in every server the bot is in — no per-server upload needed.
const APP_EMOJIS = {
  profile:   '1498894231668916284',
  avatar:    '1498894235540263003',
  groups:    '1498894239541628928',
  games:     '1498894243140337735',
  inventory: '1498894247569391736',
  names:     '1498894251646390424',
  friends:   '1498894256570368060',
  followers: '1498894260538441749',
  following: '1498894264778883082',
  roblox:    '1498894268511813684',
  language:  '1498894272550670406',
  trash:     '1498894276447436872',
};
function appEmojiObj(name) {
  const id = APP_EMOJIS[name];
  return id ? { id, name, animated: false } : null;
}
function appEmojiStr(name, fallback = '') {
  const id = APP_EMOJIS[name];
  return id ? `<:${name}:${id}>` : fallback;
}

// Roblox player-badge ID -> bot emoji
const BADGE_EMOJIS = {
  1:  { name: 'administrator',        id: '1498897160513654795' },
  2:  { name: 'friendship',           id: '1498897178360418365' },
  3:  { name: 'combat_initiation',    id: '1498897173960593429' },
  4:  { name: 'warrior',              id: '1498897200552476722' },
  5:  { name: 'bloxxer',              id: '1498897165169197057' },
  6:  { name: 'homestead',            id: '1498897183083073607' },
  7:  { name: 'bricksmith',           id: '1498897169665757235' },
  8:  { name: 'inviter',              id: '1498897187466383550' },
  12: { name: 'veteran',              id: '1498897196169433180' },
  17: { name: 'official_model_maker', id: '1498897191761084507' },
  18: { name: 'welcome_to_the_club',  id: '1498897205283651754' },
};
function badgeEmojiStr(badge) {
  const e = BADGE_EMOJIS[badge.id];
  return e ? `<:${e.name}:${e.id}>` : `\`${badge.name}\``;
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
function buildSelect(guild, active) {
  const options = Object.entries(VIEWS).map(([value, v]) => {
    const eo = appEmojiObj(v.emojiName);
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

const PAGER_EMOJIS = {
  prev:  { id: '1496728326608388096', name: 'previous' },
  next:  { id: '1496728324414767266', name: 'next' },
  nav:   { id: '1496728322120613931', name: 'navigate' },
  close: { id: '1498895660303257742', name: 'emoji_2', animated: false },
};

function buildPager(page, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('rblx_prev').setStyle(ButtonStyle.Primary).setEmoji(PAGER_EMOJIS.prev).setDisabled(totalPages <= 1),
    new ButtonBuilder().setCustomId('rblx_next').setStyle(ButtonStyle.Primary).setEmoji(PAGER_EMOJIS.next).setDisabled(totalPages <= 1),
    new ButtonBuilder().setCustomId('rblx_nav').setStyle(ButtonStyle.Secondary).setEmoji(PAGER_EMOJIS.nav).setDisabled(totalPages <= 1),
    new ButtonBuilder().setCustomId('rblx_close').setStyle(ButtonStyle.Danger).setEmoji(PAGER_EMOJIS.close)
  );
}

function buildLinkRow(userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Profile').setURL(`https://www.roblox.com/users/${userId}/profile`),
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Rolimon's").setURL(`https://www.rolimons.com/player/${userId}`)
  );
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
  const langEmoji = appEmojiStr('language', '🌐');

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
    lines.push(`**Badges (${badges.length}):** ${badges.map(badgeEmojiStr).join(' ')}`);
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

function buildPeopleEmbed(guild, user, people, page, label, total, headshots) {
  const perPage = 5;
  const totalPages = Math.max(1, Math.ceil(people.length / perPage));
  const slice = people.slice(page * perPage, page * perPage + perPage);
  const header = `**${label} (${fmtNum(total)})** — ${userHandle(user)}`;
  if (!slice.length) {
    let emptyText;
    if (label === 'Friends') emptyText = 'This user has no friends.';
    else if (label === 'Followers') emptyText = 'This user has no followers.';
    else if (label === 'Following') emptyText = 'This user is not following anyone.';
    else emptyText = 'Nobody to show.';
    return new EmbedBuilder().setColor(color).setDescription(`${header}\n\n${emptyText}`);
  }
  const lines = slice.map((p) => {
    const link = `https://www.roblox.com/users/${p.id}/profile`;
    return [
      `[**${p.displayName || p.name}**](${link}) [@${p.name}](${link})`,
      `\`${p.id}\``,
    ].join('\n');
  });
  const e = new EmbedBuilder()
    .setColor(color)
    .setDescription(`${header}\n\n${lines.join('\n\n')}`)
    .setFooter({ text: `Page ${page + 1}/${totalPages}` });
  // Show first person's headshot as the embed thumbnail
  const firstId = slice[0].id;
  if (headshots && headshots[firstId]) e.setThumbnail(headshots[firstId]);
  return e;
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
    const scanEmoji = '<a:loading:1496708542676074667>';
    const thinking = await message.channel.send({
      embeds: [new EmbedBuilder().setColor(color).setDescription(`${scanEmoji} scanning **${query}**'s Roblox profile..`)],
    });

    const user = await resolveUser(query);
    if (!user || !user.id) {
      return thinking.edit({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: No Roblox user found for \`${query}\`.`)],
      });
    }

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
      headshot, fullBody, totalVisits, canViewInventory, hasVerifiedEmail,
      groups, games, names, friends, followers, following,
      wearingDetails, gameThumbs, peopleHeadshots,
    };

    const state = { view: 'profile', page: 0 };

    const embedFor = async () => {
      switch (state.view) {
        case 'profile':   return await buildProfileEmbed(ctx);
        case 'avatar':    return buildAvatarEmbed(message.guild, user, fullBody, headshot);
        case 'groups':    return buildGroupEmbed(message.guild, user, ctx.groups, state.page);
        case 'games':     return buildGamesEmbed(message.guild, user, ctx.games, state.page, ctx.gameThumbs);
        case 'wearing':   return buildWearingEmbed(message.guild, user, ctx.wearingDetails, state.page);
        case 'names':     return buildNamesEmbed(message.guild, user, ctx.names, state.page);
        case 'friends':   return buildPeopleEmbed(message.guild, user, ctx.friends, state.page, 'Friends', ctx.friends.length, ctx.peopleHeadshots);
        case 'followers': return buildPeopleEmbed(message.guild, user, ctx.followers, state.page, 'Followers', followerCount, ctx.peopleHeadshots);
        case 'following': return buildPeopleEmbed(message.guild, user, ctx.following, state.page, 'Following', followingCount, ctx.peopleHeadshots);
        case 'rolimons':  return buildRolimonsEmbed(message.guild, user, rolimons);
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
      rows.push(buildSelect(message.guild, state.view));
      if (pi.total > 1) rows.push(buildPager(state.page, pi.total));
      return rows;
    };

    await thinking.edit({ embeds: [await embedFor()], components: components() });

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
        await thinking.edit({ embeds: [await embedFor()], components: components() }).catch(() => {});
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
          return i.update({ components: [] }).catch(() => {});
        }
        await i.update({ embeds: [await embedFor()], components: components() });
      } catch (e) {
        try { await i.followUp({ content: 'Something went wrong updating the view.', ephemeral: true }); } catch {}
      }
    });

    collector.on('end', async () => {
      try { await thinking.edit({ components: [] }); } catch {}
    });
  },
};
