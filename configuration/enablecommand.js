const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

module.exports = {
  name: 'enablecommand',
  aliases: ['ec'],
  category: 'configuration',
  help: [
    { name: 'enablecommand', description: 'Enable a disabled command', aliases: 'ec', parameters: '(command)', information: 'MANAGE_GUILD', usage: 'enablecommand (command)', example: 'enablecommand snipe' },
    { name: 'enablecommand all', description: 'Enable all disabled commands', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'enablecommand all', example: 'enablecommand all' },
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });

    const sub = (args[0] || '').toLowerCase();
    const guildId = message.guild.id;

    if (!sub) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Provide a command to enable.`)] });

    if (sub === 'all') {
      const disabled = db.get(`disabled_commands_${guildId}`) || [];
      for (const cmd of disabled) db.delete(`disabled_${guildId}_${cmd}`);
      db.set(`disabled_commands_${guildId}`, []);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: All commands have been enabled.`)] });
    }

    const disabled = db.get(`disabled_commands_${guildId}`) || [];
    if (!disabled.includes(sub)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: \`${sub}\` is not disabled.`)] });

    db.set(`disabled_commands_${guildId}`, disabled.filter(c => c !== sub));
    db.delete(`disabled_${guildId}_${sub}`);
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: \`${sub}\` has been enabled.`)] });
  }
};
