const { EmbedBuilder, ActivityType } = require('discord.js');
const moment = require('moment');
const { color } = require('../config.json');
const {
  verifiedBotDev, bugHunter, bugHunterPlus, discordPartner, discordStaff,
  hypeSquad, hypeSquadBravery, hypeSquadBril, hypeSquadBal,
  verifiedBot, earlySupporter, active_developer,
  boost, nitro, uptime, replyline,
} = require('../emojis.json');

const flags = {
  Staff:                   discordStaff,
  Partner:                 discordPartner,
  BugHunterLevel1:         bugHunter,
  BugHunterLevel2:         bugHunterPlus,
  HypeSquadEvents:         hypeSquad,
  HypeSquadOnlineHouse1:   hypeSquadBravery,
  HypeSquadOnlineHouse2:   hypeSquadBril,
  HypeSquadOnlineHouse3:   hypeSquadBal,
  PremiumEarlySupporter:   earlySupporter,
  VerifiedBot:             verifiedBot,
  VerifiedDeveloper:       verifiedBotDev,
  ActiveDeveloper:         active_developer,
};

async function fetchDiscordProfile(userId, guildId, botToken) {
  if (!botToken) return null;
  try {
    const qs = guildId ? `?with_mutual_guilds=false&guild_id=${guildId}` : `?with_mutual_guilds=false`;
    const res = await fetch(`https://discord.com/api/v10/users/${userId}/profile${qs}`, {
      headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

function formatEmoji(emojiObj) {
  if (!emojiObj || !emojiObj.id) return null;
  const { id, name, animated } = emojiObj;
  const tag = animated ? `<a:${name}:${id}>` : `<:${name}:${id}>`;
  const url = `https://cdn.discordapp.com/emojis/${id}.${animated ? 'gif' : 'png'}?size=64`;
  return { tag, url, name, id, animated };
}

const STATUS_EMOJI = { online: '🟢', idle: '🟡', dnd: '🔴', offline: '⚫', invisible: '⚫' };

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

    const userPos  = [...message.guild.members.cache.values()].sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
    const position = userPos.findIndex(m => m.id === user.id) + 1;

    const presence     = mentionedMember.presence;
    const statusKey    = presence?.status || 'offline';
    const statusEmoji  = STATUS_EMOJI[statusKey] || '⚫';
    const statusLabel  = statusKey.charAt(0).toUpperCase() + statusKey.slice(1);

    // Listening activity
    let listeningLine = '';
    if (presence) {
      for (const activity of presence.activities.values()) {
        if (activity.type === ActivityType.Listening) {
          listeningLine = user.bot
            ? `🎵 Listening to **${activity.name}**`
            : `🎵 Listening to [**${activity.details}**](https://open.spotify.com/) by **${activity.state}**`;
        }
      }
    }

    // Badge string
    const badgeStr = userFlags.map(f => flags[f] || '').filter(Boolean).join(' ');

    // Fetch profile for expression emojis
    const botToken    = process.env.DISCORD_TOKEN || process.env.TOKEN;
    const profileData = await fetchDiscordProfile(user.id, message.guild.id, botToken);

    const expressionEmojis = [];
    const globalEmoji = profileData?.user_profile?.emoji;
    if (globalEmoji) {
      const fmt = formatEmoji(globalEmoji);
      if (fmt) expressionEmojis.push({ label: 'Profile Expression', ...fmt });
    }
    const guildEmoji = profileData?.guild_member_profile?.emoji;
    if (guildEmoji && guildEmoji.id !== globalEmoji?.id) {
      const fmt = formatEmoji(guildEmoji);
      if (fmt) expressionEmojis.push({ label: 'Server Expression', ...fmt });
    }
    const avatarDecoration = profileData?.user?.avatar_decoration_data || user.avatarDecorationData;

    // Nickname / display
    const nickname  = mentionedMember.nickname || user.displayName || user.username;
    const isNitro   = !!mentionedMember.premiumSince;

    // Description block
    const descLines = [
      `${replyline} ${statusEmoji} **${statusLabel}**  •  🆔 \`${user.id}\`  •  📊 Join position **#${position || '?'}**`,
      listeningLine || null,
      badgeStr ? `${replyline} ${badgeStr}` : null,
      user.bot ? `${replyline} 🤖 **Bot account**` : null,
      isNitro ? `${replyline} ${nitro} **Nitro subscriber**  ${boost} Boosting since ${moment(mentionedMember.premiumSince).format('MMM D, YYYY')}` : null,
    ].filter(Boolean).join('\n');

    const embed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL({ forceStatic: false }) })
      .setTitle(`${nickname}${mentionedMember.nickname ? `  (${user.username})` : ''}`)
      .setDescription(descLines)
      .setColor(mentionedMember.displayHexColor || color)
      .setThumbnail(user.displayAvatarURL({ forceStatic: false, size: 2048 }))
      .setTimestamp()
      .addFields(
        {
          name: '📅 Joined Discord',
          value: moment(user.createdAt).format('MMM D, YYYY [at] h:mm A'),
          inline: true,
        },
        {
          name: '📥 Joined Server',
          value: mentionedMember.joinedAt
            ? moment(mentionedMember.joinedAt).format('MMM D, YYYY [at] h:mm A')
            : 'Unknown',
          inline: true,
        },
        {
          name: `🏷️ Roles [${mentionedMember.roles.cache.size - 1}]`,
          value: mentionedMember.roles.cache
            .filter(r => r.id !== message.guild.id)
            .sort((a, b) => b.position - a.position)
            .map(r => r.toString())
            .join(', ') || 'None',
          inline: false,
        },
      );

    // Expression emojis field
    if (expressionEmojis.length > 0) {
      const lines = expressionEmojis.map(e => `✨ **${e.label}:** ${e.tag}  •  [open](${e.url})`);
      embed.addFields({ name: '😶 Profile Emojis', value: lines.join('\n'), inline: false });
    }

    // Avatar decoration
    if (avatarDecoration?.asset) {
      const decorUrl = `https://cdn.discordapp.com/avatar-decoration-presets/${avatarDecoration.asset}.png?size=128`;
      embed.addFields({ name: '🖼️ Avatar Decoration', value: `[View decoration](${decorUrl})`, inline: true });
    }

    // Profile banner
    if (user.banner) {
      const ext = user.banner.startsWith('a_') ? 'gif' : 'png';
      const bannerUrl = `https://cdn.discordapp.com/banners/${user.id}/${user.banner}.${ext}?size=1024`;
      embed.setImage(bannerUrl);
    }

    await message.channel.send({ embeds: [embed] });
  },
};
