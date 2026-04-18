const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'rmute',
        description: 'Reaction-mute a user',
        aliases: 'n/a',
        parameters: '(user) [reason]',
        information: 'MANAGE_ROLES',
        usage: 'rmute (user) [reason]',
        example: 'rmute user reason'
    }
],

    name: 'rmute',
  aliases: ['reactionmute'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`moderate_members\``)] });

    if (!args[0]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}rmute <member> [reason]\``)] });

    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!member) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Member not found.`)] });

    let muteRole = message.guild.roles.cache.find(r => r.name === 'Reaction Muted');
    if (!muteRole) {
      muteRole = await message.guild.roles.create({ name: 'Reaction Muted', reason: 'Reaction mute role' }).catch(() => null);
      if (!muteRole) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Could not find or create a \`Reaction Muted\` role.`)] });
      for (const [, channel] of message.guild.channels.cache) {
        await channel.permissionOverwrites.edit(muteRole, { AddReactions: false }).catch(() => {});
      }
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';
    await member.roles.add(muteRole, reason);
    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Reaction muted **${member.user.tag}** — reason: **${reason}**`)] });
  }
};
