const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');

const changelog = [
  { version: 'v2.0.0', changes: ['Added moderation: warn, warnings, clearwarnings, slowmode, nick, timeout, untimeout, softban, massban, unbanall, lock, unlockall, hide, unhide', 'Added reaction role commands: reactionrole add/remove/list/clear', 'Added automod: automod enable/disable/settings, antilink, antispam, antiinvite', 'Added utility: embed, serverstats, channelinfo, rolelist, boosters, badges, permissions, snowflake, reactionroles', 'Added message: copy, copyid, quote, say, edit', 'Added fun: 8ball, ship, rate, compliment, insult, wouldyourather, truth, dare', 'Added economy: leaderboard, inventory, use, iteminfo, sell, dailybonus, weekly, monthly', 'Added music: play, pause, resume, skip, queue, nowplaying, stop, volume', 'Added info: commands, usage, aliases, changelog'] },
];

module.exports = {
  category: 'information',
  help: [
    {
        name: 'changelog',
        description: 'View the bot changelog',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'changelog',
        example: 'changelog'
    }
],

    name: 'changelog',

  run: async (client, message, args) => {
    const latest = changelog[0];

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`📋 Changelog — ${latest.version}`)
      .setDescription(latest.changes.map(c => `• ${c}`).join('\n'))
      .setFooter({ text: 'Module: info' })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
