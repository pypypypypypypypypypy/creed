const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');

const wyr = [
  "Would you rather be invisible or able to fly?",
  "Would you rather have no internet or no music for a year?",
  "Would you rather be rich and hated or broke and loved?",
  "Would you rather know when you die or how you die?",
  "Would you rather always speak your mind or never speak again?",
  "Would you rather fight one horse-sized duck or 100 duck-sized horses?",
  "Would you rather live without your phone or without music?",
  "Would you rather always be 10 minutes late or 20 minutes early?",
  "Would you rather have unlimited money but no friends, or be broke with great friends?",
  "Would you rather eat only pizza for a year or only salad?",
  "Would you rather be famous and lonely or unknown and loved?",
  "Would you rather never be able to lie or never be able to keep a secret?",
];

function buildEmbed() {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle('🤔 Would You Rather...')
    .setDescription(wyr[Math.floor(Math.random() * wyr.length)])
    .setTimestamp();
}

module.exports = {
  category: 'fun',
  name: 'wouldyourather',
  aliases: ['wyr'],
  help: [{ name: 'wouldyourather', description: 'Get a would-you-rather question', aliases: 'wyr', parameters: 'n/a', information: 'n/a', usage: 'wouldyourather', example: 'wyr' }],

  slashData: {
    name: 'wouldyourather',
    description: 'Get a random would-you-rather question',
    dm_permission: true,
    options: [],
  },
  runSlash: async (client, interaction) => {
    await interaction.reply({ embeds: [buildEmbed()] });
  },

  run: async (client, message, args) => {
    message.channel.send({ embeds: [buildEmbed()] });
  }
};
