const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { color } = require("../config.json");
const { isOwner } = require('../utils/owners');

function getEmojis() {
  delete require.cache[require.resolve('../emojis.json')];
  return require('../emojis.json');
}

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
    const e = getEmojis();
    if (!isOwner(message.author.id) && !message.member.permissions.has(PermissionFlagsBits.ManageMessages))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${e.warn} ${message.author}: You're **missing** permission: \`manage_messages\``)] });

    client.snipes?.delete(message.channel.id);

    return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${e.approve} ${message.author}: Cleared snipes`)] });
  }
};
