const { EmbedBuilder, ActivityType } = require('discord.js');
const moment = require('moment');
const { color } = require('../config.json');

function getEmojis() {
  try { delete require.cache[require.resolve('../emojis.json')]; return require('../emojis.json'); } catch { return {}; }
}

// Only use application emojis (populated by ,uploadbadges) or Unicode fallbacks.
// Never fall back to guild emojis — they break if the bot left that server.
function buildFlagsMap(e) {
  return {
    Staff:                 e.discordStaff       || '👮',
    Partner:               e.partnerserverowner || '🤝',
    BugHunterLevel1:       e.bughunter1         || '🐛',
    BugHunterLevel2:       e.bughunter2         || '🐞',
    HypeSquadEvents:       e.hypebadge          || '🏅',
    HypeSquadOnlineHouse1: e.hypebadge          || '🏠',
    HypeSquadOnlineHouse2: e.hypebadge          || '🏠',
    HypeSquadOnlineHouse3: e.hypebadge          || '🏠',
    PremiumEarlySupporter: e.early              || '⭐',
    VerifiedBot:           e.verifiedBot        || '✅',
    VerifiedDeveloper:     e.earlybotdeveloper  || '🔨',
    ActiveDeveloper:       e.earlybotdeveloper  || '🔨',
    CertifiedModerator:    e.certifiedmoderator || '🛡️',
  };
}

// Application emojis first (from ,uploadbadges), then Unicode fallback. Never guild emojis.
function getNitroBadge(e, premiumType) {
  if (!premiumType) return '';
  if (premiumType === 1) return e.nitrosilver || '💜';
  if (premiumType === 3) return e.nitrosilver || '💜';
  return e.nitroopal || '💎';
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
    if (!premiumType && mentionedMember.premiumSince) premiumType = 2; // boosting requires Nitro
    if (!premiumType && userFlags.includes('PremiumEarlySupporter')) premiumType = 1;

    // Badge row: nitro → booster → flags → expression emojis
    const badgeParts = [];

    const nitroBadge = getNitroBadge(e, premiumType);
    if (nitroBadge) badgeParts.push(nitroBadge);

    if (mentionedMember.premiumSince) {
      // Only use application emoji (from ,uploadbadges) or Unicode — never guild emoji
      const b = e.boostheart || '🌸';
      badgeParts.push(b);
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

    // ── Description layout matching the screenshot ──
    // Line 1 (optional): Spotify activity
    // Line 2: badges on their own line
    // Blank line
    // "Dates" header
    // Created: MMM D, h:mm A (relative)
    // Blank line
    // X mutual servers
    const descParts = [];
    if (activities.length) descParts.push(activities.join('\n'));
    if (badgeParts.length) descParts.push(badgeParts.join(' '));

    const createdStr = `${moment(user.createdAt).format('MMM D, h:mm A')} (${moment(user.createdAt).fromNow()})`;
    descParts.push(`\n**Dates**\n**Created**: ${createdStr}`);
    descParts.push(`${mutualCount} mutual server${mutualCount !== 1 ? 's' : ''}`);

    const embed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL({ forceStatic: false }) })
      // Title: username (userID) — matches the screenshot
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
