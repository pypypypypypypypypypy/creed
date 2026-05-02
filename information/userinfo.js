const { EmbedBuilder, ActivityType } = require('discord.js');
const moment = require('moment');
const { color } = require('../config.json');
const { verifiedBot, discordStaff } = require('../emojis.json');

const BADGE = {
  booster:    '<:boostheart:1219378385332207778>',
  early:      '<:early:1488484682029989928>',
  bughunter1: '<:4475bughunter1:1488303644511178752>',
  bughunter2: '<:72030discordbughunter2:1488303645907750913>',
  partner:    '<:partnerserverowner:1488484718398935240>',
  earlyDev:   '<:96296discordearlybotdeveloper1:1488484694994452620>',
  hype:       '<:HypeBadge:1145742145379119245>',
};

const FLAGS_MAP = {
  Staff:                 discordStaff,
  Partner:               BADGE.partner,
  BugHunterLevel1:       BADGE.bughunter1,
  BugHunterLevel2:       BADGE.bughunter2,
  HypeSquadEvents:       BADGE.hype,
  HypeSquadOnlineHouse1: BADGE.hype,
  HypeSquadOnlineHouse2: BADGE.hype,
  HypeSquadOnlineHouse3: BADGE.hype,
  PremiumEarlySupporter: BADGE.early,
  VerifiedBot:           verifiedBot,
  VerifiedDeveloper:     BADGE.earlyDev,
  ActiveDeveloper:       BADGE.earlyDev,
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

    const nickname = mentionedMember.nickname ? `∙ ${mentionedMember.nickname}` : '';

    // Badge row: Discord flags + booster
    const badgeParts = userFlags.map(f => FLAGS_MAP[f]).filter(Boolean);
    if (mentionedMember.premiumSince) badgeParts.unshift(BADGE.booster);
    const flagStr = badgeParts.length ? `∙ ${badgeParts.join(' ')}` : '';

    const bot = user.bot ? 'Discord Bot' : 'N/A';

    const userPos  = [...message.guild.members.cache.values()].sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
    const position = userPos.findIndex(m => m.id === user.id) + 1;

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

    // Fetch profile expression emojis — runs in background, never delays the embed
    const botToken    = process.env.DISCORD_TOKEN || process.env.TOKEN;
    const profileData = await fetchDiscordProfile(user.id, message.guild.id, botToken);

    // Collect expression emojis from the profile
    const expressionParts = [];
    const globalEmoji = profileData?.user_profile?.emoji;
    if (globalEmoji) {
      const rendered = renderEmoji(globalEmoji);
      if (rendered) expressionParts.push(rendered);
    }
    const guildEmoji = profileData?.guild_member_profile?.emoji;
    if (guildEmoji && guildEmoji.id !== globalEmoji?.id) {
      const rendered = renderEmoji(guildEmoji);
      if (rendered) expressionParts.push(rendered);
    }

    // Append expression emojis to flagStr so they appear right after badges in the title
    const expressionStr = expressionParts.length ? ` ∙ ${expressionParts.join(' ')}` : '';

    const embed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL({ forceStatic: false }) })
      .setTitle(`${user.tag} ${nickname} ${flagStr}${expressionStr}`.trim())
      .setDescription(`${activities.join('\n')}\n\`\`${user.id}\`\` ∙ Join position: ${position || 'N/A'}`)
      .setColor(mentionedMember.displayHexColor || color)
      .setThumbnail(user.displayAvatarURL({ forceStatic: false, size: 2048 }))
      .setFooter({ text: bot })
      .setTimestamp()
      .addFields(
        {
          name: '**Joined Discord On**',
          value: moment(user.createdAt).format('dddd, MMMM Do YYYY, h:mm A'),
          inline: true,
        },
        {
          name: '**Joined Guild On**',
          value: mentionedMember.joinedAt
            ? moment(mentionedMember.joinedAt).format('dddd, MMMM Do YYYY, h:mm A')
            : 'N/A',
          inline: true,
        },
        {
          name: '**Boosted Guild On**',
          value: mentionedMember.premiumSince
            ? moment(mentionedMember.premiumSince).format('dddd, MMMM Do YYYY, h:mm A')
            : 'N/A',
          inline: true,
        },
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
