const { EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { approve } = require('../emojis.json');
const { warn } = require('../emojis.json');

module.exports = {
  name: "setme",
  category: 'configuration',
  help: [
    { name: 'setme', description: 'Automatically set up moderation roles and channels', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'setme', example: 'setme' },
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles) || !message.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`manage_roles\` or \`manage_channels\``)] });

    const statusMsg = await message.channel.send({ embeds: [new EmbedBuilder().setColor("#6495ED").setDescription(`:gear: ${message.author}: Working moderation setup...`)] });

    try {
      await message.guild.roles.create({ name: 'muted', permissions: [] });
      await message.guild.roles.create({ name: 'jailed', permissions: [] });
      await message.guild.channels.create({
        name: 'jailed',
        type: ChannelType.GuildText,
        position: 0
      });
      await statusMsg.edit({ embeds: [new EmbedBuilder().setColor("#a3eb7b").setDescription(`${approve} ${message.author}: **Moderation system set** up has been completed. Please make sure that all of your channels and roles have been configured properly.`)] });
    } catch (e) {
      await statusMsg.edit({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Failed to complete setup: \`${e.message}\``)] });
    }
  }
};
