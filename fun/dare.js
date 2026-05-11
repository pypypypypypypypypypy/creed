const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');

const dares = [
  "Send a random emoji in chat right now.", "Type your next message with your eyes closed.",
  "Say something genuinely nice about the last person who spoke.", "Set your status to something embarrassing for 10 minutes.",
  "Send a voice message saying your favorite song badly.", "Share the last photo in your camera roll.",
  "Compliment someone you normally wouldn't.", "Type everything in ALL CAPS for the next 5 minutes.",
  "Do 10 push-ups and report back.", "Roast yourself in 2 sentences.",
];

module.exports = {
  category: 'fun',
  name: 'dare',
  help: [{ name: 'dare', description: 'Get a random dare', aliases: 'n/a', parameters: 'n/a', information: 'n/a', usage: 'dare', example: 'dare' }],

  slashData: {
    name: 'dare',
    description: 'Get a random dare',
    dm_permission: true,
    options: [],
  },
  runSlash: async (client, interaction) => {
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(color).setTitle('😈 Dare').setDescription(dares[Math.floor(Math.random() * dares.length)]).setTimestamp()] });
  },

  run: async (client, message, args) => {
    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('😈 Dare').setDescription(dares[Math.floor(Math.random() * dares.length)]).setTimestamp()] });
  }
};
