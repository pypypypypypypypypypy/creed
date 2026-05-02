const { EmbedBuilder, ActivityType } = require('discord.js');
const moment = require('moment');
const { color } = require('../config.json');
const { verifiedBot, discordStaff, replyline, nitro: nitroEmoji, boost: boostEmoji } = require('../emojis.json');

// ── Custom badge emojis (provided) ────────────────────────────────────────
const BADGE = {
  boostHeart:      '<:boostheart:1219378385332207778>',
  early:           '<:early:1488484682029989928>',
  nitroplatinum:   '<:nitroplatinum:1488303638278443009>',
  booster:         '<:boostheart:1219378385332207778>',
  nitrodiamond:    '<:nitrodiamond:1488303630367854758>',
  bughunter1:      '<:4475bughunter1:1488303644511178752>',
  nitrogold:       '<:nitrogold:1488303634570805308>',
  nitroruby:       '<:nitroruby:1488303628006719692>',
  bughunter2:      '<:72030discordbughunter2:1488303645907750913>',
  nitrosilver:     '<:nitrosilver:1488303629545766932>',
  nitroopal:       '<:nitroopal:1488303636357316779>',
  nitroemerald:    '<:nitroemerald:1488303633014718464>',
  quest:           '<:quest:1488303642405507365>',
  partner:         '<:partnerserverowner:1488484718398935240>',
  orbs:            '<:orbs:1488303641314988042>',
  earlyDev:        '<:96296discordearlybotdeveloper1:1488484694994452620>',
  hype:            '<:HypeBadge:1145742145379119245>',
};

// Map UserFlags → badge emoji
const FLAGS_MAP = {
  Staff:                   discordStaff,
  Partner:                 BADGE.partner,
  BugHunterLevel1:         BADGE.bughunter1,
  BugHunterLevel2:         BADGE.bughunter2,
  HypeSquadEvents:         BADGE.hype,
  HypeSquadOnlineHouse1:   BADGE.hype,
  HypeSquadOnlineHouse2:   BADGE.hype,
  HypeSquadOnlineHouse3:   BADGE.hype,
  PremiumEarlySupporter:   BADGE.early,
  VerifiedBot:             verifiedBot,
  VerifiedDeveloper:       BADGE.earlyDev,
  ActiveDeveloper:         BADGE.earlyDev,
  Quarantined:             '🔒',
};

// Nitro premium_type → badge emoji
// 0 = None, 1 = Nitro Classic, 2 = Nitro, 3 = Nitro Basic
const NITRO_BADGE = {
  1: BADGE.nitrosilver,   // Classic
  2: BADGE.nitroopal,     // Nitro (base)
  3: BADGE.nitrosilver,   // Basic
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
  return { tag, url, name, id };
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

    const presence    = mentionedMember.presence;
    const statusKey   = presence?.status || 'offline';
    const statusEmoji = STATUS_EMOJI[statusKey] || '⚫';
    const statusLabel = statusKey.charAt(0).toUpperCase() + statusKey.slice(1);

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

    // Fetch profile in parallel
    const botToken    = process.env.DISCORD_TOKEN || process.env.TOKEN;
    const profileData = await fetchDiscordProfile(user.id, message.guild.id, botToken);

    // Build badge row — flags + nitro badge
    const badges = userFlags.map(f => FLAGS_MAP[f]).filter(Boolean);

    const premiumType = profileData?.premium_type ?? 0;
    if (premiumType > 0 && NITRO_BADGE[premiumType]) {
      badges.unshift(NITRO_BADGE[premiumType]);
    }
    if (mentionedMember.premiumSince) {
      badges.unshift(BADGE.booster);
    }

    // Expression emojis from profile
    const expressionEmojis = [];
    const globalEmoji = profileData?.user_profile?.emoji;
    if (globalEmoji) {
      const fmt = formatEmoji(globalEmoji);
      if (fmt) expressionEmojis.push({ label: 'Profile', ...fmt });
    }
    const guildEmoji = profileData?.guild_member_profile?.emoji;
    if (guildEmoji && guildEmoji.id !== globalEmoji?.id) {
      const fmt = formatEmoji(guildEmoji);
      if (fmt) expressionEmojis.push({ label: 'Server', ...fmt });
    }

    const avatarDecoration = profileData?.user?.avatar_decoration_data || user.avatarDecorationData;
    const nickname  = mentionedMember.nickname || user.displayName || user.username;
    const isNitro   = premiumType > 0;
    const isBooster = !!mentionedMember.premiumSince;

    // Description
    const descLines = [
      `${replyline} ${statusEmoji} **${statusLabel}**  •  🆔 \`${user.id}\`  •  📊 Join position **#${position || '?'}**`,
      listeningLine || null,
      badges.length ? `${replyline} ${badges.join(' ')}` : null,
      user.bot ? `${replyline} 🤖 **Bot account**` : null,
      isBooster ? `${replyline} ${BADGE.boostHeart} **Server Booster** since ${moment(mentionedMember.premiumSince).format('MMM D, YYYY')}` : null,
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

    if (expressionEmojis.length > 0) {
      embed.addFields({
        name: '😶 Profile Emojis',
        value: expressionEmojis.map(e => `✨ **${e.label}:** ${e.tag}  •  [open](${e.url})`).join('\n'),
        inline: false,
      });
    }

    if (avatarDecoration?.asset) {
      const decorUrl = `https://cdn.discordapp.com/avatar-decoration-presets/${avatarDecoration.asset}.png?size=128`;
      embed.addFields({ name: '🖼️ Avatar Decoration', value: `[View decoration](${decorUrl})`, inline: true });
    }

    if (user.banner) {
      const ext = user.banner.startsWith('a_') ? 'gif' : 'png';
      embed.setImage(`https://cdn.discordapp.com/banners/${user.id}/${user.banner}.${ext}?size=1024`);
    }

    await message.channel.send({ embeds: [embed] });
  },
};
