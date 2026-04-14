const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const Util = require('../handlers/xp');

module.exports = {
  category: 'leveling',
  help: [
    {
        name: 'rank',
        description: "View your or another user's rank card",
        aliases: 'level, xp, lvl',
        parameters: '[user]',
        information: 'n/a',
        usage: 'rank [user]',
        example: 'rank user'
    }
],

    name: 'rank',
  aliases: ['level', 'xp'],

  run: async (client, message, args) => {
    const target = message.mentions.members.first()?.user || (args[0] ? message.guild.members.cache.get(args[0])?.user : null) || message.author;

    const xp = db.get(`xp_${target.id}_${message.guild.id}`) || 0;
    const { level, remxp, levelxp } = Util.getInfo(xp);

    const bar = Math.round((remxp / levelxp) * 10);
    const progressBar = `[${'█'.repeat(bar)}${'░'.repeat(10 - bar)}] ${remxp}/${levelxp} XP`;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: target.tag, iconURL: target.displayAvatarURL({ forceStatic: false }) })
      .setTitle(`Rank — Level ${level}`)
      .addFields(
        { name: 'Level', value: `${level}`, inline: true },
        { name: 'Total XP', value: `${xp}`, inline: true },
        { name: 'Progress', value: progressBar, inline: false }
      )
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
