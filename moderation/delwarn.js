const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'delwarn',
        description: 'Delete a specific warning',
        aliases: 'dw',
        parameters: '(user) (case id)',
        information: 'MANAGE_GUILD',
        usage: 'delwarn (user) (case id)',
        example: 'delwarn user case'
    }
],

    name: 'delwarn',
  aliases: ['removewarn', 'warnremove'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`moderate_members\``)] });

    if (!args[0] || !args[1]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}delwarn <member> <warn number>\``)] });

    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!member) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Member not found.`)] });

    const warnIndex = parseInt(args[1]) - 1;
    const warns = db.get(`warns.${message.guild.id}.${member.id}`) || [];

    if (!warns.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: **${member.user.tag}** has no warnings.`)] });
    if (warnIndex < 0 || warnIndex >= warns.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Invalid warning number. Use \`${prefix}warnings @user\` to see warn numbers.`)] });

    const removed = warns.splice(warnIndex, 1)[0];
    db.set(`warns.${message.guild.id}.${member.id}`, warns);

    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Removed warning **#${warnIndex + 1}** from **${member.user.tag}**: *${removed.reason}*`)] });
  }
};
