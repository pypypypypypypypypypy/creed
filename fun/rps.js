const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { color } = require('../config.json');
const db = require('../db');

const choices = { rock: '🪨', paper: '📄', scissors: '✂️' };
const wins = { rock: 'scissors', paper: 'rock', scissors: 'paper' };

module.exports = {
  category: 'fun',
  help: [
    {
        name: 'rps',
        description: 'Play rock paper scissors',
        aliases: 'rockpaperscissors',
        parameters: '(rock/paper/scissors)',
        information: 'n/a',
        usage: 'rps (rock/paper/scissors)',
        example: 'rps rock/paper/scissors'
    }
],

    name: 'rps',
  aliases: ['rockpaperscissors'],

  run: async (client, message, args) => {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('rps_rock').setLabel('🪨 Rock').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('rps_paper').setLabel('📄 Paper').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('rps_scissors').setLabel('✂️ Scissors').setStyle(ButtonStyle.Secondary)
    );

    const embed = new EmbedBuilder().setColor(color).setTitle('Rock Paper Scissors').setDescription('Choose your move!');
    const msg = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 30000, max: 1 });

    collector.on('collect', async i => {
      const userChoice = i.customId.replace('rps_', '');
      const botChoice = Object.keys(choices)[Math.floor(Math.random() * 3)];

      let result;
      if (userChoice === botChoice) result = "It's a **draw**!";
      else if (wins[userChoice] === botChoice) result = 'You **win**! 🎉';
      else result = 'You **lose**! 😢';

      const resultEmbed = new EmbedBuilder().setColor(color)
        .setTitle('Rock Paper Scissors')
        .setDescription(`You: ${choices[userChoice]} | Bot: ${choices[botChoice]}\n\n${result}`);

      await i.update({ embeds: [resultEmbed], components: [] });
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') msg.edit({ components: [] }).catch(() => {});
    });
  }
};
