const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { paginate } = require('../utils/paginate');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'softban',
        description: 'Softban a user (ban then immediately unban)',
        aliases: 'sb',
        parameters: '(user) [reason]',
        information: 'BAN_MEMBERS',
        usage: 'softban (user) [reason]',
        example: 'softban user reason'
    }
],

    name: 'softban',
  aliases: ['sb'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`ban_members\``)] });
    }
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`ban_members\``)] });
    }

    if (!args[0]) return paginate(message, [
      { name: 'softban', description: 'Bans and immediately unbans a member to delete their messages', aliases: 'sb', parameters: '(member) [reason]', information: 'BAN_MEMBERS', usage: `${prefix}softban (member) [reason]`, example: `${prefix}softban @user Spam` }
    ], 'moderation');

    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!member) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Couldn't find that member.`)] });
    if (!member.bannable) return message.channel.send({ embeds: [new EmbedBuilder().setColor('fe6464').setDescription(`${warn} ${message.author}: I cannot ban this member due to hierarchy.`)] });

    const reason = args.slice(1).join(' ') || 'No reason provided';

    const dmEmbed = new EmbedBuilder()
      .setColor('efa23a')
      .setTitle('You have been softbanned')
      .addFields({ name: 'Server', value: message.guild.name, inline: true }, { name: 'Reason', value: reason, inline: true })
      .setTimestamp();
    await member.send({ embeds: [dmEmbed] }).catch(() => {});

    await member.ban({ deleteMessageSeconds: 604800, reason });
    await message.guild.members.unban(member.id, 'Softban — messages cleared').catch(() => {});

    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Softbanned **${member.user.tag}** and cleared their recent messages.`)] });
  }
};
