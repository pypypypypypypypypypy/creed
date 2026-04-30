const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');

const insults = [
  'You are the human equivalent of a participation trophy.',
  'If brains were gas, you wouldn\'t have enough to power an ant\'s motorcycle around a Cheerio.',
  'You are proof that even evolution can have a bad day.',
  'I would roast you, but my mom said I can\'t burn trash.',
  'You\'re not the dumbest person alive, but you better hope they don\'t die.',
  'Light travels faster than sound, which is why you seemed bright until you spoke.',
  'You are as useful as a waterproof towel.',
  'I\'d explain it to you, but I left my crayons at home.',
  'You\'re the reason the gene pool needs a lifeguard.',
  'Some day you\'ll go far. I hope you stay there.'
];

module.exports = {
  category: 'fun',
  help: [
    {
        name: 'insult',
        description: 'Send a playful insult',
        aliases: 'n/a',
        parameters: '[user]',
        information: 'n/a',
        usage: 'insult [user]',
        example: 'insult user'
    }
],

    name: 'insult',

  run: async (client, message, args) => {
    const target = message.mentions.users.first() || message.author;
    const insult = insults[Math.floor(Math.random() * insults.length)];

    const embed = new EmbedBuilder()
      .setColor('#FFFFFF')
      .setDescription(`😈 ${target}: ${insult}`)
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
