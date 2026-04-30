const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require("../config.json");
const { warn, deny } = require('../emojis.json');
const { paginate } = require('../utils/paginate');
const { logModAction } = require('../utils/modlog');

module.exports = {
  name: "ban",
  category: 'moderation',
  help: [
    { name: 'ban', description: 'Bans the mentioned user from the guild', aliases: 'n/a', parameters: '(member) [reason]', information: 'BAN_MEMBERS', usage: 'ban (member) <reason>', example: 'ban @user Threatening members' },
  ],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`);
    if (prefix === null) prefix = default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`ban_members\``)] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`ban_members\``)] });

    if (!args[0]) return paginate(message, [
      { name: 'ban', description: 'Bans the mentioned user from the guild', aliases: 'n/a', parameters: '(member) [reason]', information: 'BAN_MEMBERS', usage: `${prefix}ban (member) <reason>`, example: `${prefix}ban @user Threatening members` }
    ], 'moderation');

    const mentionedMember = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!mentionedMember) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: **Invalid User**. Do \`${prefix}ban\` to see the variables`)] });

    let reason = args.slice(1).join(" ") || 'No Reason Supplied';

    if (mentionedMember.id === message.author.id) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: You cannot ban **yourself**`)] });
    if (message.member.roles.highest.comparePositionTo(mentionedMember.roles.highest) >= 0 && message.guild.ownerId !== message.author.id) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: You cannot ban someone that is **higher** than **yours**`)] });
    if (!mentionedMember.bannable) return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: Cannot ban due to **hierarchy**`)] });

    const banEmbed = new EmbedBuilder()
      .setTitle('**Banned**')
      .addFields(
        { name: `**You have been banned in**`, value: `${message.guild.name}`, inline: true },
        { name: `**Moderator**`, value: `${message.author.tag}`, inline: true },
        { name: `**Reason**`, value: `${reason}`, inline: true }
      )
      .setColor('#FFFFFF')
      .setThumbnail(message.author.avatarURL({ forceStatic: false, size: 2048 }))
      .setTimestamp()
      .setFooter({ text: 'If you would like to dispute this punishment, contact a staff member.' });

    await mentionedMember.send({ embeds: [banEmbed] }).catch(() => {});

    // Let real failures propagate so the global error handler shows the
    // standard "Error occurred while performing command **ban**" embed.
    await mentionedMember.ban({ deleteMessageSeconds: 7 * 24 * 60 * 60, reason });

    await message.channel.send('👍').catch(() => {});
    logModAction(message.guild, {
      action: 'Ban',
      user: mentionedMember.user,
      moderator: message.author,
      reason
    }).catch(() => {});
  }
};
