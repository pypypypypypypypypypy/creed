const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { isEnabled, hasAccount, openAccount, fmt } = require('./utils');

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'open',
        description: 'Open a loot box or package from your inventory',
        aliases: 'n/a',
        parameters: '(item)',
        information: 'n/a',
        usage: 'open (item)',
        example: 'open item'
    }
],

    name: 'open',

  run: async (client, message, args) => {
    if (!isEnabled(message.guild.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: The economy system is **disabled** in this server.`)] });

    if (hasAccount(message.guild.id, message.author.id)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You already have an economy account.`)] });
    }

    openAccount(message.guild.id, message.author.id);

    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Your economy account has been **opened**! You start with **${fmt(0)}** in your wallet.`)] });
  }
};
