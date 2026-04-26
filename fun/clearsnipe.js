const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { color } = require("../config.json");

const SUCCESS = '<:success:1496708562695618641>';

module.exports = {
  category: 'fun',
  help: [
    {
      name: 'clearsnipe',
      description: 'Clear the sniped message cache for this channel',
      aliases: 'cs, csnipe',
      parameters: 'n/a',
      information: 'MANAGE_MESSAGES',
      usage: 'clearsnipe',
      example: 'clearsnipe'
    }
  ],

  name: "clearsnipe",
  aliases: ["cs", "csnipe"],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: You're missing permission: \`manage_messages\``)] });

    client.snipes?.delete(message.channel.id);

    return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${SUCCESS} ${message.author}: Cleared snipes`)] });
  }
};
