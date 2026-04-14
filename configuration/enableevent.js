const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

module.exports = {
  name: 'enableevent',
  aliases: ['ee'],
  category: 'configuration',
  help: [
    { name: 'enableevent', description: 'Enable a disabled event', aliases: 'ee', parameters: '(event)', information: 'MANAGE_GUILD', usage: 'enableevent (event)', example: 'enableevent welcome' },
    { name: 'enableevent all', description: 'Enable all disabled events', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'enableevent all', example: 'enableevent all' },
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });

    const sub = (args[0] || '').toLowerCase();
    const guildId = message.guild.id;
    const key = `disabled_events_${guildId}`;

    if (!sub) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Provide an event to enable.`)] });

    if (sub === 'all') {
      db.set(key, []);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: All events have been enabled.`)] });
    }

    const disabled = db.get(key) || [];
    if (!disabled.includes(sub)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: \`${sub}\` is not disabled.`)] });
    db.set(key, disabled.filter(e => e !== sub));
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Event \`${sub}\` has been enabled.`)] });
  }
};
