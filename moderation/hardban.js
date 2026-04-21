const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');
const { logModAction } = require('../utils/modlog');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'hardban',
        description: 'Permanently ban a user and delete message history',
        aliases: 'hb',
        parameters: '(user) [reason]',
        information: 'BAN_MEMBERS',
        usage: 'hardban (user) [reason]',
        example: 'hardban user reason'
    }
],

    name: 'hardban',
  aliases: ['hban'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`ban_members\``)] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`ban_members\``)] });

    if (!args[0]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}hardban <member> [reason]\``)] });

    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    const userId = member?.id || args[0];
    if (!userId || !/^\d+$/.test(userId)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Member not found.`)] });
    if (member && !member.bannable) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${warn} ${message.author}: I cannot ban this member due to hierarchy.`)] });

    const reason = args.slice(1).join(' ') || 'No reason provided';

    if (member) {
      const dmEmbed = new EmbedBuilder().setColor('#fe6464').setTitle('You have been permanently (hard) banned')
        .addFields({ name: 'Server', value: message.guild.name, inline: true }, { name: 'Reason', value: reason, inline: true })
        .setTimestamp();
      await member.send({ embeds: [dmEmbed] }).catch(() => {});
    }

    await message.guild.members.ban(userId, { deleteMessageSeconds: 604800, reason });

    // Store in hardbans list — prevents unban via unbanall
    const hardbans = db.get(`hardbans_${message.guild.id}`) || [];
    if (!hardbans.includes(userId)) hardbans.push(userId);
    db.set(`hardbans_${message.guild.id}`, hardbans);

    const tag = member ? member.user.tag : userId;
    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Hard banned **${tag}** — they cannot be unbanned with \`unbanall\`. Reason: **${reason}**`)] });
    logModAction(message.guild, { action: 'Hardban', user: mentionedMember.user, moderator: message.author, reason: reason || 'No Reason Supplied' }).catch(() => {});
  }
};
