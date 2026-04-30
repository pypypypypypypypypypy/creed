const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve, loading: loadingEmoji } = require('../emojis.json');
const fetch = require('node-fetch');

const DIFFICULTIES = ['easy', 'medium', 'hard'];

function decodeHtml(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'");
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

module.exports = {
  category: 'fun',
  help: [
    {
        name: 'trivia',
        description: 'Answer a trivia question',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'trivia',
        example: 'trivia'
    }
],

    name: 'trivia',
  aliases: ['quiz'],
  category: 'fun',

  run: async (client, message, args) => {
    const difficulty = DIFFICULTIES.includes(args[0]?.toLowerCase()) ? args[0].toLowerCase() : null;
    const diffQuery = difficulty ? `&difficulty=${difficulty}` : '';

    const loading = await message.channel.send({
      embeds: [new EmbedBuilder().setColor(color).setDescription(`${loadingEmoji} ${message.author}: Fetching a trivia question...`)]
    });

    let question;
    try {
      const res = await fetch(`https://opentdb.com/api.php?amount=1&type=multiple${diffQuery}`);
      const data = await res.json();
      if (!data || data.response_code !== 0 || !data.results?.[0]) throw new Error('bad response');
      question = data.results[0];
    } catch {
      await loading.delete().catch(() => {});
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${warn} ${message.author}: Could not fetch a trivia question. Try again.`)] });
    }

    await loading.delete().catch(() => {});

    const correct = decodeHtml(question.correct_answer);
    const q = decodeHtml(question.question);
    const category = decodeHtml(question.category);
    const diff = question.difficulty;
    const allAnswers = shuffle([correct, ...question.incorrect_answers.map(decodeHtml)]);
    const labels = ['A', 'B', 'C', 'D'];

    const correctLabel = labels[allAnswers.indexOf(correct)];
    const diffColor = diff === 'easy' ? '#a3eb7b' : diff === 'medium' ? '#efa23a' : '#fe6464';

    const embed = new EmbedBuilder()
      .setColor(diffColor)
      .setTitle('🎯 Trivia Question')
      .setDescription(`**${q}**`)
      .addFields(
        { name: 'Category', value: category, inline: true },
        { name: 'Difficulty', value: diff.charAt(0).toUpperCase() + diff.slice(1), inline: true },
        ...allAnswers.map((ans, i) => ({ name: `${labels[i]}.`, value: ans, inline: false }))
      )
      .setFooter({ text: `You have 30 seconds to answer • Module: fun` })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      ...labels.map(label =>
        new ButtonBuilder()
          .setCustomId(`trivia_${label}`)
          .setLabel(label)
          .setStyle(ButtonStyle.Secondary)
      )
    );

    const triviaMsg = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = triviaMsg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === message.author.id,
      time: 30_000,
      max: 1
    });

    collector.on('collect', async interaction => {
      const chosen = interaction.customId.replace('trivia_', '');
      const isCorrect = chosen === correctLabel;

      const disabledRow = new ActionRowBuilder().addComponents(
        ...labels.map(label => {
          let style = ButtonStyle.Secondary;
          if (label === correctLabel) style = ButtonStyle.Success;
          else if (label === chosen && !isCorrect) style = ButtonStyle.Danger;
          return new ButtonBuilder()
            .setCustomId(`trivia_done_${label}`)
            .setLabel(label)
            .setStyle(style)
            .setDisabled(true);
        })
      );

      const resultEmbed = new EmbedBuilder()
        .setColor(isCorrect ? '#a3eb7b' : '#fe6464')
        .setTitle(isCorrect ? '✅ Correct!' : '❌ Wrong!')
        .setDescription(isCorrect
          ? `${message.author} got it right! The answer was **${correct}**.`
          : `${message.author} answered **${allAnswers[labels.indexOf(chosen)]}**. The correct answer was **${correct}**.`)
        .setFooter({ text: 'Module: fun' })
        .setTimestamp();

      await interaction.update({ embeds: [resultEmbed], components: [disabledRow] });
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        const timeoutRow = new ActionRowBuilder().addComponents(
          ...labels.map(label =>
            new ButtonBuilder()
              .setCustomId(`trivia_to_${label}`)
              .setLabel(label)
              .setStyle(label === correctLabel ? ButtonStyle.Success : ButtonStyle.Secondary)
              .setDisabled(true)
          )
        );
        const timeoutEmbed = new EmbedBuilder()
          .setColor('#FFFFFF')
          .setTitle('⏱️ Time\'s up!')
          .setDescription(`${message.author} ran out of time. The correct answer was **${correct}**.`)
          .setFooter({ text: 'Module: fun' })
          .setTimestamp();
        triviaMsg.edit({ embeds: [timeoutEmbed], components: [timeoutRow] }).catch(() => {});
      }
    });
  }
};
