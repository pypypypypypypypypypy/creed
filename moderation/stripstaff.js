const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'stripstaff',
        description: 'Strip all staff roles from a user',
        aliases: 'n/a',
        parameters: '(user)',
        information: 'MANAGE_ROLES',
        usage: 'stripstaff (user)',
        example: 'stripstaff user'
    }
],

    name: 'stripstaff',

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_roles\``)] });

    if (!args[0]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}stripstaff <member>\``)] });

    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!member) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Member not found.`)] });
    if (!member.manageable) return message.channel.send({ embeds: [new EmbedBuilder().setColor('fe6464').setDescription(`${warn} ${message.author}: I cannot manage this member due to hierarchy.`)] });

    const staffRoleIds = db.get(`staffroles_${message.guild.id}`) || [];
    const dangerousPerms = [PermissionFlagsBits.Administrator, PermissionFlagsBits.ManageGuild, PermissionFlagsBits.BanMembers, PermissionFlagsBits.KickMembers, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageChannels];

    const staffRoles = member.roles.cache.filter(r =>
      r.id !== message.guild.id &&
      r.position < message.guild.members.me.roles.highest.position &&
      (staffRoleIds.includes(r.id) || dangerousPerms.some(p => r.permissions.has(p)))
    );

    if (!staffRoles.size) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: **${member.user.tag}** has no staff roles to strip.`)] });

    await member.roles.remove(staffRoles, `Staff stripped by ${message.author.tag}`);
    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Stripped **${staffRoles.size}** staff role(s) from **${member.user.tag}**.`)] });
  }
};
