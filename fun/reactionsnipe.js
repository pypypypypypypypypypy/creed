const { EmbedBuilder } = require('discord.js');
const { color } = require("../config.json");

module.exports = {
  category: 'fun',
  help: [
    {
        name: 'reactionsnipe',
        description: 'Show the most recently removed reaction',
        aliases: 'rs, rsnipe',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'reactionsnipe',
        example: 'reactionsnipe'
    }
],

    name: "reactionsnipe",
  aliases: ["rs", "rsnipe"],

  run: async (client, message, args) => {
    const index = Math.max(1, parseInt(args[0]) || 1) - 1;
    const snipes = client.reactionSnipes?.get(message.channel.id);

    if (!snipes || snipes.length === 0)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: No **recently removed reactions** were found in this channel`)] });

    if (index >= snipes.length)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: There are only **${snipes.length}** reaction snipe(s) in this channel`)] });

    const r = snipes[index];
    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: r.author, iconURL: r.authorAvatar })
      .setDescription(`${r.author} removed ${r.emoji} from [this message](${r.messageUrl})`)
      .setFooter({ text: `${index + 1}/${snipes.length} • sniped by ${message.author.tag}` })
      .setTimestamp(r.timestamp);

    return message.channel.send({ embeds: [embed] });
  }
};
