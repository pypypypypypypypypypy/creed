const { EmbedBuilder, ActivityType } = require('discord.js');
const moment = require('moment');
const { color } = require('../config.json');

function getEmojis() {
  try { delete require.cache[require.resolve('../emojis.json')]; return require('../emojis.json'); } catch { return {}; }
}

// Maps Discord's badge-icon hashes (from profileData.badges[].icon) → emojis.json key.
// These cover every badge that does NOT appear in user.flags.toArray().
const HASH_TO_KEY = {
  // Standard / special badges
  '5e74e9b61934fc1f67c65515d1f7e60d': 'discordStaff',
  '3f9748e53446a137a052f3454e2de41e': 'discordPartner',
  'fee1624003e2fee35cb398e125dc479b': 'moderatoralumni',
  'bf01d1073931f921909045f3a39fd264': 'hypeSquad',
  '8a88d63823d8a71cd5e390baa45efa02': 'hypeSquadBravery',
  '011940fd013da3f7fb926e4a1cd2e618': 'hypeSquadBril',
  '3aa41de486fa12454c3761e8e223442e': 'hypeSquadBal',
  '2717692c7dca7289b35297368a940dd0': 'bugHunter',
  '848f79194d4be5ff5f81505cbd0ce1e6': 'bugHunterPlus',
  '6df5892e0f35b051f8b61eace34f4967': 'discord_certified_moderator',
  '7060786766c9c840eb3019e725d2b358': 'earlySupporter',
  '6bdc42827a38498929a4920da12695d9': 'active_developer',
  '6f9e37f9029ff57aef81db857890005e': 'verifiedBotDev',
  '7d9ae358c8c5e118768335dbe68b4fb8': 'quest',
  '83d8a1eb09a8d64e59233eec5d4d5c2d': 'orb',
  // Nitro
  '2ba85e8026a8614b640c2837bcdfe21b': 'nitro',
  // Boost tiers 1-9
  '51040c70d4f20a921ad6674ff86fc95c': 'boost',
  '0e4080d1d333bc7ad29ef6528b6f2fb7': 'boost',
  '72bed924410c304dbe3d00a6e593ff59': 'boost',
  'df199d2050d3ed4ebf84d64ae83989f8': 'boost',
  '996b3e870e8a22ce519b3a50e6bdd52f': 'boost',
  '991c9f39ee33d7537d9f408c3e53141e': 'boost',
  'cb3ae83c15e970e8f3d410bc62cb8b99': 'boost',
  '7142225d31238f6387d9f09efaa02759': 'boost',
  'ec92202290b48d0879b7413d2dde3bab': 'boost',
  // Account tenure badges
  '4f33c4a9c64ce221936bd256c356f91f': 'tenure1yr',
  '4514fab914bdbfb4ad2fa23df76121a6': 'tenure3yr',
  '2895086c18d5531d499862e41d1155a6': 'tenure6yr',
  '0334688279c8359120922938dcb1d6f8': 'tenure12yr',
  '0d61871f72bb9a33a7ae568c1fb4f20a': 'tenure24yr',
};

// Unicode fallbacks for flag-based badges (used when emoji isn't uploaded yet)
function buildFlagsMap(e) {
  return {
    Staff:                   e.discordStaff        || '👮',
    Partner:                 e.discordPartner      || '🤝',
    BugHunterLevel1:         e.bugHunter           || '🐛',
    BugHunterLevel2:         e.bugHunterPlus       || '🐞',
    HypeSquadEvents:         e.hypeSquad           || '🏅',
    HypeSquadOnlineHouse1:   e.hypeSquadBravery    || '🔺',
    HypeSquadOnlineHouse2:   e.hypeSquadBril       || '💎',
    HypeSquadOnlineHouse3:   e.hypeSquadBal        || '⚖️',
    PremiumEarlySupporter:   e.earlySupporter      || '⭐',
    VerifiedBot:             '✅',
    VerifiedDeveloper:       e.verifiedBotDev      || '🔨',
    ActiveDeveloper:         e.active_developer    || '💻',
    CertifiedModerator:      e.discord_certified_moderator || '🛡️',
    ModeratorProgramsAlumni: e.moderatorAlumni     || '🎓',
  };
}

// Picks the correct boost tier badge based on months boosting.
function getBoostBadge(e, premiumSince) {
  if (!premiumSince) return null;
  const months = Math.floor(moment.duration(moment().diff(moment(premiumSince))).asMonths());
  if (months >= 24) return e.boost  || '🌸';
  if (months >= 18) return e.boost  || '🌸';
  if (months >= 15) return e.boost  || '🌸';
  if (months >= 12) return e.boost  || '🌸';
  if (months >= 9)  return e.boost  || '🌸';
  if (months >= 6)  return e.boost  || '🌸';
  if (months >= 3)  return e.boost  || '🌸';
  if (months >= 2)  return e.boost  || '🌸';
  return e.boost || '🌸';
}

function getNitroBadge(e, premiumType) {
  if (!premiumType) return '';
  return e.nitro || '💜';
}

// Reads profileData.badges[].icon (hash) and returns the matching emoji tag or Unicode fallback.
// This catches Orb, Quest, tenure badges, and any badge not in user.flags.
function getBadgesFromProfile(profileData, e) {
  const out = [];
  const badges = profileData?.badges;
  if (!Array.isArray(badges)) return out;
  for (const badge of badges) {
    const key = badge.icon ? HASH_TO_KEY[badge.icon] : null;
    if (key) {
      const tag = e[key];
      // Use emoji tag if available, otherwise fall back to a generic description tag
      if (tag) out.push(tag);
    }
  }
  return out;
}

async function fetchDiscordProfile(userId, guildId, botToken) {
  if (!botToken) return null;
  try {
    const qs = guildId ? `?with_mutual_guilds=true&guild_id=${guildId}` : '?with_mutual_guilds=true';
    const res = await fetch(`https://discord.com/api/v10/users/${userId}/profile${qs}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

function renderEmoji(obj) {
  if (!obj || !obj.id) return null;
  return obj.animated ? `<a:${obj.name}:${obj.id}>` : `<:${obj.name}:${obj.id}>`;
}

module.exports = {
  category: 'information',
  help: [
    { name: 'userinfo', description: 'View detailed information about a user', aliases: 'ui, whois', parameters: '[user]', information: 'n/a', usage: 'userinfo [user]', example: 'userinfo @user' },
  ],
  name: 'userinfo',
  aliases: ['ui', 'whois', 'info', 'user'],

  run: async (client, message, args) => {
    let mentionedMember = message.mentions.members.first()
      || message.guild.members.cache.get(args[0])
      || message.guild.members.cache.find(r => r.user.username.toLowerCase() === args.join(' ').toLowerCase())
      || message.guild.members.cache.find(r => r.displayName.toLowerCase() === args.join(' ').toLowerCase())
      || message.member;

    const user      = await client.users.fetch(mentionedMember.id, { force: true }).catch(() => null) || message.author;
    const userFlags = user.flags?.toArray() || [];
    const e         = getEmojis();
    const flagsMap  = buildFlagsMap(e);

    const userPos  = [...message.guild.members.cache.values()].sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
    const position = userPos.findIndex(m => m.id === user.id) + 1;

    // Spotify / listening activity
    const activities = [];
    const presence   = mentionedMember.presence;
    if (presence) {
      for (const activity of presence.activities.values()) {
        if (activity.type === ActivityType.Listening) {
          if (user.bot) activities.push(`Listening to **${activity.name}**`);
          else activities.push(`Listening to [**${activity.details}**](https://open.spotify.com/) by **${activity.state}**`);
        }
      }
    }

    const botToken    = process.env.DISCORD_TOKEN || process.env.TOKEN;
    const profileData = await fetchDiscordProfile(user.id, message.guild.id, botToken);
    const mutualCount = profileData?.mutual_guilds?.length ?? 0;

    // Infer Nitro (Discord API doesn't expose premium_type to bots)
    let premiumType = profileData?.premium_type ?? 0;
    if (!premiumType && mentionedMember.premiumSince) premiumType = 2;
    if (!premiumType && userFlags.includes('PremiumEarlySupporter')) premiumType = 1;

    // ── Build badge row ──
    // Order: nitro → boost tier → profileData.badges (Orb, Quest, etc.) → flag-based badges → expression emojis
    const seen      = new Set();
    const badgeParts = [];

    function addBadge(b) {
      if (b && !seen.has(b)) { seen.add(b); badgeParts.push(b); }
    }

    // 1. Nitro
    const nitroBadge = getNitroBadge(e, premiumType);
    addBadge(nitroBadge);

    // 2. Boost tier (duration-aware)
    if (mentionedMember.premiumSince) addBadge(getBoostBadge(e, mentionedMember.premiumSince));

    // 3. Badges from profileData.badges[] (Orb, Quest, tenure, etc. — not in user.flags)
    for (const b of getBadgesFromProfile(profileData, e)) addBadge(b);

    // 4. Flag-based badges
    for (const flag of userFlags) addBadge(flagsMap[flag]);

    // 5. Profile expression emojis (avatar decoration area)
    const globalEmoji = profileData?.user_profile?.emoji;
    if (globalEmoji) { const r = renderEmoji(globalEmoji); addBadge(r); }
    const guildEmoji = profileData?.guild_member_profile?.emoji;
    if (guildEmoji && guildEmoji.id !== globalEmoji?.id) { const r = renderEmoji(guildEmoji); addBadge(r); }

    // ── Build description ──
    const descParts = [];
    if (activities.length) descParts.push(activities.join('\n'));
    if (badgeParts.length) descParts.push(badgeParts.join(' '));

    const createdStr = `${moment(user.createdAt).format('MMM D, h:mm A')} (${moment(user.createdAt).fromNow()})`;
    descParts.push(`\n**Dates**\n**Created**: ${createdStr}`);
    descParts.push(`${mutualCount} mutual server${mutualCount !== 1 ? 's' : ''}`);

    const embed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL({ forceStatic: false }) })
      .setTitle(`${user.username} (${user.id})`)
      .setDescription(descParts.join('\n'))
      .setColor(mentionedMember.displayHexColor || color)
      .setThumbnail(user.displayAvatarURL({ forceStatic: false, size: 2048 }))
      .setFooter({ text: user.bot ? 'Discord Bot' : `Join position: ${position || 'N/A'}` })
      .setTimestamp()
      .addFields(
        { name: '**Joined Discord On**', value: moment(user.createdAt).format('dddd, MMMM Do YYYY, h:mm A'), inline: true },
        { name: '**Joined Guild On**',   value: mentionedMember.joinedAt ? moment(mentionedMember.joinedAt).format('dddd, MMMM Do YYYY, h:mm A') : 'N/A', inline: true },
        { name: '**Boosted Guild On**',  value: mentionedMember.premiumSince ? moment(mentionedMember.premiumSince).format('dddd, MMMM Do YYYY, h:mm A') : 'N/A', inline: true },
        {
          name: `**Roles [${mentionedMember.roles.cache.size - 1}]**`,
          value: mentionedMember.roles.cache
            .filter(r => r.id !== message.guild.id)
            .sort((a, b) => b.position - a.position)
            .map(r => r.toString())
            .join(', ') || 'N/A',
          inline: true,
        },
      );

    if (user.banner) {
      const ext = user.banner.startsWith('a_') ? 'gif' : 'png';
      embed.setImage(`https://cdn.discordapp.com/banners/${user.id}/${user.banner}.${ext}?size=1024`);
    }

    await message.channel.send({ embeds: [embed] });
  },
};
