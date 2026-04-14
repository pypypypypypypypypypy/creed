const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js')
const Discord = { MessageEmbed: EmbedBuilder };
const { color } = require("../config.json");
const { warn } = require('../emojis.json')

module.exports = {
  category: 'information',
  help: [
    {
        name: 'members',
        description: 'View members with a specific role',
        aliases: 'n/a',
        parameters: '(role)',
        information: 'n/a',
        usage: 'members (role)',
        example: 'members role'
    }
],

    name: "members",
  aliases: ["inrole"],

  run: async (client, message, args) => {
    if (args.includes("@everyone")) return;

    if (args.includes("@here")) return;

    const inroleEmbed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: members')
      .setDescription('View members in a role')
      .addFields({ name: '**Aliases**', value: 'inrole', inline: true })
      .addFields({ name: '**Parameters**', value: 'role', inline: true })
      .addFields({ name: '**Information**', value: `N/A`, inline: true })
      .addFields({ name: '**Usage**', value: '\`\`\`Syntax: members <role>\nExample: members Friends\`\`\`' })
      .setFooter({ text: `Module: information` })
      .setTimestamp()
      .setColor(color)
    if (!args[0]) return message.channel.send({ embeds: [inroleEmbed] })

    let role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]) || message.guild.roles.cache.find(r => r.name.toLowerCase() === args.join(' ').toLocaleLowerCase());
    if (!role) return message.channel.send({ embeds: [new EmbedBuilder().setColor("#efa23a").setDescription(`${warn} ${message.author}: You need to enter a **valid** role`)] });

    let membersWithRole = message.guild.members.cache.filter(member => {
      return member.roles.cache.find(r => r.name === role.name);
    }).map(member => {
      return member.user.tag;
    })
    if (membersWithRole > 2048) return message.channel.send('List is too long')

    let roleListEmbed = new EmbedBuilder()
      .setColor(role.hexColor)
      .setAuthor(`${message.author.username}`, message.author.displayAvatarURL({
        forceStatic: false,
        size: 2048
      }))
      .setTitle(`Members in '${role.name}'`)
      .setDescription(`**${membersWithRole.join("\n")}**`);
    message.channel.send({ embeds: [roleListEmbed] });
  }
}