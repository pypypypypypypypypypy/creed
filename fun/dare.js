const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');

const dares = [
  "Send a random emoji in chat",
  "Type with your eyes closed for 1 message",
  "Say something nice to someone here"
];

module.exports = {
  category: 'fun',
  help: [
    {
        name: 'dare',
        description: 'Get a random dare',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'dare',
        example: 'dare'
    }
],

    name: 'dare',

  run: async (client, message, args) => {
    const dare = dares[Math.floor(Math.random() * dares.length)];

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('😈 Dare')
      .setDescription(dare)
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
