const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

module.exports = {
  name: 'disableevent',
  aliases: ['de'],
  category: 'configuration',
  help: [
    { name: 'disableevent', description: 'Disable an event in this server', aliases: 'de', parameters: '(event)', information: 'MANAGE_GUILD', usage: 'disableevent (event)', example: 'disableevent welcome' },
    { name: 'disableevent list', description: 'List all disabled events', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'disableevent list', example: 'disableevent list' },
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });

    const sub = (args[0] || '').toLowerCase();
    const guildId = message.guild.id;
    const key = `disabled_events_${guildId}`;

    if (!sub) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Provide an event to disable.`)] });

    if (sub === 'list') {
      const disabled = db.get(key) || [];
      if (!disabled.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: No events are disabled.`)] });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Disabled Events').setDescription(disabled.map(e => `\`${e}\``).join(', '))] });
    }

    const disabled = db.get(key) || [];
    if (disabled.includes(sub)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: \`${sub}\` is already disabled.`)] });
    disabled.push(sub);
    db.set(key, disabled);
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Event \`${sub}\` has been disabled.`)] });
  }
};
