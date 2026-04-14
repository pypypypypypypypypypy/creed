const { EmbedBuilder } = require('discord.js');
const { color } = require("../config.json");

module.exports = {
  category: 'fun',
  help: [
    {
        name: 'imagesnipe',
        description: 'Show the most recently deleted image',
        aliases: 'is, isnipe',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'imagesnipe',
        example: 'imagesnipe'
    }
],

    name: "imagesnipe",
  aliases: ["is", "isnipe"],

  run: async (client, message, args) => {
    const index = Math.max(1, parseInt(args[0]) || 1) - 1;
    const snipes = client.snipes?.get(message.channel.id);

    const imageSnipes = (snipes || []).filter(s => s.image);

    if (!imageSnipes || imageSnipes.length === 0)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: No **recently deleted images** were found in this channel`)] });

    if (index >= imageSnipes.length)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: There are only **${imageSnipes.length}** image snipe(s) in this channel`)] });

    const msg = imageSnipes[index];
    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: msg.author, iconURL: msg.authorAvatar })
      .setImage(msg.image)
      .setFooter({ text: `${index + 1}/${imageSnipes.length} • sniped by ${message.author.tag}` })
      .setTimestamp(msg.timestamp);

    if (msg.content) embed.setDescription(msg.content);

    return message.channel.send({ embeds: [embed] });
  }
};
