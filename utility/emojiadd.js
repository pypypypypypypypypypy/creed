const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { color } = require("../config.json");
const { approve } = require('../emojis.json');
const { warn } = require('../emojis.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'emojiadd',
        description: 'Add an emoji from another server',
        aliases: 'copy',
        parameters: '(emoji) [name]',
        information: 'MANAGE_EXPRESSIONS',
        usage: 'emojiadd (emoji) [name]',
        example: 'emojiadd emoji name'
    }
],

    name: "emojiadd",
  aliases: ["copy"],

  run: (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_emojis\``)] });
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`manage_emojis\``)] });

    if (!args[0]) {
      const emojiEmbed = new EmbedBuilder()
        .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
        .setTitle('Command: emojiadd')
        .setDescription('Downloads emote and adds to server')
        .addFields(
          { name: '**Aliases**', value: 'copy', inline: true },
          { name: '**Parameters**', value: 'emoji, characters', inline: true },
          { name: '**Information**', value: `${warn} Manage Emojis`, inline: true },
          { name: '**Usage**', value: '```Syntax: emojiadd (emoji or url)\nExample: emojiadd cdn.discordapp.com/emojis/768...png```' }
        )
        .setFooter({ text: `Module: information` })
        .setTimestamp()
        .setColor(color);
      return message.channel.send({ embeds: [emojiEmbed] });
    }

    for (const emojis of args) {
      const match = emojis.match(/<a?:(\w+):(\d+)>/);
      if (match) {
        const animated = emojis.startsWith('<a:');
        const emojiExt = animated ? '.gif' : '.png';
        const emojiURL = `https://cdn.discordapp.com/emojis/${match[2] + emojiExt}`;
        message.guild.emojis
          .create({ attachment: emojiURL, name: match[1] })
          .then((emoji) => message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Added \`:${emoji.name}:\` to this guild`)] }))
          .catch(() => message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Failed to add that emoji`)] }));
      }
    }
  }
};
