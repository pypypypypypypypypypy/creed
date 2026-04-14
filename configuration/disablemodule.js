const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

module.exports = {
  name: 'disablemodule',
  aliases: ['dm'],
  category: 'configuration',
  help: [
    { name: 'disablemodule', description: 'Disable a module in this server', aliases: 'dm', parameters: '(module)', information: 'MANAGE_GUILD', usage: 'disablemodule (module)', example: 'disablemodule fun' },
    { name: 'disablemodule list', description: 'List all disabled modules', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'disablemodule list', example: 'disablemodule list' },
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });

    const sub = (args[0] || '').toLowerCase();
    const guildId = message.guild.id;
    const key = `disabled_modules_${guildId}`;

    if (!sub) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Provide a module to disable.`)] });

    if (sub === 'list') {
      const disabled = db.get(key) || [];
      if (!disabled.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: No modules are disabled.`)] });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Disabled Modules').setDescription(disabled.map(m => `\`${m}\``).join(', '))] });
    }

    const disabled = db.get(key) || [];
    if (disabled.includes(sub)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Module \`${sub}\` is already disabled.`)] });
    disabled.push(sub);
    db.set(key, disabled);
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Module \`${sub}\` has been disabled.`)] });
  }
};
