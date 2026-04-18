const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { paginate } = require('../utils/paginate');
const { default_prefix } = require('../config.json');

module.exports = {
  name: 'warn',
  category: 'moderation',
  help: [
    { name: 'warn', description: 'Warn a member for rule violations', aliases: 'n/a', parameters: '(member) [reason]', information: 'MODERATE_MEMBERS', usage: 'warn (member) <reason>', example: 'warn @user Spamming' },
  ],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`moderate_members\``)] });
    }

    if (!args[0]) return paginate(message, [
      { name: 'warn', description: 'Warns a member', aliases: 'n/a', parameters: '(member) [reason]', information: 'MODERATE_MEMBERS', usage: `${prefix}warn (member) [reason]`, example: `${prefix}warn @user Breaking rules` }
    ], 'moderation');

    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!member) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Couldn't find that member.`)] });
    if (member.id === message.author.id) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${warn} ${message.author}: You cannot warn yourself.`)] });

    const reason = args.slice(1).join(' ') || 'No reason provided';
    const guildId = message.guild.id;
    const userId = member.id;

    const warns = db.get(`warns.${guildId}.${userId}`) || [];
    warns.push({ reason, moderator: message.author.id, timestamp: Date.now() });
    db.set(`warns.${guildId}.${userId}`, warns);

    const dmEmbed = new EmbedBuilder()
      .setColor('#efa23a')
      .setTitle('You have been warned')
      .addFields(
        { name: 'Server', value: message.guild.name, inline: true },
        { name: 'Moderator', value: message.author.tag, inline: true },
        { name: 'Reason', value: reason, inline: true },
        { name: 'Total Warnings', value: `${warns.length}`, inline: true }
      )
      .setTimestamp();
    await member.send({ embeds: [dmEmbed] }).catch(() => {});

    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Warned **${member.user.tag}** — reason: **${reason}** (warn #${warns.length})`)] });
  }
};
