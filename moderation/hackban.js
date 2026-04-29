const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { color } = require("../config.json");
const { warn, deny } = require('../emojis.json');
const { paginate } = require('../utils/paginate');
const db = require('../db');
const { logModAction } = require('../utils/modlog');

module.exports = {
  category: 'moderation',
  help: [
    {
      name: 'hackban',
      description: 'Ban a user by ID without them being in the server',
      aliases: 'hban',
      parameters: '(user id) [reason]',
      information: 'BAN_MEMBERS',
      usage: 'hackban (user id) [reason]',
      example: 'hackban 262429076763967488 Raider'
    }
  ],

  name: `hackban`,
  aliases: ['hban'],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`ban_members\``)] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`ban_members\``)] });

    let prefix = db.get(`prefix_${message.guild.id}`);
    if (prefix === null) prefix = require('../config.json').default_prefix;

    if (!args[0]) {
      return paginate(message, [
        { name: 'hackban', description: 'Ban a user from the guild even if they are not in the server', aliases: 'hban', parameters: '(user id) [reason]', information: 'BAN_MEMBERS', usage: `${prefix}hackban (user id) <reason>`, example: `${prefix}hackban 262429076763967488 Raider` }
      ], 'moderation');
    }

    const targetId = args[0];
    if (isNaN(targetId)) return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: You must **specify** a valid user ID`)] });
    if (targetId === message.author.id) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: You cannot ban **yourself**`)] });

    // Hierarchy check only if the target is currently in the guild.
    const guildMember = message.guild.members.cache.get(targetId);
    if (guildMember && message.guild.ownerId !== message.author.id &&
        message.member.roles.highest.comparePositionTo(guildMember.roles.highest) >= 0) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: You cannot ban someone that is **higher** than **yours**`)] });
    }

    const reason = args.slice(1).join(' ') || 'No Reason Supplied';

    // Resolve a user object for the modlog before the ban (the user may not be in the guild).
    let bannedUser;
    try { bannedUser = await client.users.fetch(targetId); }
    catch { bannedUser = { username: `Unknown (${targetId})`, id: targetId }; }

    await message.guild.members.ban(targetId, { reason });

    await message.channel.send('👍').catch(() => {});
    logModAction(message.guild, {
      action: 'Hackban',
      user: bannedUser,
      moderator: message.author,
      reason
    }).catch(() => {});
  }
};
