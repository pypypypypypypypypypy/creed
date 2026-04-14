const { EmbedBuilder, ActivityType } = require('discord.js');
const moment = require('moment');
const { color } = require('../config.json');
const { verifiedBotDev, bugHunter, bugHunterPlus, discordPartner, discordStaff, hypeSquad, hypeSquadBravery, hypeSquadBril, hypeSquadBal, verifiedBot, earlySupporter } = require('../emojis.json');

const flags = {
  Staff: `${discordStaff}`,
  Partner: `${discordPartner}`,
  BugHunterLevel1: `${bugHunter}`,
  BugHunterLevel2: `${bugHunterPlus}`,
  HypeSquadEvents: `${hypeSquad}`,
  HypeSquadOnlineHouse1: `${hypeSquadBravery}`,
  HypeSquadOnlineHouse2: `${hypeSquadBril}`,
  HypeSquadOnlineHouse3: `${hypeSquadBal}`,
  PremiumEarlySupporter: `${earlySupporter}`,
  VerifiedBot: `${verifiedBot}`,
  VerifiedDeveloper: `${verifiedBotDev}`
};

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

    const user = await client.users.fetch(mentionedMember.id).catch(() => null) || message.author;
    const userFlags = user.flags?.toArray() || [];

    const nickname = mentionedMember.nickname ? `∙ ${mentionedMember.nickname}` : '';
    const flagStr = userFlags.length ? `∙ ${userFlags.map(f => flags[f] || '').filter(Boolean).join(' ')}` : '';

    const bot = user.bot ? 'Discord Bot' : 'N/A';

    const userPos = [...message.guild.members.cache.values()]
      .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
    const position = userPos.findIndex(m => m.id === user.id) + 1;

    const activities = [];
    const presence = mentionedMember.presence;
    if (presence) {
      for (const activity of presence.activities.values()) {
        if (activity.type === ActivityType.Listening) {
          if (user.bot) activities.push(`Listening to **${activity.name}**`);
          else activities.push(`Listening to [**${activity.details}**](https://open.spotify.com/) by **${activity.state}**`);
        }
      }
    }

    const embed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL({ forceStatic: false }) })
      .setTitle(`${user.tag} ${nickname} ${flagStr}`.trim())
      .setDescription(`${activities.join('\n')}\n\`\`${user.id}\`\` ∙ Join position: ${position || 'N/A'}`)
      .setColor(mentionedMember.displayHexColor || color)
      .setThumbnail(user.displayAvatarURL({ forceStatic: false, size: 2048 }))
      .setFooter({ text: bot })
      .setTimestamp()
      .addFields(
        {
          name: '**Joined Discord On**',
          value: moment(user.createdAt).format('dddd, MMMM Do YYYY, h:mm A'),
          inline: true
        },
        {
          name: '**Joined Guild On**',
          value: mentionedMember.joinedAt
            ? moment(mentionedMember.joinedAt).format('dddd, MMMM Do YYYY, h:mm A')
            : 'N/A',
          inline: true
        },
        {
          name: '**Boosted Guild On**',
          value: mentionedMember.premiumSince
            ? moment(mentionedMember.premiumSince).format('dddd, MMMM Do YYYY, h:mm A')
            : 'N/A',
          inline: true
        },
        {
          name: `**Roles [${mentionedMember.roles.cache.size - 1}]**`,
          value: mentionedMember.roles.cache
            .filter(r => r.id !== message.guild.id)
            .sort((a, b) => b.position - a.position)
            .map(r => r.toString())
            .join(', ') || 'N/A',
          inline: true
        }
      );

    await message.channel.send({ embeds: [embed] });
  }
};
