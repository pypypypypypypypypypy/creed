const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');
const { paginate } = require('../utils/paginate');

module.exports = {
  name: 'settings',
  aliases: ['bind'],
  category: 'configuration',
  help: [
    { name: 'settings', description: 'View and manage server settings', aliases: 'bind', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'settings', example: 'settings' },
    { name: 'settings config', description: 'View current server settings', aliases: 'list, configuration', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'settings config', example: 'settings config' },
    { name: 'settings staff', description: 'Set the staff role', aliases: 'n/a', parameters: '(@role)', information: 'MANAGE_GUILD', usage: 'settings staff (@role)', example: 'settings staff @Staff' },
    { name: 'settings modlog', description: 'Set the modlog channel', aliases: 'jaillog', parameters: '(#channel)', information: 'MANAGE_GUILD', usage: 'settings modlog (#channel)', example: 'settings modlog #mod-log' },
    { name: 'settings joinlogs', description: 'Set the join logs channel', aliases: 'joinlog, jl', parameters: '(#channel)', information: 'MANAGE_GUILD', usage: 'settings joinlogs (#channel)', example: 'settings joinlogs #join-logs' },
    { name: 'settings muted', description: 'Set the muted role', aliases: 'textmute, mute', parameters: '(@role)', information: 'MANAGE_GUILD', usage: 'settings muted (@role)', example: 'settings muted @Muted' },
    { name: 'settings reset', description: 'Reset all settings', aliases: 'clear', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'settings reset', example: 'settings reset' },
  ],

  run: async (client, message, args) => {
    const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const sub = (args[0] || '').toLowerCase();
    const gid = message.guild.id;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild) && !message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });

    if (!sub || ['config', 'list', 'configuration'].includes(sub)) {
      const staffRole = db.get(`settings_staff_${gid}`);
      const modlog = db.get(`settings_modlog_${gid}`);
      const joinlogs = db.get(`settings_joinlogs_${gid}`);
      const muted = db.get(`settings_muted_${gid}`);
      const imuted = db.get(`settings_imuted_${gid}`);
      const rmuted = db.get(`settings_rmuted_${gid}`);
      const baserole = db.get(`settings_baserole_${gid}`);
      const premiumrole = db.get(`settings_premiumrole_${gid}`);
      const dj = db.get(`settings_dj_${gid}`);
      const autonick = db.get(`settings_autonick_${gid}`);

      const staffList = db.get(`settings_staff_list_${gid}`) || [];

      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color)
        .setTitle('Server Settings')
        .addFields(
          { name: 'Staff Role', value: staffRole ? `<@&${staffRole}>` : 'Not set', inline: true },
          { name: 'Mod Log', value: modlog ? `<#${modlog}>` : 'Not set', inline: true },
          { name: 'Join Logs', value: joinlogs ? `<#${joinlogs}>` : 'Not set', inline: true },
          { name: 'Muted Role', value: muted ? `<@&${muted}>` : 'Not set', inline: true },
          { name: 'Image Muted', value: imuted ? `<@&${imuted}>` : 'Not set', inline: true },
          { name: 'Reaction Muted', value: rmuted ? `<@&${rmuted}>` : 'Not set', inline: true },
          { name: 'Base Role', value: baserole ? `<@&${baserole}>` : 'Not set', inline: true },
          { name: 'Premium Role', value: premiumrole ? `<@&${premiumrole}>` : 'Not set', inline: true },
          { name: 'DJ Role', value: dj ? `<@&${dj}>` : 'Not set', inline: true },
          { name: 'Auto Nickname', value: autonick || 'Not set', inline: true },
        )
        .setTimestamp()
      ] });
    }

    if (sub === 'staff') {
      const sub2 = (args[1] || '').toLowerCase();
      if (sub2 === 'list') {
        const staffList = db.get(`settings_staff_list_${gid}`) || [];
        if (!staffList.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: No staff roles configured.`)] });
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Staff Roles').setDescription(staffList.map(id => `<@&${id}>`).join('\n'))] });
      }
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
      if (!role) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please mention a role.`)] });
      db.set(`settings_staff_${gid}`, role.id);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Staff role set to ${role}.`)] });
    }

    if (['modlog', 'jaillog'].includes(sub)) {
      const ch = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
      if (!ch) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please mention a channel.`)] });
      db.set(`settings_modlog_${gid}`, ch.id);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Mod log channel set to ${ch}.`)] });
    }

    if (['joinlogs', 'joinlog', 'jl'].includes(sub)) {
      const ch = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
      if (!ch) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please mention a channel.`)] });
      db.set(`settings_joinlogs_${gid}`, ch.id);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Join logs channel set to ${ch}.`)] });
    }

    if (['muted', 'textmute', 'mute'].includes(sub)) {
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
      if (!role) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please mention a role.`)] });
      db.set(`settings_muted_${gid}`, role.id);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Muted role set to ${role}.`)] });
    }

    if (['imuted', 'imute'].includes(sub)) {
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
      if (!role) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please mention a role.`)] });
      db.set(`settings_imuted_${gid}`, role.id);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Image muted role set to ${role}.`)] });
    }

    if (['rmuted', 'rmute'].includes(sub)) {
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
      if (!role) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please mention a role.`)] });
      db.set(`settings_rmuted_${gid}`, role.id);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Reaction muted role set to ${role}.`)] });
    }

    if (['baserole', 'baseid'].includes(sub)) {
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
      if (!role) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please mention a role.`)] });
      db.set(`settings_baserole_${gid}`, role.id);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Base role set to ${role}.`)] });
    }

    if (['premiumrole', 'premiumid', 'pr'].includes(sub)) {
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
      if (!role) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please mention a role.`)] });
      db.set(`settings_premiumrole_${gid}`, role.id);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Premium role set to ${role}.`)] });
    }

    if (sub === 'dj') {
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
      if (!role) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please mention a role.`)] });
      db.set(`settings_dj_${gid}`, role.id);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: DJ role set to ${role}.`)] });
    }

    if (sub === 'autonick') {
      const template = args.slice(1).join(' ');
      if (!template) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Provide a nickname template. Use \`{user}\` for the username.`)] });
      db.set(`settings_autonick_${gid}`, template);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Auto nickname template set to: \`${template}\``)] });
    }

    if (sub === 'autoplay') {
      const current = db.get(`settings_autoplay_${gid}`) || false;
      db.set(`settings_autoplay_${gid}`, !current);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Autoplay **${!current ? 'enabled' : 'disabled'}**.`)] });
    }

    if (['reset', 'clear'].includes(sub)) {
      const keys = ['staff', 'modlog', 'joinlogs', 'muted', 'imuted', 'rmuted', 'baserole', 'premiumrole', 'dj', 'autonick', 'autoplay', 'staff_list'];
      keys.forEach(k => db.delete(`settings_${k}_${gid}`));
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: All server settings have been **reset**.`)] });
    }

    return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Unknown subcommand. Use \`${prefix}settings\` to see all options.`)] });
  }
};
