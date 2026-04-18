const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js')
const Discord = { MessageEmbed: EmbedBuilder };
const { color } = require("../config.json");
const { approve } = require('../emojis.json')
const { warn } = require('../emojis.json')
const { paginate } = require('../utils/paginate');
const db = require('../db');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'rolecreate',
        description: 'Create a new role',
        aliases: 'rc',
        parameters: '(name) [color]',
        information: 'MANAGE_ROLES',
        usage: 'rolecreate (name) [color]',
        example: 'rolecreate name color'
    }
],

    name: "rolecreate",
  aliases: ["rc"],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_roles\``)] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`manage_roles\``)] });


    const rcEmbed = new EmbedBuilder()
    .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
    .setTitle('Command: rolecreate')
    .setDescription('Creates a role with optional color')
    .addFields({ name: '**Aliases**', value: 'rc', inline: true })
    .addFields({ name: '**Parameters**', value: 'role name, color', inline: true })
    .addFields({ name: '**Information**', value: `${warn} Manage Roles`, inline: true })
    .addFields({ name: '**Usage**', value: '\`\`\`Syntax: rolecreate <role name> (color)\nExample: rolecreate four #ff0000\`\`\`' })
    .setFooter({ text: `Module: moderation` })
    .setTimestamp()
    .setColor(color)
    if (!args[0]) {
      let prefix = db.get(`prefix_${message.guild.id}`);
      if (prefix === null) prefix = require('../config.json').default_prefix;
      return paginate(message, [
        { name: 'rolecreate', description: 'Create a role with an optional color', aliases: 'rc', parameters: '(role name) [color]', information: 'MANAGE_ROLES', usage: `${prefix}rolecreate (role name) <color>`, example: `${prefix}rolecreate Member #ff0000` }
      ], 'moderation');
    }

    if (args.length == 0) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: You don't have enough arguments. Format: role roleName optional: color hex`)] });
    }

    const roleName = args.join(' ').trim();

    if (args.length > 1) {

      let possibleHex = null;
      if (roleName.length > 6) { possibleHex = roleName.substr(roleName.length - 6); }
      let wasHex = false;
      if (possibleHex !== null && /^[0-9A-F]{6}$/i.test(possibleHex)) { wasHex = true; }

      const updatedRoleName = wasHex == true ? roleName.replace(possibleHex, '') : roleName;

      if (wasHex) {
        await message.guild.roles.create({
          data: {
            name: updatedRoleName,
            color: possibleHex
          }
        });
      }
      else {
        await message.guild.roles.create({
          data: {
            name: updatedRoleName
          }
        });
      }

      await message.channel.send({ embeds: [new EmbedBuilder().setColor("#a3eb7b").setDescription(`${approve} ${message.author}: Created role **${updatedRoleName}**`)] });
    }
    else {
      await message.guild.roles.create({
        data: {
          name: roleName
        }
      });

      await message.channel.send({ embeds: [new EmbedBuilder().setColor("#a3eb7b").setDescription(`${approve} ${message.author}: Created role **${roleName}**`)] });
    }
  }
}