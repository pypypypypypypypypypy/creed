const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const db = require('../db');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'unjail',
        description: 'Release a user from jail',
        aliases: 'n/a',
        parameters: '(user) [reason]',
        information: 'MANAGE_ROLES',
        usage: 'unjail (user) [reason]',
        example: 'unjail user reason'
    }
],

    name: 'unjail',

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_messages\``)] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`manage_roles\``)] });

    if (!args[0])
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please mention a member to unjail`)] });

    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!member)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Could not find that member`)] });

    const jailRole = message.guild.roles.cache.find(r => r.name === 'jailed');
    if (!jailRole || !member.roles.cache.has(jailRole.id))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: **${member.user.tag}** is not currently jailed`)] });

    await member.roles.remove(jailRole).catch(() => {});
    db.delete(`jailed_${message.guild.id + member.id}`);
    db.delete(`jailtime_${member.id + message.guild.id}`);

    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: **${member.user.tag}** has been unjailed`)] });

    const log = db.get(`logschannel_${message.guild.id}`);
    if (log) {
      const logEmbed = new EmbedBuilder()
        .setTitle('Penal: Unjail')
        .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }))
        .setColor(color)
        .addFields(
          { name: 'Moderator', value: `${message.author}`, inline: true },
          { name: 'User', value: `<@${member.id}>`, inline: true }
        )
        .setTimestamp();
      const logChannel = message.guild.channels.cache.get(log);
      if (logChannel) logChannel.send({ embeds: [logEmbed] }).catch(() => {});
    }
  }
};
