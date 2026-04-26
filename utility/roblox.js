const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const moment = require('moment');
const { color } = require('../config.json');

function getEmojis() {
  try { delete require.cache[require.resolve('../emojis.json')]; return require('../emojis.json'); } catch { return {}; }
}
function warn(message, text) {
  const e = getEmojis();
  return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${e.warn || '⚠️'} ${message.author}: ${text}`)] });
}
function deny(message, text) {
  const e = getEmojis();
  return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${e.deny || '❌'} ${message.author}: ${text}`)] });
}

const UA = 'drown-bot';

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, timeout: 10000 });
  if (!res.ok) {
    if (res.status === 404) throw new Error('Not found');
    throw new Error(`API returned ${res.status}`);
  }
  return res.json();
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'User-Agent': UA, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    timeout: 10000,
  });
  if (!res.ok) throw new Error(`API returned ${res.status}`);
  return res.json();
}

function fmtNum(n) {
  if (n === null || n === undefined) return 'N/A';
  return Number(n).toLocaleString('en-US');
}
function fmtDate(d) {
  if (!d) return 'N/A';
  return moment(d).format('MMMM D, YYYY [at] h:mm A');
}

async function resolveUser(input) {
  if (/^\d+$/.test(input)) {
    try {
      const u = await getJson(`https://users.roblox.com/v1/users/${input}`);
      if (u && u.id) return u;
    } catch {}
  }
  let data;
  try {
    data = await postJson('https://users.roblox.com/v1/usernames/users', { usernames: [input], excludeBannedUsers: false });
  } catch { return null; }
  const hit = data && data.data && data.data[0];
  if (!hit) return null;
  try { return await getJson(`https://users.roblox.com/v1/users/${hit.id}`); } catch { return null; }
}

const SUBCOMMANDS = {
  help: 'Show this menu',
  profile: 'User profile — `<username|id>`',
  avatar: 'Full-body avatar image — `<username|id>`',
  groups: 'Groups joined — `<username|id>`',
  games: 'Public games — `<username|id>`',
  wearing: 'Currently wearing assets — `<username|id>`',
  names: 'Past usernames — `<username|id>`',
  friends: 'Friends list — `<username|id>`',
  followers: 'Followers — `<username|id>`',
  following: 'Following — `<username|id>`',
  rolimons: "Rolimon's value/RAP — `<username|id>`",
};

const ALIASES = {
  user: 'profile', p: 'profile', info: 'profile',
  av: 'avatar', pfp: 'avatar',
  g: 'groups',
  game: 'games',
  outfit: 'wearing', wear: 'wearing',
  history: 'names', namehistory: 'names', past: 'names',
  f: 'friends',
  follower: 'followers',
  follow: 'following',
  rolimon: 'rolimons', value: 'rolimons', rap: 'rolimons',
  h: 'help', menu: 'help', commands: 'help',
};

async function showHelp(message) {
  const lines = Object.entries(SUBCOMMANDS).map(([cmd, desc]) => `\`,roblox ${cmd}\` — ${desc}`);
  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: 'Roblox — Subcommands', iconURL: 'https://www.roblox.com/favicon.ico' })
    .setDescription(lines.join('\n'))
    .setFooter({ text: 'Tip: ,roblox <username> still works as a shortcut for profile.' });
  return message.channel.send({ embeds: [embed] });
}

async function statusFromPresence(userId) {
  try {
    const d = await postJson('https://presence.roblox.com/v1/presence/users', { userIds: [Number(userId)] });
    const p = d && d.userPresences && d.userPresences[0];
    if (!p) return { status: 'Offline', lastOnline: null, lastLocation: null };
    const map = { 0: 'Offline', 1: 'Online', 2: 'In-Game', 3: 'In Studio', 4: 'Invisible' };
    return { status: map[p.userPresenceType] || 'Offline', lastOnline: p.lastOnline, lastLocation: p.lastLocation };
  } catch { return { status: 'Offline', lastOnline: null, lastLocation: null }; }
}

async function getThumb(url) {
  try {
    const d = await getJson(url);
    return d && d.data && d.data[0] && d.data[0].imageUrl;
  } catch { return null; }
}

async function runProfile(message, args) {
  const q = args.join(' ').trim();
  if (!q) return warn(message, 'Usage: `,roblox profile <username|id>`');
  const user = await resolveUser(q);
  if (!user) return warn(message, `No Roblox user found for **${q}**.`);

  const [headshot, presence, friendCount, followerCount, followingCount, rolimons, badges] = await Promise.all([
    getThumb(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${user.id}&size=150x150&format=Png&isCircular=false`),
    statusFromPresence(user.id),
    getJson(`https://friends.roblox.com/v1/users/${user.id}/friends/count`).then(d => d.count).catch(() => 0),
    getJson(`https://friends.roblox.com/v1/users/${user.id}/followers/count`).then(d => d.count).catch(() => 0),
    getJson(`https://friends.roblox.com/v1/users/${user.id}/followings/count`).then(d => d.count).catch(() => 0),
    getJson(`https://api.rolimons.com/players/v1/playerinfo/${user.id}`).catch(() => null),
    getJson(`https://accountinformation.roblox.com/v1/users/${user.id}/roblox-badges`).catch(() => []),
  ]);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`Roblox — ${user.displayName || user.name}${user.hasVerifiedBadge ? ' ☑' : ''}`)
    .setURL(`https://www.roblox.com/users/${user.id}/profile`)
    .setDescription(user.description ? user.description.slice(0, 400) : '*No description*')
    .addFields(
      { name: 'Username', value: `@${user.name}`, inline: true },
      { name: 'ID', value: `\`${user.id}\``, inline: true },
      { name: 'Status', value: presence.status, inline: true },
      { name: 'Friends', value: fmtNum(friendCount), inline: true },
      { name: 'Followers', value: fmtNum(followerCount), inline: true },
      { name: 'Following', value: fmtNum(followingCount), inline: true },
      { name: 'RAP', value: rolimons && (rolimons.rap ?? rolimons.RAP) !== undefined ? fmtNum(rolimons.rap ?? rolimons.RAP) : 'N/A', inline: true },
      { name: 'Value', value: rolimons && (rolimons.value ?? rolimons.Value) !== undefined ? fmtNum(rolimons.value ?? rolimons.Value) : 'N/A', inline: true },
      { name: 'Badges', value: badges && badges.length ? String(badges.length) : '0', inline: true },
      { name: 'Created', value: fmtDate(user.created), inline: false },
      { name: 'Last Seen', value: presence.lastOnline ? moment(presence.lastOnline).format('MMMM D, YYYY') : 'N/A', inline: true },
      { name: 'Last Game', value: presence.lastLocation || 'N/A', inline: true },
    )
    .setThumbnail(headshot || null)
    .setTimestamp();
  return message.channel.send({ embeds: [embed] });
}

async function runAvatar(message, args) {
  const q = args.join(' ').trim();
  if (!q) return warn(message, 'Usage: `,roblox avatar <username|id>`');
  const user = await resolveUser(q);
  if (!user) return warn(message, `No Roblox user found for **${q}**.`);
  const fullBody = await getThumb(`https://thumbnails.roblox.com/v1/users/avatar?userIds=${user.id}&size=420x420&format=Png&isCircular=false`);
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`Roblox — ${user.name}'s Avatar`)
    .setURL(`https://www.roblox.com/users/${user.id}/profile`)
    .setImage(fullBody || null)
    .setTimestamp();
  return message.channel.send({ embeds: [embed] });
}

async function runGroups(message, args) {
  const q = args.join(' ').trim();
  if (!q) return warn(message, 'Usage: `,roblox groups <username|id>`');
  const user = await resolveUser(q);
  if (!user) return warn(message, `No Roblox user found for **${q}**.`);
  let groups;
  try { groups = (await getJson(`https://groups.roblox.com/v2/users/${user.id}/groups/roles`)).data || []; }
  catch (e) { return deny(message, `Failed: ${e.message}`); }
  if (!groups.length) return warn(message, `**${user.name}** is not in any groups.`);
  const lines = groups.slice(0, 15).map(g => `• **${g.group.name}** — ${fmtNum(g.group.memberCount)} members · *${g.role.name}* (rank ${g.role.rank})`);
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`Roblox — ${user.name}'s Groups`)
    .setURL(`https://www.roblox.com/users/${user.id}/profile`)
    .setDescription(lines.join('\n'))
    .setFooter({ text: `Showing ${Math.min(15, groups.length)} of ${groups.length} groups` })
    .setTimestamp();
  return message.channel.send({ embeds: [embed] });
}

async function runGames(message, args) {
  const q = args.join(' ').trim();
  if (!q) return warn(message, 'Usage: `,roblox games <username|id>`');
  const user = await resolveUser(q);
  if (!user) return warn(message, `No Roblox user found for **${q}**.`);
  let games;
  try { games = (await getJson(`https://games.roblox.com/v2/users/${user.id}/games?accessFilter=Public&sortOrder=Asc&limit=50`)).data || []; }
  catch (e) { return deny(message, `Failed: ${e.message}`); }
  if (!games.length) return warn(message, `**${user.name}** has no public games.`);
  const totalVisits = games.reduce((s, g) => s + (g.placeVisits || 0), 0);
  const top = games.slice().sort((a, b) => (b.placeVisits || 0) - (a.placeVisits || 0)).slice(0, 10);
  const lines = top.map(g => `• **${g.name}** — ${fmtNum(g.placeVisits || 0)} visits`);
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`Roblox — ${user.name}'s Games`)
    .setURL(`https://www.roblox.com/users/${user.id}/profile`)
    .setDescription(lines.join('\n'))
    .addFields(
      { name: 'Total Games', value: fmtNum(games.length), inline: true },
      { name: 'Total Visits', value: fmtNum(totalVisits), inline: true },
    )
    .setFooter({ text: `Showing top ${top.length} by visits` })
    .setTimestamp();
  return message.channel.send({ embeds: [embed] });
}

async function runWearing(message, args) {
  const q = args.join(' ').trim();
  if (!q) return warn(message, 'Usage: `,roblox wearing <username|id>`');
  const user = await resolveUser(q);
  if (!user) return warn(message, `No Roblox user found for **${q}**.`);
  let assetIds;
  try { assetIds = (await getJson(`https://avatar.roblox.com/v1/users/${user.id}/currently-wearing`)).assetIds || []; }
  catch (e) { return deny(message, `Failed: ${e.message}`); }
  if (!assetIds.length) return warn(message, `**${user.name}** is wearing nothing visible.`);
  let details = [];
  try {
    const d = await postJson('https://catalog.roblox.com/v1/catalog/items/details', {
      items: assetIds.slice(0, 50).map(id => ({ itemType: 'Asset', id })),
    });
    details = d.data || [];
  } catch {}
  const lines = details.length
    ? details.slice(0, 20).map(a => `• [${a.name}](https://www.roblox.com/catalog/${a.id}) \`${a.id}\``)
    : assetIds.slice(0, 20).map(id => `• \`${id}\``);
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`Roblox — ${user.name} is Currently Wearing`)
    .setURL(`https://www.roblox.com/users/${user.id}/profile`)
    .setDescription(lines.join('\n'))
    .setFooter({ text: `Showing ${Math.min(20, assetIds.length)} of ${assetIds.length} assets` })
    .setTimestamp();
  return message.channel.send({ embeds: [embed] });
}

async function runNames(message, args) {
  const q = args.join(' ').trim();
  if (!q) return warn(message, 'Usage: `,roblox names <username|id>`');
  const user = await resolveUser(q);
  if (!user) return warn(message, `No Roblox user found for **${q}**.`);
  let names;
  try { names = (await getJson(`https://users.roblox.com/v1/users/${user.id}/username-history?limit=100&sortOrder=Asc`)).data || []; }
  catch (e) { return deny(message, `Failed: ${e.message}`); }
  if (!names.length) return warn(message, `**${user.name}** has no past usernames.`);
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`Roblox — ${user.name}'s Past Usernames`)
    .setURL(`https://www.roblox.com/users/${user.id}/profile`)
    .setDescription(names.slice(0, 30).map(n => `• ${n.name}`).join('\n'))
    .setFooter({ text: `Showing ${Math.min(30, names.length)} of ${names.length} names` })
    .setTimestamp();
  return message.channel.send({ embeds: [embed] });
}

async function runPeople(message, args, kind, label, endpoint) {
  const q = args.join(' ').trim();
  if (!q) return warn(message, `Usage: \`,roblox ${kind} <username|id>\``);
  const user = await resolveUser(q);
  if (!user) return warn(message, `No Roblox user found for **${q}**.`);
  let people, totalCount;
  try {
    people = (await getJson(`https://friends.roblox.com/v1/users/${user.id}/${endpoint}?limit=100&sortOrder=Asc`)).data || [];
    if (kind === 'friends') {
      totalCount = await getJson(`https://friends.roblox.com/v1/users/${user.id}/friends/count`).then(d => d.count).catch(() => people.length);
    } else if (kind === 'followers') {
      totalCount = await getJson(`https://friends.roblox.com/v1/users/${user.id}/followers/count`).then(d => d.count).catch(() => people.length);
    } else {
      totalCount = await getJson(`https://friends.roblox.com/v1/users/${user.id}/followings/count`).then(d => d.count).catch(() => people.length);
    }
  } catch (e) { return deny(message, `Failed: ${e.message}`); }
  if (!people.length) return warn(message, `**${user.name}** has no ${kind}.`);
  const lines = people.slice(0, 20).map(p => `• **${p.displayName || p.name}** (@${p.name}) — \`${p.id}\``);
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`Roblox — ${user.name}'s ${label}`)
    .setURL(`https://www.roblox.com/users/${user.id}/profile`)
    .setDescription(lines.join('\n'))
    .setFooter({ text: `Showing ${Math.min(20, people.length)} of ${fmtNum(totalCount)} ${label.toLowerCase()}` })
    .setTimestamp();
  return message.channel.send({ embeds: [embed] });
}

async function runRolimons(message, args) {
  const q = args.join(' ').trim();
  if (!q) return warn(message, 'Usage: `,roblox rolimons <username|id>`');
  const user = await resolveUser(q);
  if (!user) return warn(message, `No Roblox user found for **${q}**.`);
  let r;
  try { r = await getJson(`https://api.rolimons.com/players/v1/playerinfo/${user.id}`); }
  catch (e) { return deny(message, `Failed: ${e.message}`); }
  if (!r || r.success === false) return warn(message, `Rolimon's data unavailable for **${user.name}**.`);
  const rap = r.rap ?? r.RAP;
  const value = r.value ?? r.Value;
  const limiteds = (r.limiteds && Object.keys(r.limiteds).length) || r.limiteds_count || 0;
  const isPrivate = r.privateinventory ?? r.private ?? false;
  const isPremium = r.premium ?? false;
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`Roblox — ${user.name} on Rolimon's`)
    .setURL(`https://www.rolimons.com/player/${user.id}`)
    .addFields(
      { name: 'RAP', value: `${fmtNum(rap)} R$`, inline: true },
      { name: 'Value', value: `${fmtNum(value)} R$`, inline: true },
      { name: 'Limiteds', value: fmtNum(limiteds), inline: true },
      { name: 'Private', value: isPrivate ? 'True' : 'False', inline: true },
      { name: 'Premium', value: isPremium ? 'True' : 'False', inline: true },
    )
    .setFooter({ text: 'cached by rolimons.com' })
    .setTimestamp();
  return message.channel.send({ embeds: [embed] });
}

const HANDLERS = {
  help: (m) => showHelp(m),
  profile: (m, a) => runProfile(m, a),
  avatar: (m, a) => runAvatar(m, a),
  groups: (m, a) => runGroups(m, a),
  games: (m, a) => runGames(m, a),
  wearing: (m, a) => runWearing(m, a),
  names: (m, a) => runNames(m, a),
  friends: (m, a) => runPeople(m, a, 'friends', 'Friends', 'friends'),
  followers: (m, a) => runPeople(m, a, 'followers', 'Followers', 'followers'),
  following: (m, a) => runPeople(m, a, 'following', 'Following', 'followings'),
  rolimons: (m, a) => runRolimons(m, a),
};

module.exports = {
  name: 'roblox',
  category: 'utility',
  usage: 'roblox [subcommand] [args]',
  help: [
    { name: 'roblox', description: 'Roblox hub — run with no args for the subcommand menu.', aliases: 'rblx, rbx', parameters: '[subcommand]', information: 'n/a', usage: 'roblox [subcommand]', example: 'roblox profile builderman' },
    { name: 'roblox profile', description: 'Show a Roblox user profile.', aliases: 'rblx user', parameters: '<username|id>', information: 'n/a', usage: 'roblox profile <username|id>', example: 'roblox profile builderman' },
    { name: 'roblox avatar', description: 'Show a user\'s full-body avatar.', aliases: 'rblx av', parameters: '<username|id>', information: 'n/a', usage: 'roblox avatar <username|id>', example: 'roblox avatar builderman' },
    { name: 'roblox groups', description: 'List groups the user has joined.', aliases: 'rblx g', parameters: '<username|id>', information: 'n/a', usage: 'roblox groups <username|id>', example: 'roblox groups builderman' },
    { name: 'roblox games', description: 'List the user\'s public games.', aliases: 'rblx game', parameters: '<username|id>', information: 'n/a', usage: 'roblox games <username|id>', example: 'roblox games builderman' },
    { name: 'roblox wearing', description: 'Show what the user is currently wearing.', aliases: 'rblx outfit', parameters: '<username|id>', information: 'n/a', usage: 'roblox wearing <username|id>', example: 'roblox wearing builderman' },
    { name: 'roblox names', description: 'List past usernames for the user.', aliases: 'rblx history', parameters: '<username|id>', information: 'n/a', usage: 'roblox names <username|id>', example: 'roblox names builderman' },
    { name: 'roblox friends', description: 'List the user\'s friends.', aliases: 'rblx f', parameters: '<username|id>', information: 'n/a', usage: 'roblox friends <username|id>', example: 'roblox friends builderman' },
    { name: 'roblox followers', description: 'List the user\'s followers.', aliases: 'rblx follower', parameters: '<username|id>', information: 'n/a', usage: 'roblox followers <username|id>', example: 'roblox followers builderman' },
    { name: 'roblox following', description: 'List who the user is following.', aliases: 'rblx follow', parameters: '<username|id>', information: 'n/a', usage: 'roblox following <username|id>', example: 'roblox following builderman' },
    { name: 'roblox rolimons', description: "Show the user's Rolimon's value/RAP.", aliases: 'rblx value', parameters: '<username|id>', information: 'n/a', usage: 'roblox rolimons <username|id>', example: 'roblox rolimons builderman' },
  ],
  aliases: ['rblx', 'rbx', 'robloxuser'],

  run: async (client, message, args) => {
    if (args.length === 0) return showHelp(message);

    const first = args[0].toLowerCase();
    const sub = HANDLERS[first] ? first : (ALIASES[first] && HANDLERS[ALIASES[first]] ? ALIASES[first] : null);

    if (sub) {
      return HANDLERS[sub](message, args.slice(1));
    }

    // Backward compat: ",roblox builderman" → profile lookup
    return runProfile(message, args);
  },
};
