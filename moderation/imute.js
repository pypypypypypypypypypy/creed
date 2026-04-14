const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'imute',
        description: 'Image-mute a user in a channel',
        aliases: 'n/a',
        parameters: '(user) [reason]',
        information: 'MANAGE_ROLES',
        usage: 'imute (user) [reason]',
        example: 'imute user reason'
    }
],

    name: 'imute',
  aliases: ['imagemute'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`moderate_members\``)] });

    if (!args[0]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}imute <member> [reason]\``)] });

    const member = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!member) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Member not found.`)] });

    let muteRole = message.guild.roles.cache.find(r => r.name === 'Image Muted');
    if (!muteRole) {
      muteRole = await message.guild.roles.create({ name: 'Image Muted', reason: 'Image mute role' }).catch(() => null);
      if (!muteRole) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Could not find or create an \`Image Muted\` role.`)] });
      for (const [, channel] of message.guild.channels.cache) {
        await channel.permissionOverwrites.edit(muteRole, { EmbedLinks: false, AttachFiles: false }).catch(() => {});
      }
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';
    await member.roles.add(muteRole, reason);
    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Image muted **${member.user.tag}** — reason: **${reason}**`)] });
  }
};
