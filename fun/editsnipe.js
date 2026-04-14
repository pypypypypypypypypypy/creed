const { EmbedBuilder } = require('discord.js');
const { color } = require("../config.json");

module.exports = {
  category: 'fun',
  help: [
    {
        name: 'editsnipe',
        description: 'Show the most recently edited message',
        aliases: 'es, esnipe',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'editsnipe',
        example: 'editsnipe'
    }
],

    name: "editsnipe",
  aliases: ["es", "esnipe"],

  run: async (client, message, args) => {
    const index = Math.max(1, parseInt(args[0]) || 1) - 1;
    const snipes = client.editSnipes?.get(message.channel.id);

    if (!snipes || snipes.length === 0)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: No **recently edited messages** were found in this channel`)] });

    if (index >= snipes.length)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: There are only **${snipes.length}** edit snipe(s) in this channel`)] });

    const msg = snipes[index];
    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: msg.author, iconURL: msg.authorAvatar })
      .addFields(
        { name: 'Before', value: msg.before || '*(empty)*' },
        { name: 'After', value: msg.after || '*(empty)*' }
      )
      .setFooter({ text: `${index + 1}/${snipes.length} • sniped by ${message.author.tag}` })
      .setTimestamp(msg.timestamp);

    return message.channel.send({ embeds: [embed] });
  }
};
