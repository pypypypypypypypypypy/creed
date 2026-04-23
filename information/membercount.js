const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js')
const Discord = { MessageEmbed: EmbedBuilder };
const { color } = require("../config.json");

module.exports = {
  category: 'information',
  help: [
    {
        name: 'membercount',
        description: 'View the current server member count',
        aliases: 'mc',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'membercount',
        example: 'membercount'
    }
],

    name: "membercount",
  aliases: ["mc"],
  category: "information",

  run: async (client, message, args) => {
    let mentionedMember = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!mentionedMember) mentionedMember = message.member;
    
    const botCount = message.guild.members.cache.filter(m => m.user.bot).size;

    const membercountEmbed = new EmbedBuilder()
      .setColor(mentionedMember.displayHexColor || color)
      .setAuthor({
        name: `${message.guild.name} statistics`,
        iconURL: message.guild.iconURL({ forceStatic: false }) || undefined
      })
      .setTimestamp()
      .addFields(
        {
          name: "**Users**",
          value: `${message.guild.memberCount}`,
          inline: true
        },
        {
          name: "**Humans**",
          value: `${message.guild.memberCount - botCount}`,
          inline: true
        },

        {
          name: "**Bots**",
          value: `${botCount}`,
          inline: true
        },
      )

    return message.channel.send({ embeds: [membercountEmbed] })
  }
}