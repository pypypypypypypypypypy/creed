const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');
const ms = require('ms');
const { logModAction } = require('../utils/modlog');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'tempban',
        description: 'Temporarily ban a user',
        aliases: 'tb',
        parameters: '(user) (duration) [reason]',
        information: 'BAN_MEMBERS',
        usage: 'tempban (user) (duration) [reason]',
        example: 'tempban user duration'
    }
],

    name: 'tempban',
  aliases: ['tban'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`ban_members\``)] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`ban_members\``)] });

    if (!args[0]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}tempban <member> <duration> [reason]\``)] });

    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!member) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Member not found.`)] });
    if (!member.bannable) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${warn} ${message.author}: I cannot ban this member due to hierarchy.`)] });

    const duration = ms(args[1] || '');
    if (!duration) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Provide a valid duration (e.g. \`1h\`, \`2d\`, \`1w\`).`)] });

    const reason = args.slice(2).join(' ') || 'No reason provided';
    const unbanAt = Date.now() + duration;

    const dmEmbed = new EmbedBuilder().setColor('#fe6464').setTitle('You have been temporarily banned')
      .addFields({ name: 'Server', value: message.guild.name, inline: true }, { name: 'Duration', value: args[1], inline: true }, { name: 'Reason', value: reason, inline: true })
      .setTimestamp();
    await member.send({ embeds: [dmEmbed] }).catch(() => {});

    await member.ban({ deleteMessageSeconds: 604800, reason });

    // Store for unban task
    const tempbans = db.get(`tempbans_${message.guild.id}`) || [];
    tempbans.push({ userId: member.id, unbanAt });
    db.set(`tempbans_${message.guild.id}`, tempbans);

    // Schedule unban
    setTimeout(async () => {
      await message.guild.members.unban(member.id, 'Tempban expired').catch(() => {});
    }, duration);

    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Temporarily banned **${member.user.tag}** for **${args[1]}** — reason: **${reason}**`)] });
    logModAction(message.guild, { action: 'Tempban', user: mentionedMember.user, moderator: message.author, reason: reason || 'No Reason Supplied' }).catch(() => {});
  }
};
