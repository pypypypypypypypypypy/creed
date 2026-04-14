const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { paginate } = require('../utils/paginate');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'warnings',
        description: 'View all warnings for a user',
        aliases: 'warns',
        parameters: '(user)',
        information: 'n/a',
        usage: 'warnings (user)',
        example: 'warnings user'
    }
],

    name: 'warnings',
  aliases: ['warns'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!args[0]) return paginate(message, [
      { name: 'warnings', description: 'View warnings for a member', aliases: 'warns', parameters: '(member)', information: 'None', usage: `${prefix}warnings (member)`, example: `${prefix}warnings @user` }
    ], 'moderation');

    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!member) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Couldn't find that member.`)] });

    const warns = db.get(`warns.${message.guild.id}.${member.id}`) || [];
    if (!warns.length) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: **${member.user.tag}** has no warnings.`)] });
    }

    const lines = warns.map((w, i) => `**#${i + 1}** — ${w.reason} | <@${w.moderator}> | <t:${Math.floor(w.timestamp / 1000)}:R>`);
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`Warnings for ${member.user.tag}`)
      .setDescription(lines.join('\n'))
      .setFooter({ text: `Total: ${warns.length} warning(s)` })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
