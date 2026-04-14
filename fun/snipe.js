const { EmbedBuilder } = require('discord.js');
const { color } = require("../config.json");

module.exports = {
  name: "snipe",
  aliases: ["s"],
  category: 'fun',
  help: [
    { name: 'snipe', description: 'Snipe the last deleted message in the channel', aliases: 's', parameters: '[index]', information: 'n/a', usage: 'snipe [index]', example: 'snipe' },
  ],

  run: async (client, message, args) => {
    const index = Math.max(1, parseInt(args[0]) || 1) - 1;
    const snipes = client.snipes?.get(message.channel.id);

    if (!snipes || snipes.length === 0)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: No **recently deleted messages** were found in this channel`)] });

    if (index >= snipes.length)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: There are only **${snipes.length}** sniped message(s) in this channel`)] });

    const msg = snipes[index];
    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: msg.author, iconURL: msg.authorAvatar })
      .setDescription(msg.content || '*(no content)*')
      .setFooter({ text: `${index + 1}/${snipes.length} • sniped by ${message.author.tag}` })
      .setTimestamp(msg.timestamp);

    if (msg.image) embed.setImage(msg.image);

    return message.channel.send({ embeds: [embed] });
  }
};
