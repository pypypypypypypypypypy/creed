const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { paginate } = require('../utils/paginate');

module.exports = {
  name: 'goodbye',
  aliases: ['bye'],
  category: 'configuration',
  help: [
    { name: 'goodbye', description: 'Manage goodbye messages when members leave', aliases: 'bye, leave', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'goodbye', example: 'goodbye' },
    { name: 'goodbye channel', description: 'Set the goodbye channel', aliases: 'n/a', parameters: '(channel)', information: 'MANAGE_GUILD', usage: 'goodbye channel #channel', example: 'goodbye channel #goodbye' },
    { name: 'goodbye message', description: 'Set the goodbye message', aliases: 'msg', parameters: '(message)', information: 'MANAGE_GUILD', usage: 'goodbye message (text)', example: 'goodbye message Goodbye {user}!' },
    { name: 'goodbye clear', description: 'Clear goodbye settings', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'goodbye clear', example: 'goodbye clear' },
    { name: 'goodbye test', description: 'Test the goodbye message', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'goodbye test', example: 'goodbye test' },
    { name: 'goodbye variables', description: 'Show available variables', aliases: 'vars', parameters: 'n/a', information: 'n/a', usage: 'goodbye variables', example: 'goodbye variables' },
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });

    const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const sub = (args[0] || '').toLowerCase();
    const guildId = message.guild.id;

    if (!sub) {
      return paginate(message, module.exports.help, 'configuration');
    }

    if (['channel', 'chan', 'c'].includes(sub)) {
      const channel = message.mentions.channels.first();
      if (!channel) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Mention a channel.`)] });
      db.set(`goodbye_channel_${guildId}`, channel.id);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Goodbye channel set to ${channel}.`)] });
    }

    if (['message', 'msg'].includes(sub)) {
      const text = args.slice(1).join(' ');
      if (!text) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Provide a message.`)] });
      db.set(`goodbye_message_${guildId}`, text);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Goodbye message set to:\n\`\`\`${text}\`\`\``)] });
    }

    if (sub === 'clear') {
      db.delete(`goodbye_channel_${guildId}`);
      db.delete(`goodbye_message_${guildId}`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Goodbye settings cleared.`)] });
    }

    if (sub === 'test') {
      const chId = db.get(`goodbye_channel_${guildId}`);
      const msg = db.get(`goodbye_message_${guildId}`);
      if (!chId) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: No goodbye channel set.`)] });
      if (!msg) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: No goodbye message set.`)] });
      const ch = message.guild.channels.cache.get(chId);
      if (!ch) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Goodbye channel not found.`)] });
      const ordinal = n => n + (['st','nd','rd'][((n%100-11)%10-1)]||'th');
      const formatted = msg
        .replace(/{user}/g, message.author.toString())
        .replace(/{user\.name}/g, message.author.username)
        .replace(/{user\.tag}/g, message.author.tag || message.author.username)
        .replace(/{user\.id}/g, message.author.id)
        .replace(/{membercount}/g, message.guild.memberCount)
        .replace(/{membercount\.ordinal}/g, ordinal(message.guild.memberCount))
        .replace(/{guild\.name}/g, message.guild.name)
        .replace(/{guild\.id}/g, message.guild.id);
      ch.send(formatted).catch(() => {});
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Test goodbye message sent to ${ch}.`)] });
    }

    if (['variables', 'vars'].includes(sub)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color)
        .setTitle('Goodbye Variables')
        .setDescription(
          '`{user}` — Mention\n`{user.name}` — Username\n`{user.tag}` — Tag\n`{user.id}` — ID\n`{guild.name}` — Server name\n`{guild.id}` — Server ID\n`{membercount}` — Members\n`{membercount.ordinal}` — Ordinal members'
        )] });
    }
  }
};
