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
        name: 'unbanall',
        description: 'Unban all banned users from the server',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'BAN_MEMBERS',
        usage: 'unbanall',
        example: 'unbanall'
    }
],

    name: 'unbanall',

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`ban_members\``)] });
    }
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`ban_members\``)] });
    }

    const bans = await message.guild.bans.fetch().catch(() => null);
    if (!bans || !bans.size) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: There are no banned users in this server.`)] });

    const msg = await message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Unbanning **${bans.size}** users... this may take a while.`)] });

    let count = 0;
    for (const [id] of bans) {
      await message.guild.members.unban(id, `Unban all by ${message.author.tag}`).then(() => count++).catch(() => {});
    }

    msg.edit({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Successfully unbanned **${count}** user(s).`)] });
  }
};
