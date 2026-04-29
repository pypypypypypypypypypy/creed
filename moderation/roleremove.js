const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js')
const Discord = { MessageEmbed: EmbedBuilder };
const { default_prefix, color } = require("../config.json");
const { remove } = require('../emojis.json')
const { deny } = require('../emojis.json')
const { warn } = require('../emojis.json')
const { paginate } = require('../utils/paginate');
const db = require('../db');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'roleremove',
        description: 'Remove a role from all members',
        aliases: 'rr',
        parameters: '(role)',
        information: 'MANAGE_ROLES',
        usage: 'roleremove (role)',
        example: 'roleremove role'
    }
],

    name: "roleremove",
  aliases: ["rr"],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`);
    if (prefix === null) { prefix = default_prefix; };

    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_roles\``)] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`manage_roles\``)] });

    const mentionedMember = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]) || message.guild.roles.cache.find(r => r.name === args.slice(1).join(' '));

    const rolehelpEmbed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: roleremove')
      .setDescription('Removes role from a member')
      .addFields({ name: '**Aliases**', value: 'rr', inline: true })
      .addFields({ name: '**Parameters**', value: 'member, role', inline: true })
      .addFields({ name: '**Information**', value: `${warn} Manage Roles`, inline: true })
      .addFields({ name: '**Usage**', value: '\`\`\`Syntax: roleremove (member) <role name>\nExample: roleremove four#0001 Owner\`\`\`' })
      .setFooter({ text: `Module: moderation` })
      .setTimestamp()
      .setColor(color)
    if (!args[0]) return paginate(message, [
      { name: 'roleremove', description: 'Remove a role from a member', aliases: 'rr', parameters: '(member) (role)', information: 'MANAGE_ROLES', usage: `${prefix}roleremove (member) <role name>`, example: `${prefix}roleremove @user Owner` }
    ], 'moderation');
    if (!mentionedMember) return message.channel.send({ embed: { color: "efa23a", description: `${warn} ${message.author}: Please state a role to remove from the user. Run \`${prefix}roleremove\` to view the correct **syntax**` } })

    if (mentionedMember.roles.highest.position >= message.member.roles.highest.position) return message.channel.send({ embeds: [new EmbedBuilder().setColor("#fe6464").setDescription(`${deny} ${message.author}: You cannot remove a role that is **higher** than **yours**`)] });
    if (!args[1]) return message.channel.send({ embed: { color: "efa23a", description: `${warn} ${message.author}: Please state a role to remove from the user. Run \`${prefix}roleremove\` to view the correct **syntax**` } })
    if (!role) return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: That role **doesn't** exist, state a valid role`)] });
    if (message.member.roles.highest.position <= role.position) message.channel.send({ embeds: [new EmbedBuilder().setColor("#fe6464").setDescription(`${deny} ${message.author}: You cannot remove a role that is **higher** than **yours**`)] });

    await mentionedMember.roles.remove(role.id)
    const rolegiveEmbed = new EmbedBuilder()
      .setDescription(`${remove} ${message.author}: Removed ${role} from ${mentionedMember}`)
      .setColor("#46bcec")
    return message.channel.send({ embeds: [rolegiveEmbed] })
  }
}