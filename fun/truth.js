const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');

const truths = [
  "What is your biggest fear?",
  "Have you ever lied to a friend?",
  "What is your most embarrassing moment?"
];

module.exports = {
  category: 'fun',
  help: [
    {
        name: 'truth',
        description: 'Get a random truth question',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'truth',
        example: 'truth'
    }
],

    name: 'truth',

  run: async (client, message, args) => {
    const question = truths[Math.floor(Math.random() * truths.length)];

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('💬 Truth')
      .setDescription(question)
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
