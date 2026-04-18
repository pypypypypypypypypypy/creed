const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { approve } = require('../emojis.json');
const { warn } = require('../emojis.json');
const { color } = require('../config.json');
const { deny } = require('../emojis.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'setsplash',
        description: 'Set the server invite splash image',
        aliases: 'n/a',
        parameters: '(image/url)',
        information: 'MANAGE_GUILD',
        usage: 'setsplash (image/url)',
        example: 'setsplash image/url'
    }
],

    name: "setsplash",

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`manage_guild\``)] });
    if (!message.guild.features.includes("SPLASH")) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: This command requires: Guild \`SPLASH\` feature`)] });

    let splash = message.attachments.first()?.url || args[0];

    if (!splash) {
      const embed = new EmbedBuilder()
        .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
        .setTitle('Command: setsplash')
        .setDescription('Set a new guild splash')
        .addFields(
          { name: '**Aliases**', value: 'N/A', inline: true },
          { name: '**Parameters**', value: 'url', inline: true },
          { name: '**Information**', value: `${warn} Manage Guild`, inline: true },
          { name: '**Usage**', value: '```Syntax: setsplash (url)\nExample: setsplash media.discordapp.com/attachments/871...png```' }
        )
        .setFooter({ text: `Module: servers` })
        .setTimestamp()
        .setColor(color);
      return message.channel.send({ embeds: [embed] });
    }

    message.guild.setSplash(splash).then(() => {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Successfully set the guild splash to [**this image**](${splash})`)] });
    }).catch(() => {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Failed to set the guild splash`)] });
    });
  }
};
