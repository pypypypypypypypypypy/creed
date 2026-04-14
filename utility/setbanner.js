const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { approve } = require('../emojis.json');
const { warn } = require('../emojis.json');
const { color } = require('../config.json');
const { deny } = require('../emojis.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'setbanner',
        description: 'Set the server banner',
        aliases: 'n/a',
        parameters: '(image/url)',
        information: 'MANAGE_GUILD',
        usage: 'setbanner (image/url)',
        example: 'setbanner image/url'
    }
],

    name: "setbanner",

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor("efa23a").setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor("efa23a").setDescription(`${warn} ${message.author}: I'm **missing** permission: \`manage_guild\``)] });
    if (!message.guild.features.includes("BANNER")) return message.channel.send({ embeds: [new EmbedBuilder().setColor("fe6464").setDescription(`${deny} ${message.author}: This command requires: Guild \`BANNER\` feature`)] });

    let banner = message.attachments.first()?.url || args[0];

    if (!banner) {
      const embed = new EmbedBuilder()
        .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
        .setTitle('Command: setbanner')
        .setDescription('Set a new guild banner')
        .addFields(
          { name: '**Aliases**', value: 'N/A', inline: true },
          { name: '**Parameters**', value: 'url', inline: true },
          { name: '**Information**', value: `${warn} Manage Guild`, inline: true },
          { name: '**Usage**', value: '```Syntax: setbanner (url)\nExample: setbanner media.discordapp.com/attachments/871...png```' }
        )
        .setFooter({ text: `Module: servers` })
        .setTimestamp()
        .setColor(color);
      return message.channel.send({ embeds: [embed] });
    }

    message.guild.setBanner(banner).then(() => {
      message.channel.send({ embeds: [new EmbedBuilder().setColor("a3eb7b").setDescription(`${approve} ${message.author}: Successfully set the guild banner to [**this image**](${banner})`)] });
    }).catch(() => {
      message.channel.send({ embeds: [new EmbedBuilder().setColor("efa23a").setDescription(`${warn} ${message.author}: Failed to set the guild banner`)] });
    });
  }
};
