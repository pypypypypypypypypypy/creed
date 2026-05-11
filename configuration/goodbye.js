const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { paginate } = require('../utils/paginate');
const { parseEmbed, buildVars } = require('../utils/embedParser');

module.exports = {
  name: 'goodbye',
  aliases: ['bye', 'leave'],
  category: 'configuration',
  help: [
    { name: 'goodbye', description: 'Manage goodbye messages when members leave', aliases: 'bye, leave', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'goodbye', example: 'goodbye' },
    { name: 'goodbye channel', description: 'Set the goodbye channel', aliases: 'n/a', parameters: '(channel)', information: 'MANAGE_GUILD', usage: 'goodbye channel #channel', example: 'goodbye channel #goodbye' },
    { name: 'goodbye message', description: 'Set the goodbye message (supports all variables)', aliases: 'msg', parameters: '(message)', information: 'MANAGE_GUILD', usage: 'goodbye message (text)', example: 'goodbye message Goodbye {user.name}!' },
    { name: 'goodbye clear', description: 'Clear goodbye settings', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'goodbye clear', example: 'goodbye clear' },
    { name: 'goodbye test', description: 'Test the goodbye message', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'goodbye test', example: 'goodbye test' },
    { name: 'goodbye variables', description: 'Show all available variables', aliases: 'vars', parameters: 'n/a', information: 'n/a', usage: 'goodbye variables', example: 'goodbye variables' },
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });

    const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const sub = (args[0] || '').toLowerCase();
    const guildId = message.guild.id;

    if (!sub) return paginate(message, module.exports.help, 'configuration');

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
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Goodbye message set.\nRun \`${prefix}goodbye test\` to preview it.`)] });
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
      if (!msg)  return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: No goodbye message set.`)] });
      const ch = message.guild.channels.cache.get(chId);
      if (!ch)   return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Goodbye channel not found.`)] });

      const vars = buildVars(message);
      const payload = parseEmbed(msg, vars);
      if (payload && (payload.content || payload.embeds?.length)) {
        ch.send(payload).catch(() => {});
      } else {
        const { applyVars } = require('../utils/embedParser');
        ch.send(applyVars(msg, vars)).catch(() => {});
      }
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Test goodbye message sent to ${ch}.`)] });
    }

    if (['variables', 'vars'].includes(sub)) {
      return message.channel.send({
        embeds: [new EmbedBuilder()
          .setColor(color)
          .setTitle('Goodbye Variables')
          .setDescription(
            '**User**\n`{user}` `{user.name}` `{user.tag}` `{user.id}` `{user.avatar}` `{user.banner}` `{user.created_at}` `{user.created_at.ago}` `{user.discriminator}`\n\n' +
            '**Member**\n`{member.nickname}` `{member.display_name}` `{member.joined_at}` `{member.joined_at.ago}` `{member.top_role}` `{member.roles}` `{member.role_count}` `{member.boosting}`\n\n' +
            '**Guild**\n`{guild.name}` `{guild.id}` `{guild.icon}` `{guild.count}` `{membercount}` `{membercount.ordinal}` `{guild.owner}` `{guild.boost_count}` `{guild.boost_tier}` `{guild.created_at}` `{guild.vanity}`\n\n' +
            '**Channel**\n`{channel}` `{channel.name}` `{channel.id}` `{channel.topic}`\n\n' +
            '**Misc**\n`{unix}` `{date}` `{time}`\n\n' +
            '**Embed syntax**\n```{embed}$v{title: Bye {user.name}!}$v{description: ...}$v{color: #FF0000}$v{thumbnail: {user.avatar}}```'
          )
          .setFooter({ text: 'All variables work inside embed scripts too' })
        ]
      });
    }
  }
};
