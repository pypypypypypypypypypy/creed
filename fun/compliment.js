const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');

const compliments = [
  'You have such a wonderful smile!', 'Your kindness is contagious.',
  'You always know how to make people feel better.', 'You are incredibly talented!',
  'The world is a better place because of you.', 'Your positivity is inspiring.',
  'You bring out the best in everyone around you.', 'You are absolutely amazing!',
  'Your creativity is truly impressive.', 'You light up every room you walk into.',
  'You have an incredible work ethic.', 'Your perspective is refreshing.',
  'You make hard things look easy.', 'You are genuinely one of a kind.'
];

function buildEmbed(target) {
  return new EmbedBuilder()
    .setColor(color)
    .setDescription(`💌 ${target}: ${compliments[Math.floor(Math.random() * compliments.length)]}`)
    .setTimestamp();
}

module.exports = {
  category: 'fun',
  name: 'compliment',
  help: [{ name: 'compliment', description: 'Give someone a compliment', aliases: 'n/a', parameters: '[user]', information: 'n/a', usage: 'compliment [user]', example: 'compliment @user' }],

  slashData: {
    name: 'compliment',
    description: 'Give someone a compliment',
    dm_permission: true,
    options: [{ type: 6, name: 'user', description: 'Who to compliment (default: you)', required: false }],
  },
  runSlash: async (client, interaction) => {
    const target = interaction.options.getUser('user') || interaction.user;
    await interaction.reply({ embeds: [buildEmbed(`<@${target.id}>`)] });
  },

  run: async (client, message, args) => {
    const target = message.mentions.users.first() || message.author;
    message.channel.send({ embeds: [buildEmbed(`<@${target.id}>`)] });
  }
};
