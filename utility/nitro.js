const { EmbedBuilder } = require('discord.js');
const moment = require('moment');
const { color } = require('../config.json');

function getEmojis() {
  try { delete require.cache[require.resolve('../emojis.json')]; return require('../emojis.json'); } catch { return {}; }
}

// premium_type → display label + which emoji key to prefer
const TIERS = {
  1: { label: 'Nitro Classic',  keys: ['nitrosilver',   'nitro'] },
  2: { label: 'Nitro',          keys: ['nitroopal',     'nitro'] },
  3: { label: 'Nitro Basic',    keys: ['nitrosilver',   'nitro'] },
};

function getTierEmoji(e, premiumType) {
  const tier = TIERS[premiumType];
  if (!tier) return null;
  for (const key of tier.keys) if (e[key]) return e[key];
  return null;
}

async function fetchProfile(userId, guildId, botToken) {
  if (!botToken) return null;
  try {
    const qs = guildId ? `?with_mutual_guilds=false&guild_id=${guildId}` : '?with_mutual_guilds=false';
    const res = await fetch(`https://discord.com/api/v10/users/${userId}/profile${qs}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

module.exports = {
  name: 'nitro',
  aliases: ['nit', 'checknitro'],
  category: 'utility',
  help: [{
    name: 'nitro',
    description: "Check whether a user has Nitro and what tier",
    aliases: 'nit, checknitro',
    parameters: '[user]',
    information: 'n/a',
    usage: 'nitro [user]',
    example: 'nitro @user',
  }],

  run: async (client, message, args) => {
    const e = getEmojis();

    const target = message.mentions.users.first()
      || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : null)
      || message.author;

    if (!target) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: User not found.`)] });
    }

    const member = message.guild.members.cache.get(target.id)
      || await message.guild.members.fetch(target.id).catch(() => null);

    const botToken    = process.env.DISCORD_TOKEN || process.env.TOKEN;
    const profile     = await fetchProfile(target.id, message.guild.id, botToken);
    const userFlags   = target.flags?.toArray() || [];

    // Discord's profile API does NOT return premium_type for bot tokens.
    // Infer nitro from: API field (if present) → boosting (requires Nitro) → Early Supporter flag
    let premiumType  = profile?.premium_type ?? 0;
    let premiumSince = profile?.premium_since ?? null;

    if (!premiumType && member?.premiumSince) {
      // Boosting requires Nitro — treat as Nitro (type 2)
      premiumType = 2;
    }
    if (!premiumType && userFlags.includes('PremiumEarlySupporter')) {
      // Had Nitro Classic back in the day
      premiumType = 1;
    }

    const tier      = TIERS[premiumType];
    const tierEmoji = getTierEmoji(e, premiumType);

    // Build description
    const lines = [];

    if (!tier) {
      lines.push(`${e.nitro || '💎'} **No Nitro**`);
    } else {
      const label = tierEmoji ? `${tierEmoji} **${tier.label}**` : `💎 **${tier.label}**`;
      lines.push(label);
      if (premiumSince) {
        const since = moment(premiumSince);
        const duration = moment.duration(moment().diff(since));
        const months = Math.floor(duration.asMonths());
        const years  = Math.floor(duration.asYears());
        let durationStr;
        if (years >= 1) durationStr = `${years} year${years > 1 ? 's' : ''}${months % 12 ? ` ${months % 12} month${months % 12 > 1 ? 's' : ''}` : ''}`;
        else durationStr = `${months || 1} month${months > 1 ? 's' : ''}`;
        lines.push(`Since **${since.format('MMM D, YYYY')}** ∙ ${durationStr}`);
      }
    }

    // Boost status
    if (member?.premiumSince) {
      const boostEmoji = e.boostheart || e.boost || '🩷';
      const boostSince = moment(member.premiumSince);
      const bDuration  = moment.duration(moment().diff(boostSince));
      const bMonths    = Math.floor(bDuration.asMonths());
      lines.push(`${boostEmoji} **Boosting this server** since **${boostSince.format('MMM D, YYYY')}** ∙ ${bMonths || 1} month${bMonths > 1 ? 's' : ''}`);
    } else {
      lines.push(`${e.boost || '💨'} **Not boosting** this server`);
    }

    const embed = new EmbedBuilder()
      .setColor(member?.displayHexColor || color)
      .setAuthor({ name: target.tag, iconURL: target.displayAvatarURL({ forceStatic: false }) })
      .setDescription(lines.join('\n'))
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  },
};
