const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');

module.exports = {
  category: 'fun',
  name: 'randomnumber',
  aliases: ['rn', 'rand', 'rng'],
  help: [{ name: 'randomnumber', description: 'Generate a random number', aliases: 'rn, rand, rng', parameters: '[min] [max]', information: 'n/a', usage: 'randomnumber [min] [max]', example: 'randomnumber 1 100' }],

  slashData: {
    name: 'randomnumber',
    description: 'Generate a random number in a range',
    dm_permission: true,
    options: [
      { type: 4, name: 'min', description: 'Minimum (default 0)', required: false },
      { type: 4, name: 'max', description: 'Maximum (default 100)', required: false },
    ],
  },
  runSlash: async (client, interaction) => {
    const min = interaction.options.getInteger('min') ?? 0;
    const max = interaction.options.getInteger('max') ?? 100;
    if (min >= max) return interaction.reply({ content: 'Min must be less than max.', ephemeral: true });
    const result = Math.floor(Math.random() * (max - min + 1)) + min;
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(color).setTitle('🎲 Random Number').setDescription(`**${result}**\n\`Range: ${min} – ${max}\``).setTimestamp()] });
  },

  run: async (client, message, args) => {
    const min = parseInt(args[0]) || 0;
    const max = parseInt(args[1]) || 100;
    if (min >= max) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Min must be less than max.`)] });
    const result = Math.floor(Math.random() * (max - min + 1)) + min;
    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('🎲 Random Number').setDescription(`**${result}**\n\`Range: ${min} – ${max}\``).setTimestamp()] });
  }
};
