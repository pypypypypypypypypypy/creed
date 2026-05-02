const { EmbedBuilder, ActivityType } = require('discord.js');
const moment = require('moment');
const { color } = require('../config.json');

function getEmojis() {
  try { delete require.cache[require.resolve('../emojis.json')]; return require('../emojis.json'); } catch { return {}; }
}

const FLAGS_MAP = (e) => ({
  Staff:                 e.discordStaff    || '',
  Partner:               e.partnerserverowner || '',
  BugHunterLevel1:       e.bughunter1      || '',
  BugHunterLevel2:       e.bughunter2      || '',
  HypeSquadEvents:       e.hypebadge       || '',
  HypeSquadOnlineHouse1: e.hypebadge       || '',
  HypeSquadOnlineHouse2: e.hypebadge       || '',
  HypeSquadOnlineHouse3: e.hypebadge       || '',
  PremiumEarlySupporter: e.early           || '',
  VerifiedBot:           e.verifiedBot     || '',
  VerifiedDeveloper:     e.earlybotdeveloper || '',
  ActiveDeveloper:       e.earlybotdeveloper || '',
});

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
    const e         = getEmojis();
    const flagsMap  = FLAGS_MAP(e);

    const nickname  = mentionedMember.nickname ? `∙ ${mentionedMember.nickname}` : '';
    const badgeParts = userFlags.map(f => flagsMap[f]).filter(Boolean);
    if (mentionedMember.premiumSince) badgeParts.unshift(e.boostheart || e.booster || '');
    const flagStr = badgeParts.filter(Boolean).length ? `∙ ${badgeParts.filter(Boolean).join(' ')}` : '';

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

    // Fetch profile expression emojis in parallel
    const botToken    = process.env.DISCORD_TOKEN || process.env.TOKEN;
    const profileData = await fetchDiscordProfile(user.id, message.guild.id, botToken);

    const expressionParts = [];
    const globalEmoji = profileData?.user_profile?.emoji;
    if (globalEmoji) { const r = renderEmoji(globalEmoji); if (r) expressionParts.push(r); }
    const guildEmoji = profileData?.guild_member_profile?.emoji;
    if (guildEmoji && guildEmoji.id !== globalEmoji?.id) { const r = renderEmoji(guildEmoji); if (r) expressionParts.push(r); }

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
        { name: '**Joined Discord On**', value: moment(user.createdAt).format('dddd, MMMM Do YYYY, h:mm A'), inline: true },
        { name: '**Joined Guild On**', value: mentionedMember.joinedAt ? moment(mentionedMember.joinedAt).format('dddd, MMMM Do YYYY, h:mm A') : 'N/A', inline: true },
        { name: '**Boosted Guild On**', value: mentionedMember.premiumSince ? moment(mentionedMember.premiumSince).format('dddd, MMMM Do YYYY, h:mm A') : 'N/A', inline: true },
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
