const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');

const compliments = [
  'You have such a wonderful smile!',
  'Your kindness is contagious.',
  'You always know how to make people feel better.',
  'You are incredibly talented!',
  'The world is a better place because of you.',
  'Your positivity is inspiring.',
  'You bring out the best in everyone around you.',
  'You are absolutely amazing!',
  'Your creativity is truly impressive.',
  'You light up every room you walk into.'
];

module.exports = {
  category: 'fun',
  help: [
    {
        name: 'compliment',
        description: 'Give a compliment to a user',
        aliases: 'n/a',
        parameters: '[user]',
        information: 'n/a',
        usage: 'compliment [user]',
        example: 'compliment user'
    }
],

    name: 'compliment',

  run: async (client, message, args) => {
    const target = message.mentions.users.first() || message.author;
    const comp = compliments[Math.floor(Math.random() * compliments.length)];

    const embed = new EmbedBuilder()
      .setColor(color)
      .setDescription(`💌 ${target}: ${comp}`)
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
