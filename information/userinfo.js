const { EmbedBuilder, ActivityType } = require('discord.js');
const moment = require('moment');
const { color } = require('../config.json');

function getEmojis() {
  try { delete require.cache[require.resolve('../emojis.json')]; return require('../emojis.json'); } catch { return {}; }
}

// All badge keys match the names used in ,uploadbadges BADGES array.
// Unicode fallbacks are used when the application emoji hasn't been uploaded yet.
function buildFlagsMap(e) {
  return {
    Staff:                 e.discordstaff         || '👮',
    Partner:               e.discordpartner       || '🤝',
    BugHunterLevel1:       e.bughunter1           || '🐛',
    BugHunterLevel2:       e.bughunter2           || '🐞',
    HypeSquadEvents:       e.hypesquadevents      || '🏅',
    HypeSquadOnlineHouse1: e.hypesquadbravery     || '🏠',
    HypeSquadOnlineHouse2: e.hypesquadbrilliance  || '🏠',
    HypeSquadOnlineHouse3: e.hypesquadbalance     || '🏠',
    PremiumEarlySupporter: e.earlysupporter       || '⭐',
    VerifiedBot:           '✅',
    VerifiedDeveloper:     e.verifiedbotdev       || '🔨',
    ActiveDeveloper:       e.activedeveloper       || '💻',
    CertifiedModerator:    e.certifiedmoderator   || '🛡️',
    ModeratorProgramsAlumni: e.moderatoralumni   || '🎓',
  };
}

// Returns the correct boost tier badge based on how long the member has been boosting.
// Tiers: 1mo · 2mo · 3mo · 6mo · 9mo · 1yr · 15mo · 18mo · 2yr
function getBoostBadge(e, premiumSince) {
  if (!premiumSince) return null;
  const months = Math.floor(moment.duration(moment().diff(moment(premiumSince))).asMonths());
  if (months >= 24) return e.boost2yr  || e.boost1yr || '🌸';
  if (months >= 18) return e.boost18mo || e.boost1yr || '🌸';
  if (months >= 15) return e.boost15mo || e.boost1yr || '🌸';
  if (months >= 12) return e.boost1yr  || '🌸';
  if (months >= 9)  return e.boost9mo  || e.boost6mo || '🌸';
  if (months >= 6)  return e.boost6mo  || '🌸';
  if (months >= 3)  return e.boost3mo  || '🌸';
  if (months >= 2)  return e.boost2mo  || '🌸';
  return e.boost1mo || '🌸';
}

function getNitroBadge(e, premiumType) {
  if (!premiumType) return '';
  return e.nitro || '💜';
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

    // Discord doesn't expose premium_type to bots — infer it
    let premiumType = profileData?.premium_type ?? 0;
    if (!premiumType && mentionedMember.premiumSince) premiumType = 2;
    if (!premiumType && userFlags.includes('PremiumEarlySupporter')) premiumType = 1;

    // Badge row: nitro → boost tier → profile flags → expression emojis
    const badgeParts = [];

    const nitroBadge = getNitroBadge(e, premiumType);
    if (nitroBadge) badgeParts.push(nitroBadge);

    // Show the correct boost TIER badge (not just a generic heart)
    if (mentionedMember.premiumSince) {
      const boostBadge = getBoostBadge(e, mentionedMember.premiumSince);
      if (boostBadge) badgeParts.push(boostBadge);
    }

    for (const flag of userFlags) {
      const badge = flagsMap[flag];
      if (badge && !badgeParts.includes(badge)) badgeParts.push(badge);
    }

    // Profile expression emojis
    const globalEmoji = profileData?.user_profile?.emoji;
    if (globalEmoji) { const r = renderEmoji(globalEmoji); if (r && !badgeParts.includes(r)) badgeParts.push(r); }
    const guildEmoji = profileData?.guild_member_profile?.emoji;
    if (guildEmoji && guildEmoji.id !== globalEmoji?.id) { const r = renderEmoji(guildEmoji); if (r && !badgeParts.includes(r)) badgeParts.push(r); }

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
