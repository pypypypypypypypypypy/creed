const db = require('../db');
const { default_prefix, color } = require("../config.json");
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { approve, warn } = require('../emojis.json');
const { paginate } = require('../utils/paginate');

module.exports = {
  name: 'altdentifier',
  aliases: ['ad'],
  category: 'configuration',
  help: [
    { name: 'altdentifier', description: 'Manage alt account detection settings', aliases: 'ad', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'altdentifier', example: 'altdentifier' },
    { name: 'altdentifier enable', description: 'Enable alt account detection', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'altdentifier enable', example: 'altdentifier enable' },
    { name: 'altdentifier disable', description: 'Disable alt account detection', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'altdentifier disable', example: 'altdentifier disable' },
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
    }

    let prefix = db.get(`prefix_${message.guild.id}`);
    if (prefix === null) prefix = default_prefix;

    if (!args[0]) {
      return paginate(message, [
        {
          name: 'altdentifier',
          description: 'Set up altdentifier to screen new accounts that join',
          aliases: 'ad',
          parameters: 'n/a',
          information: 'MANAGE_GUILD',
          usage: `${prefix}altdentifier`,
          example: `${prefix}altdentifier`
        },
        {
          name: 'altdentifier enable',
          description: 'Enable altdentifier for the guild',
          aliases: 'on',
          parameters: 'n/a',
          information: 'MANAGE_GUILD',
          usage: `${prefix}altdentifier enable`,
          example: `${prefix}altdentifier enable`
        },
        {
          name: 'altdentifier disable',
          description: 'Disable altdentifier for the guild',
          aliases: 'off',
          parameters: 'n/a',
          information: 'MANAGE_GUILD',
          usage: `${prefix}altdentifier disable`,
          example: `${prefix}altdentifier disable`
        }
      ], 'configuration');
    }

    const sub = args[0].toLowerCase();

    if (sub === 'enable' || sub === 'on') {
      if (!message.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`kick_members\``)] });
      }
      const already = await db.has(`anti-new_${message.guild.id}`);
      if (already) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Altdentifier has already been **enabled**`)] });
      }
      await db.set(`anti-new_${message.guild.id}`, true);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Altdentifier is now **enabled**`)] });
    }

    if (sub === 'disable' || sub === 'off') {
      const active = await db.has(`anti-new_${message.guild.id}`);
      if (!active) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Altdentifier has already been **disabled**`)] });
      }
      await db.delete(`anti-new_${message.guild.id}`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Altdentifier is now **disabled**`)] });
    }
  }
};
