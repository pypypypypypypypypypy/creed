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

const UA = { 'User-Agent': 'drown-xd-bot/1.0 (+https://github.com/abannition/drown-xd)' };

async function jget(url) {
  try {
    const r = await fetch(url, { headers: UA, timeout: 10000 });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
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
  } catch {
    return null;
  }
}

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
  const d = await jget(
    `https://thumbnails.roblox.com/v1/users/avatar?userIds=${userId}&size=${size}&format=Png&isCircular=false`
  );
  return d && d.data && d.data[0] && d.data[0].imageUrl;
}

async function getAvatarHeadshot(userId, size = '150x150') {
  const d = await jget(
    `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=${size}&format=Png&isCircular=false`
  );
  return d && d.data && d.data[0] && d.data[0].imageUrl;
}

async function getPresence(userId) {
  const d = await jpost('https://presence.roblox.com/v1/presence/users', {
    userIds: [Number(userId)],
  });
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

async function getFriends(userId) {
  const d = await jget(`https://friends.roblox.com/v1/users/${userId}/friends`);
  return (d && d.data) || [];
}

async function getFollowers(userId) {
  const d = await jget(`https://friends.roblox.com/v1/users/${userId}/followers?limit=100&sortOrder=Asc`);
  return (d && d.data) || [];
}

async function getFollowing(userId) {
  const d = await jget(`https://friends.roblox.com/v1/users/${userId}/followings?limit=100&sortOrder=Asc`);
  return (d && d.data) || [];
}

async function getGroups(userId) {
  const d = await jget(`https://groups.roblox.com/v2/users/${userId}/groups/roles`);
  return (d && d.data) || [];
}

async function getGames(userId) {
  const d = await jget(
    `https://games.roblox.com/v2/users/${userId}/games?accessFilter=Public&sortOrder=Asc&limit=50`
  );
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

async function getGroupThumb(groupId) {
  const d = await jget(
    `https://thumbnails.roblox.com/v1/groups/icons?groupIds=${groupId}&size=150x150&format=Png&isCircular=false`
  );
  return d && d.data && d.data[0] && d.data[0].imageUrl;
}

async function getGameThumbs(universeIds) {
  if (!universeIds.length) return {};
  const d = await jget(
    `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeIds.join(',')}&size=150x150&format=Png&isCircular=false`
  );
  const map = {};
  if (d && d.data) {
    for (const t of d.data) map[t.targetId] = t.imageUrl;
  }
  return map;
}

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

function buildSelect(active) {
  const options = [
    { label: 'User Profile', value: 'profile', emoji: '👤' },
    { label: 'Avatar', value: 'avatar', emoji: '🧍' },
    { label: 'Groups', value: 'groups', emoji: '👥' },
    { label: 'Games', value: 'games', emoji: '🎮' },
    { label: 'Currently Wearing', value: 'wearing', emoji: '👕' },
    { label: 'Previous Usernames', value: 'names', emoji: '🕘' },
    { label: 'Friends', value: 'friends', emoji: '🧑‍🤝‍🧑' },
    { label: 'Followers', value: 'followers', emoji: '🌟' },
    { label: 'Following', value: 'following', emoji: '➡️' },
    { label: "Rolimon's", value: 'rolimons', emoji: '💎' },
  ].map((o) => ({ ...o, default: o.value === active }));
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId('rblx_view').setPlaceholder('View').addOptions(options)
  );
}

function buildPager(page, totalPages, ownerId, sortable = false) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('rblx_prev').setStyle(ButtonStyle.Primary).setEmoji('◀').setDisabled(totalPages <= 1),
    new ButtonBuilder().setCustomId('rblx_next').setStyle(ButtonStyle.Primary).setEmoji('▶').setDisabled(totalPages <= 1),
    new ButtonBuilder().setCustomId('rblx_sort').setStyle(ButtonStyle.Secondary).setEmoji('↕').setDisabled(!sortable),
    new ButtonBuilder().setCustomId('rblx_close').setStyle(ButtonStyle.Danger).setEmoji('🗑')
  );
  return row;
}

function buildLinkRow(userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Profile').setURL(`https://www.roblox.com/users/${userId}/profile`),
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Rolimon's").setURL(`https://www.rolimons.com/player/${userId}`)
  );
}

async function buildProfileEmbed(ctx) {
  const { user, presence, friendCount, followerCount, followingCount, rolimons, badges, headshot, totalVisits, lastGame } = ctx;
  const emailVerified = user.hasVerifiedBadge ? 'Yes (Hat)' : 'No';
  const inventory = 'Public';
  const language = user.locale || 'English (US)';
  const lines = [];
  lines.push(`**User:** ${user.displayName || user.name} ${user.hasVerifiedBadge ? '☑' : ''}`);
  lines.push(`(@${user.name})`);
  lines.push(`**ID:** \`${user.id}\``);
  lines.push(`**Status:** ${statusFromPresence(presence)}`);
  lines.push(`**Inventory:** ${inventory}`);
  lines.push(`**Email Verified:** ${emailVerified}`);
  lines.push(`**Language:** ${language}`);
  lines.push('');
  lines.push(`${fmtNum(friendCount)} Friends · ${fmtNum(followerCount)} Followers · ${fmtNum(followingCount)} Following`);
  if (rolimons && rolimons.success !== false) {
    const rap = rolimons.rap ?? rolimons.RAP;
    const value = rolimons.value ?? rolimons.Value;
    if (rap !== undefined || value !== undefined) {
      lines.push(`${fmtNum(rap)} RAP · ${fmtNum(value)} Value (${moment().format('M/D/YY')})`);
    }
  }
  lines.push('');
  if (user.description) {
    lines.push(user.description.slice(0, 400));
    lines.push('');
  }
  lines.push(`**Created:** ${fmtDate(user.created)} (${moment(user.created).fromNow(true)} ago)`);
  lines.push(`**Visits:** ${fmtNum(totalVisits)}`);
  if (badges && badges.length) {
    lines.push(`**Badges (${badges.length}):** ${badges.map((b) => b.name).join(', ')}`);
  }
  if (presence && presence.lastOnline) {
    lines.push(`**Last Seen (Est.):** ${moment(presence.lastOnline).format('MMMM D, YYYY')}`);
  }
  if (lastGame) {
    lines.push(`**Last Game:** ${lastGame}`);
  }

  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: `${user.displayName || user.name} (@${user.name})`, url: `https://www.roblox.com/users/${user.id}/profile` })
    .setDescription(lines.join('\n'))
    .setThumbnail(headshot || null);
}

function buildAvatarEmbed(user, fullBody) {
  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: `${user.displayName || user.name} (@${user.name})`, url: `https://www.roblox.com/users/${user.id}/profile` })
    .setTitle('Avatar')
    .setImage(fullBody || null);
}

function buildGroupEmbed(user, groups, page) {
  const total = groups.length;
  if (!total) {
    return new EmbedBuilder().setColor(color)
      .setAuthor({ name: `${user.displayName || user.name} (@${user.name})` })
      .setTitle(`${user.name}'s Joined Groups (0)`)
      .setDescription('No groups.');
  }
  const g = groups[page];
  const grp = g.group || {};
  const role = g.role || {};
  const lines = [
    `**Owner:** ${grp.owner ? grp.owner.username : 'N/A'}`,
    `**Members:** ${fmtNum(grp.memberCount)}`,
    `**Public:** ${grp.publicEntryAllowed ? 'True' : 'False'}`,
    `**Group ID:** ${grp.id}`,
    '',
    `**Role:** ${role.name || 'N/A'}`,
    `**Rank:** ${role.rank ?? 'N/A'}`,
    `**Role ID:** ${role.id ?? 'N/A'}`,
  ];
  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: `${user.displayName || user.name} (@${user.name})`, url: `https://www.roblox.com/users/${user.id}/profile` })
    .setTitle(`${grp.name || 'Group'}`)
    .setURL(grp.id ? `https://www.roblox.com/groups/${grp.id}` : null)
    .setDescription(`${user.name}'s Joined Groups (${total})\n\n${lines.join('\n')}`)
    .setFooter({ text: `Page ${page + 1}/${total}` });
}

function buildGamesEmbed(user, games, page, thumbs) {
  const perPage = 3;
  const totalPages = Math.max(1, Math.ceil(games.length / perPage));
  const slice = games.slice(page * perPage, page * perPage + perPage);
  const e = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: `${user.displayName || user.name} (@${user.name})`, url: `https://www.roblox.com/users/${user.id}/profile` })
    .setTitle(`Games (${games.length}) — @${user.name}`)
    .setFooter({ text: `Page ${page + 1}/${totalPages}` });
  if (!games.length) return e.setDescription('No public games.');
  for (const g of slice) {
    e.addFields({
      name: g.name || 'Untitled',
      value:
        `\`${fmtNum(g.placeVisits ?? 0)} visits\`\n` +
        `Created ${fmtDate(g.created)}\n` +
        `Updated ${fmtDate(g.updated)}` +
        (g.id ? `\n[Open](https://www.roblox.com/games/${g.rootPlace?.id || g.id})` : ''),
      inline: false,
    });
  }
  if (slice[0] && thumbs[slice[0].id]) e.setThumbnail(thumbs[slice[0].id]);
  return e;
}

function buildWearingEmbed(user, assets, page) {
  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(assets.length / perPage));
  const slice = assets.slice(page * perPage, page * perPage + perPage);
  const desc = slice.length
    ? slice.map((a) => `• [${a.name || 'Asset'}](https://www.roblox.com/catalog/${a.id}) \`${a.id}\``).join('\n')
    : 'Wearing nothing visible.';
  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: `${user.displayName || user.name} (@${user.name})`, url: `https://www.roblox.com/users/${user.id}/profile` })
    .setTitle(`Currently Wearing (${assets.length})`)
    .setDescription(desc)
    .setFooter({ text: `Page ${page + 1}/${totalPages}` });
}

function buildNamesEmbed(user, names, page) {
  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(names.length / perPage));
  const slice = names.slice(page * perPage, page * perPage + perPage);
  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: `${user.displayName || user.name} (@${user.name})`, url: `https://www.roblox.com/users/${user.id}/profile` })
    .setTitle(`Past Usernames (${names.length}) — @${user.name}`)
    .setDescription(slice.length ? slice.map((n) => n.name).join('\n') : 'No previous usernames.')
    .setFooter({ text: `Page ${page + 1}/${totalPages}` });
}

function buildPeopleEmbed(user, people, page, label, total) {
  const perPage = 5;
  const totalPages = Math.max(1, Math.ceil(people.length / perPage));
  const slice = people.slice(page * perPage, page * perPage + perPage);
  const e = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: `${user.displayName || user.name} (@${user.name})`, url: `https://www.roblox.com/users/${user.id}/profile` })
    .setTitle(`${label} (${fmtNum(total)}) — @${user.name}`)
    .setFooter({ text: `Page ${page + 1}/${totalPages}` });
  if (!slice.length) return e.setDescription('Nobody to show.');
  for (const p of slice) {
    e.addFields({
      name: `${p.displayName || p.name} @${p.name}`,
      value: `\`${p.id}\` · [Profile](https://www.roblox.com/users/${p.id}/profile)`,
      inline: false,
    });
  }
  return e;
}

function buildRolimonsEmbed(user, rolimons) {
  const e = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: `@${user.name}`, url: `https://www.rolimons.com/player/${user.id}` })
    .setTitle(`${user.name} — cached by rolimons.com`)
    .setURL(`https://www.rolimons.com/player/${user.id}`);
  if (!rolimons || rolimons.success === false) {
    e.setDescription('Rolimon\'s data unavailable for this user.');
    return e;
  }
  const rap = rolimons.rap ?? rolimons.RAP;
  const value = rolimons.value ?? rolimons.Value;
  const limiteds = (rolimons.limiteds && Object.keys(rolimons.limiteds).length) || rolimons.limiteds_count || 0;
  const isPrivate = rolimons.privateinventory ?? rolimons.private ?? false;
  const isPremium = rolimons.premium ?? false;
  e.setDescription(
    [
      `**RAP:** ${fmtNum(rap)} R$`,
      `**Value:** ${fmtNum(value)} R$`,
      `**Limiteds:** ${fmtNum(limiteds)}`,
      `**Private:** ${isPrivate ? 'True' : 'False'}`,
      `**Premium:** ${isPremium ? 'True' : 'False'}`,
    ].join('\n')
  );
  return e;
}

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
        embeds: [
          new EmbedBuilder()
            .setColor('#efa23a')
            .setDescription(`${warn} ${message.author}: Provide a Roblox username or user ID. \`,roblox builderman\``),
        ],
      });
    }

    const query = args.join(' ').trim();
    const thinking = await message.channel.send({
      embeds: [new EmbedBuilder().setColor(color).setDescription(`Looking up **${query}** on Roblox...`)],
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
      wearingIds, badges, rolimons,
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
    ]);

    const wearingDetails = await getAssetDetails(wearingIds);
    const totalVisits = games.reduce((s, g) => s + (g.placeVisits || 0), 0);
    const lastGame = presence && presence.lastLocation ? presence.lastLocation : null;
    const gameThumbs = await getGameThumbs(games.map((g) => g.id).filter(Boolean));

    const ctx = {
      user, presence, friendCount, followerCount, followingCount, rolimons, badges,
      headshot, fullBody, totalVisits, lastGame,
      groups, games, names, friends, followers, following,
      wearingDetails, gameThumbs,
    };

    const state = { view: 'profile', page: 0, sortAsc: true };

    const embedFor = async () => {
      switch (state.view) {
        case 'profile': return await buildProfileEmbed(ctx);
        case 'avatar': return buildAvatarEmbed(user, fullBody);
        case 'groups': return buildGroupEmbed(user, ctx.groups, state.page);
        case 'games': return buildGamesEmbed(user, ctx.games, state.page, ctx.gameThumbs);
        case 'wearing': return buildWearingEmbed(user, ctx.wearingDetails, state.page);
        case 'names': return buildNamesEmbed(user, ctx.names, state.page);
        case 'friends': return buildPeopleEmbed(user, ctx.friends, state.page, 'Friends', ctx.friends.length);
        case 'followers': return buildPeopleEmbed(user, ctx.followers, state.page, 'Followers', followerCount);
        case 'following': return buildPeopleEmbed(user, ctx.following, state.page, 'Following', followingCount);
        case 'rolimons': return buildRolimonsEmbed(user, rolimons);
      }
    };

    const pageInfo = () => {
      switch (state.view) {
        case 'groups': return { total: ctx.groups.length, sortable: true };
        case 'games': return { total: Math.max(1, Math.ceil(ctx.games.length / 3)), sortable: true };
        case 'wearing': return { total: Math.max(1, Math.ceil(ctx.wearingDetails.length / 10)), sortable: false };
        case 'names': return { total: Math.max(1, Math.ceil(ctx.names.length / 10)), sortable: true };
        case 'friends': return { total: Math.max(1, Math.ceil(ctx.friends.length / 5)), sortable: true };
        case 'followers': return { total: Math.max(1, Math.ceil(ctx.followers.length / 5)), sortable: true };
        case 'following': return { total: Math.max(1, Math.ceil(ctx.following.length / 5)), sortable: true };
        default: return { total: 1, sortable: false };
      }
    };

    const components = () => {
      const pi = pageInfo();
      const rows = [buildSelect(state.view)];
      if (pi.total > 1 || pi.sortable) rows.push(buildPager(state.page, pi.total, message.author.id, pi.sortable));
      rows.push(buildLinkRow(user.id));
      return rows;
    };

    const sortPaged = (arr, key) => {
      arr.sort((a, b) => {
        const av = (a[key] ?? '').toString().toLowerCase();
        const bv = (b[key] ?? '').toString().toLowerCase();
        return state.sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    };

    await thinking.edit({ embeds: [await embedFor()], components: components() });

    const collector = thinking.createMessageComponentCollector({ time: 5 * 60 * 1000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== message.author.id) {
        return i.reply({ content: 'Only the command runner can use these controls.', ephemeral: true }).catch(() => {});
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
        } else if (i.customId === 'rblx_sort') {
          state.sortAsc = !state.sortAsc;
          if (state.view === 'groups') ctx.groups.sort((a, b) => state.sortAsc ? (a.group?.name || '').localeCompare(b.group?.name || '') : (b.group?.name || '').localeCompare(a.group?.name || ''));
          if (state.view === 'games') ctx.games.sort((a, b) => state.sortAsc ? (a.name || '').localeCompare(b.name || '') : (b.name || '').localeCompare(a.name || ''));
          if (state.view === 'names') sortPaged(ctx.names, 'name');
          if (state.view === 'friends') sortPaged(ctx.friends, 'name');
          if (state.view === 'followers') sortPaged(ctx.followers, 'name');
          if (state.view === 'following') sortPaged(ctx.following, 'name');
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
