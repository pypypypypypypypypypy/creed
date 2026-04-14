const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');

const wyr = [
  "Would you rather be invisible or fly?",
  "Would you rather have no internet or no music?",
  "Would you rather be rich or famous?"
];

module.exports = {
  category: 'fun',
  help: [
    {
        name: 'wouldyourather',
        description: 'Get a would-you-rather question',
        aliases: 'wyr',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'wouldyourather',
        example: 'wouldyourather'
    }
],

    name: 'wouldyourather',
  aliases: ['wyr'],

  run: async (client, message, args) => {
    const question = wyr[Math.floor(Math.random() * wyr.length)];

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('🤔 Would You Rather...')
      .setDescription(question)
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
