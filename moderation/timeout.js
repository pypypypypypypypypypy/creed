const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { paginate } = require('../utils/paginate');
const { default_prefix } = require('../config.json');
const ms = require('ms');
const { logModAction } = require('../utils/modlog');

module.exports = {
  name: 'timeout',
  aliases: ['to'],
  category: 'moderation',
  help: [
    { name: 'timeout', description: 'Timeout a member for a specified duration', aliases: 'to', parameters: '(member) (duration) [reason]', information: 'MODERATE_MEMBERS', usage: 'timeout (member) (duration) [reason]', example: 'timeout @user 1h Spamming' },
  ],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`moderate_members\``)] });
    }

    if (!args[0]) return paginate(message, [
      { name: 'timeout', description: 'Times out a member for a duration', aliases: 'to', parameters: '(member) (duration) [reason]', information: 'MODERATE_MEMBERS', usage: `${prefix}timeout (member) (duration) [reason]`, example: `${prefix}timeout @user 10m Spamming` }
    ], 'moderation');

    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!member) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Couldn't find that member.`)] });
    if (!member.moderatable) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${warn} ${message.author}: I cannot timeout this member due to hierarchy.`)] });

    const duration = ms(args[1] || '');
    if (!duration) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please provide a valid duration (e.g. \`10m\`, \`1h\`, \`1d\`).`)] });
    if (duration > ms('28d')) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Duration cannot exceed **28 days**.`)] });

    const reason = args.slice(2).join(' ') || 'No reason provided';
    await member.timeout(duration, reason);

    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Timed out **${member.user.tag}** for **${args[1]}** — reason: **${reason}**`)] });
    logModAction(message.guild, { action: 'Timeout', user: member.user, moderator: message.author, reason: reason }).catch(() => {});
  }
};
