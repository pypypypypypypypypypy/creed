const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { paginate } = require('../utils/paginate');
const { default_prefix } = require('../config.json');
const { logModAction } = require('../utils/modlog');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'massban',
        description: 'Ban multiple users at once',
        aliases: 'n/a',
        parameters: '(user1) (user2) ...',
        information: 'BAN_MEMBERS',
        usage: 'massban (user1) (user2) ...',
        example: 'massban user1 user2'
    }
],

    name: 'massban',

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`ban_members\``)] });
    }
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`ban_members\``)] });
    }

    if (!args[0]) return paginate(message, [
      { name: 'massban', description: 'Bans multiple users by ID', aliases: 'n/a', parameters: '(id1) (id2) ...', information: 'BAN_MEMBERS', usage: `${prefix}massban (id1) (id2) ...`, example: `${prefix}massban 123456789 987654321` }
    ], 'moderation');

    const ids = args.filter(a => /^\d+$/.test(a));
    if (!ids.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please provide valid user IDs to ban.`)] });

    let banned = 0;
    let failed = 0;
    for (const id of ids) {
      await message.guild.members.ban(id, { reason: `Massban by ${message.author.tag}` }).then(() => banned++).catch(() => failed++);
    }

    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Banned **${banned}** user(s). Failed: **${failed}**.`)] });
    logModAction(message.guild, { action: 'Massban', user: { username: "Multiple Users", id: "N/A" }, moderator: message.author, reason: 'Mass ban executed' }).catch(() => {});
  }
};
