const db = require('../db');
const { default_prefix } = require("../config.json");
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js')
const Discord = { MessageEmbed: EmbedBuilder };
const { color } = require("../config.json");
const { approve, warn } = require('../emojis.json');
const { paginate } = require('../utils/paginate');

module.exports = {
  name: "autorole",
  aliases: ["ar"],
  category: 'configuration',
  help: [
    { name: 'autorole', description: 'Manage the server autorole settings', aliases: 'ar', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'autorole', example: 'autorole' },
    { name: 'autorole set', description: 'Set the role automatically given to new members', aliases: 'n/a', parameters: '(role)', information: 'MANAGE_GUILD', usage: 'autorole set (role)', example: 'autorole set @Member' },
    { name: 'autorole clear', description: 'Remove the current autorole', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'autorole clear', example: 'autorole clear' },
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`manage_roles\``)] });

    let prefix = db.get(`prefix_${message.guild.id}`);
    if (prefix === null) prefix = default_prefix;

    if (!args[0]) {
      return paginate(message, [
        {
          name: 'autorole',
          description: 'Automatically assign a role to new members when they join',
          aliases: 'ar',
          parameters: 'n/a',
          information: 'MANAGE_GUILD',
          usage: `${prefix}autorole`,
          example: `${prefix}autorole`
        },
        {
          name: 'autorole set',
          description: 'Set the role to give all new members on join',
          aliases: 'n/a',
          parameters: '(role name)',
          information: 'MANAGE_GUILD, MANAGE_ROLES',
          usage: `${prefix}autorole set (role)`,
          example: `${prefix}autorole set Members`
        },
        {
          name: 'autorole clear',
          description: 'Remove the currently set autorole',
          aliases: 'n/a',
          parameters: 'n/a',
          information: 'MANAGE_GUILD',
          usage: `${prefix}autorole clear`,
          example: `${prefix}autorole clear`
        }
      ], 'configuration');
    }

    if (['set', 'add', 'create'].includes(args[0].toLowerCase())) {
      const attemptedRoleName = args.slice(1).join(' ');
      const roleName = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]) || message.guild.roles.cache.find(r => r.name.toLowerCase() === attemptedRoleName.toLowerCase());
      if (!roleName) return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: Could not find a role named **${attemptedRoleName}**`)] });
      const roles = db.get(`autoroles_${message.guild.id}`) || [];
      if (!roles.includes(roleName.id)) roles.push(roleName.id);
      await db.set(`autoroles_${message.guild.id}`, roles);
      await db.set(`autorole_${message.guild.id}`, roleName.id);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor("#a3eb7b").setDescription(`${approve} ${message.author}: Autorole added: ${roleName}`)] });
    }

    if (['list', 'all'].includes(args[0].toLowerCase())) {
      const roles = db.get(`autoroles_${message.guild.id}`) || (db.get(`autorole_${message.guild.id}`) ? [db.get(`autorole_${message.guild.id}`)] : []);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Autoroles').setDescription(roles.length ? roles.map(id => `<@&${id}>`).join('\n') : 'No autoroles configured.')] });
    }

    if (['remove', 'delete', 'del'].includes(args[0].toLowerCase())) {
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
      if (!role) return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: Mention a role to remove.`)] });
      const roles = (db.get(`autoroles_${message.guild.id}`) || []).filter(id => id !== role.id);
      db.set(`autoroles_${message.guild.id}`, roles);
      if (db.get(`autorole_${message.guild.id}`) === role.id) db.delete(`autorole_${message.guild.id}`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor("#a3eb7b").setDescription(`${approve} ${message.author}: Removed ${role} from autoroles.`)] });
    }

    if (['clear', 'reset'].includes(args[0].toLowerCase())) {
      db.delete(`autorole_${message.guild.id}`);
      db.delete(`autoroles_${message.guild.id}`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor("#a3eb7b").setDescription(`${approve} ${message.author}: The autoroles have been **cleared**`)] });
    }
  }
};
