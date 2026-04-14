const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

module.exports = {
  name: 'enablemodule',
  aliases: ['em'],
  category: 'configuration',
  help: [
    { name: 'enablemodule', description: 'Enable a disabled module', aliases: 'em', parameters: '(module)', information: 'MANAGE_GUILD', usage: 'enablemodule (module)', example: 'enablemodule fun' },
    { name: 'enablemodule all', description: 'Enable all disabled modules', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'enablemodule all', example: 'enablemodule all' },
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });

    const sub = (args[0] || '').toLowerCase();
    const guildId = message.guild.id;
    const key = `disabled_modules_${guildId}`;

    if (!sub) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Provide a module to enable.`)] });

    if (sub === 'all') {
      db.set(key, []);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: All modules have been enabled.`)] });
    }

    const disabled = db.get(key) || [];
    if (!disabled.includes(sub)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Module \`${sub}\` is not disabled.`)] });
    db.set(key, disabled.filter(m => m !== sub));
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Module \`${sub}\` has been enabled.`)] });
  }
};
