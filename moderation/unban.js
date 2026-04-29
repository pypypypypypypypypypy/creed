const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { color, default_prefix } = require("../config.json");
const { warn, deny } = require('../emojis.json');
const { paginate } = require('../utils/paginate');
const db = require('../db');
const { logModAction } = require('../utils/modlog');

module.exports = {
  name: "unban",
  category: "moderation",
  help: [
    { name: 'unban', description: 'Unban a user from the server', aliases: 'n/a', parameters: '(user) [reason]', information: 'BAN_MEMBERS', usage: 'unban (user) [reason]', example: 'unban 123456789 Appeal accepted' },
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`ban_members\``)] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`ban_members\``)] });

    let prefix = db.get(`prefix_${message.guild.id}`);
    if (prefix === null) prefix = default_prefix;

    if (!args[0] || isNaN(args[0])) {
      return paginate(message, [
        { name: 'unban', description: 'Unban a user from the guild by their ID', aliases: 'n/a', parameters: '(user id) [reason]', information: 'BAN_MEMBERS', usage: `${prefix}unban (user id) <reason>`, example: `${prefix}unban 262429076763967488 Forgiven` }
      ], 'moderation');
    }

    const userID = args[0];
    const reason = args.slice(1).join(" ") || 'No Reason Provided';

    const bans = await message.guild.bans.fetch();
    if (bans.size === 0) return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: Couldn't find any bans for this guild`)] });

    const bUser = bans.get(userID);
    if (!bUser) return message.channel.send({ embeds: [new EmbedBuilder().setColor("#fe6464").setDescription(`${deny} ${message.author}: Couldn't find a ban for: **${userID}**`)] });

    // Let real failures propagate so the global error handler shows the
    // standard "Error occurred while performing command **unban**" embed.
    await message.guild.members.unban(bUser.user, reason);

    await message.channel.send('👍').catch(() => {});
    logModAction(message.guild, {
      action: 'Unban',
      user: bUser.user,
      moderator: message.author,
      reason
    }).catch(() => {});
  }
};
