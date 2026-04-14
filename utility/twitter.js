const { EmbedBuilder } = require('discord.js');
const { color } = require("../config.json");
const { warn } = require('../emojis.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'twitter',
        description: 'Look up a Twitter/X user',
        aliases: 'twit',
        parameters: '(username)',
        information: 'n/a',
        usage: 'twitter (username)',
        example: 'twitter username'
    }
],

    name: "twitter",
  aliases: ['twit'],

  run: async (client, message, args) => {
    if (!args[0]) {
      const twitterEmbed = new EmbedBuilder()
        .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
        .setTitle('Command: twitter')
        .setDescription('Check a twitter account profile')
        .addFields(
          { name: '**Aliases**', value: 'twit', inline: true },
          { name: '**Parameters**', value: 'handle', inline: true },
          { name: '**Information**', value: `N/A`, inline: true },
          { name: '**Usage**', value: '```Syntax: twitter (subcommand) <args>\nExample: twitter @fourr```' }
        )
        .setFooter({ text: `Module: information` })
        .setTimestamp()
        .setColor(color);
      return message.channel.send({ embeds: [twitterEmbed] });
    }

    return message.channel.send({ embeds: [new EmbedBuilder().setColor("efa23a").setDescription(`${warn} ${message.author}: The Twitter API integration is currently unavailable`)] });
  }
};
