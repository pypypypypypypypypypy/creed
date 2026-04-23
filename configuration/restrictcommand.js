const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

module.exports = {
  name: 'restrictcommand',
  aliases: ['restrict'],
  category: 'configuration',
  help: [
    { name: 'restrictcommand', description: 'Restrict a command to specific roles', aliases: 'restrict', parameters: '(command) (role)', information: 'MANAGE_GUILD', usage: 'restrictcommand (command) (role)', example: 'restrictcommand ban @Moderator' },
    { name: 'restrictcommand list', description: 'List all command restrictions', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'restrictcommand list', example: 'restrictcommand list' },
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });

    const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const sub = (args[0] || '').toLowerCase();
    const guildId = message.guild.id;
    const key = `restrict_commands_${guildId}`;

    if (!sub) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color)
      .setDescription(`${message.author}: Usage: \`${prefix}restrictcommand <command> <@role>\` or \`${prefix}restrictcommand list\``)] });

    if (sub === 'list') {
      const restrictions = db.get(key) || {};
      const entries = Object.entries(restrictions);
      if (!entries.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: No command restrictions set.`)] });
      const lines = entries.map(([cmd, roles]) => `\`${cmd}\` — ${roles.map(r => `<@&${r}>`).join(', ')}`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Command Restrictions').setDescription(lines.join('\n'))] });
    }

    const role = message.mentions.roles.first();
    if (!role) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Mention a role.`)] });

    const restrictions = db.get(key) || {};
    if (!restrictions[sub]) restrictions[sub] = [];
    if (restrictions[sub].includes(role.id)) {
      restrictions[sub] = restrictions[sub].filter(r => r !== role.id);
      if (!restrictions[sub].length) delete restrictions[sub];
      db.set(key, restrictions);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Removed ${role} restriction from \`${sub}\`.`)] });
    }
    restrictions[sub].push(role.id);
    db.set(key, restrictions);
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: \`${sub}\` is now restricted to ${role}.`)] });
  }
};
