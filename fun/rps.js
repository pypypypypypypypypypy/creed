const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { color } = require('../config.json');

const choices = { rock: '🪨', paper: '📄', scissors: '✂️' };
const wins = { rock: 'scissors', paper: 'rock', scissors: 'paper' };

async function playRPS(userId, replyFn, sendFn) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('rps_rock').setLabel('🪨 Rock').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('rps_paper').setLabel('📄 Paper').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('rps_scissors').setLabel('✂️ Scissors').setStyle(ButtonStyle.Secondary)
  );
  const msg = await replyFn(new EmbedBuilder().setColor(color).setTitle('Rock Paper Scissors').setDescription('Choose your move!'), row);
  const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === userId, time: 30000, max: 1 });
  collector.on('collect', async i => {
    const userChoice = i.customId.replace('rps_', '');
    const botChoice = Object.keys(choices)[Math.floor(Math.random() * 3)];
    let result;
    if (userChoice === botChoice) result = "It's a **draw**!";
    else if (wins[userChoice] === botChoice) result = 'You **win**! 🎉';
    else result = 'You **lose**! 😢';
    await i.update({ embeds: [new EmbedBuilder().setColor(color).setTitle('Rock Paper Scissors').setDescription(`You: ${choices[userChoice]} | Bot: ${choices[botChoice]}\n\n${result}`)], components: [] });
  });
  collector.on('end', (_, reason) => { if (reason === 'time') msg.edit({ components: [] }).catch(() => {}); });
}

module.exports = {
  category: 'fun',
  name: 'rps',
  aliases: ['rockpaperscissors'],
  help: [{ name: 'rps', description: 'Play rock paper scissors', aliases: 'rockpaperscissors', parameters: 'n/a', information: 'n/a', usage: 'rps', example: 'rps' }],

  slashData: {
    name: 'rps',
    description: 'Play rock paper scissors',
    dm_permission: true,
    options: [],
  },
  runSlash: async (client, interaction) => {
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(color).setTitle('Rock Paper Scissors').setDescription('Choose your move!')], components: [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('rps_rock').setLabel('🪨 Rock').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('rps_paper').setLabel('📄 Paper').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('rps_scissors').setLabel('✂️ Scissors').setStyle(ButtonStyle.Secondary)
    )] });
    const msg = await interaction.fetchReply();
    const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === interaction.user.id, time: 30000, max: 1 });
    collector.on('collect', async i => {
      const userChoice = i.customId.replace('rps_', '');
      const botChoice = Object.keys(choices)[Math.floor(Math.random() * 3)];
      let result;
      if (userChoice === botChoice) result = "It's a **draw**!";
      else if (wins[userChoice] === botChoice) result = 'You **win**! 🎉';
      else result = 'You **lose**! 😢';
      await i.update({ embeds: [new EmbedBuilder().setColor(color).setTitle('Rock Paper Scissors').setDescription(`You: ${choices[userChoice]} | Bot: ${choices[botChoice]}\n\n${result}`)], components: [] });
    });
    collector.on('end', (_, reason) => { if (reason === 'time') msg.edit({ components: [] }).catch(() => {}); });
  },

  run: async (client, message, args) => {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('rps_rock').setLabel('🪨 Rock').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('rps_paper').setLabel('📄 Paper').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('rps_scissors').setLabel('✂️ Scissors').setStyle(ButtonStyle.Secondary)
    );
    const msg = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Rock Paper Scissors').setDescription('Choose your move!')], components: [row] });
    const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 30000, max: 1 });
    collector.on('collect', async i => {
      const userChoice = i.customId.replace('rps_', '');
      const botChoice = Object.keys(choices)[Math.floor(Math.random() * 3)];
      let result;
      if (userChoice === botChoice) result = "It's a **draw**!";
      else if (wins[userChoice] === botChoice) result = 'You **win**! 🎉';
      else result = 'You **lose**! 😢';
      await i.update({ embeds: [new EmbedBuilder().setColor(color).setTitle('Rock Paper Scissors').setDescription(`You: ${choices[userChoice]} | Bot: ${choices[botChoice]}\n\n${result}`)], components: [] });
    });
    collector.on('end', (_, reason) => { if (reason === 'time') msg.edit({ components: [] }).catch(() => {}); });
  }
};
