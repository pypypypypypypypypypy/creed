const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');

const truths = [
  "What is your biggest fear?", "Have you ever lied to a close friend?",
  "What is your most embarrassing moment?", "What is one thing you've never told anyone?",
  "What is the worst thing you've ever done?", "Have you ever cheated on a game or test?",
  "What is something you are ashamed of?", "Who is your secret crush right now?",
  "What is the most childish thing you still do?", "Have you ever ghosted someone?",
  "What is a lie you've told recently?", "What do you secretly judge people for?",
];

module.exports = {
  category: 'fun',
  name: 'truth',
  help: [{ name: 'truth', description: 'Get a random truth question', aliases: 'n/a', parameters: 'n/a', information: 'n/a', usage: 'truth', example: 'truth' }],

  slashData: {
    name: 'truth',
    description: 'Get a random truth question',
    dm_permission: true,
    options: [],
  },
  runSlash: async (client, interaction) => {
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(color).setTitle('💬 Truth').setDescription(truths[Math.floor(Math.random() * truths.length)]).setTimestamp()] });
  },

  run: async (client, message, args) => {
    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('💬 Truth').setDescription(truths[Math.floor(Math.random() * truths.length)]).setTimestamp()] });
  }
};
