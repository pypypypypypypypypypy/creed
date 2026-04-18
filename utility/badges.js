const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const emojis = require('../emojis.json');

const BADGE_MAP = {
  ActiveDeveloper: '🛠️ Active Developer',
  BugHunterLevel1: `${emojis.bugHunter || '🐛'} Bug Hunter`,
  BugHunterLevel2: `${emojis.bugHunterPlus || '🐛'} Bug Hunter Gold`,
  CertifiedModerator: '🛡️ Certified Moderator',
  HypeSquadOnlineHouse1: `${emojis.hypeSquadBravery || '🏠'} HypeSquad Bravery`,
  HypeSquadOnlineHouse2: `${emojis.hypeSquadBril || '🏠'} HypeSquad Brilliance`,
  HypeSquadOnlineHouse3: `${emojis.hypeSquadBal || '🏠'} HypeSquad Balance`,
  Hypesquad: `${emojis.hypeSquad || '🏠'} HypeSquad Events`,
  Partner: `${emojis.discordPartner || '🤝'} Discord Partner`,
  PremiumEarlySupporter: `${emojis.earlySupporter || '⭐'} Early Supporter`,
  Staff: `${emojis.discordStaff || '👷'} Discord Staff`,
  VerifiedBot: `${emojis.verifiedBot || '✅'} Verified Bot`,
  VerifiedDeveloper: `${emojis.verifiedBotDev || '💻'} Verified Bot Developer`,
};

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'badges',
        description: "View a user's Discord badges",
        aliases: 'n/a',
        parameters: '[user]',
        information: 'n/a',
        usage: 'badges [user]',
        example: 'badges user'
    }
],

    name: 'badges',

  run: async (client, message, args) => {
    const target = message.mentions.users.first() || (args[0] ? await client.users.fetch(args[0]).catch(() => null) : message.author);
    if (!target) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: User not found.`)] });

    const flags = target.flags?.toArray() || [];
    const badgeList = flags.map(f => BADGE_MAP[f] || f).filter(Boolean);

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: `${target.tag}'s Badges`, iconURL: target.displayAvatarURL({ forceStatic: false }) })
      .setDescription(badgeList.length ? badgeList.join('\n') : 'This user has no badges.')
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
