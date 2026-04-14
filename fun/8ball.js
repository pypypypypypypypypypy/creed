const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { default_prefix } = require('../config.json');

const responses = [
  'It is certain.', 'It is decidedly so.', 'Without a doubt.',
  'Yes, definitely.', 'You may rely on it.', 'As I see it, yes.',
  'Most likely.', 'Outlook good.', 'Yes.', 'Signs point to yes.',
  'Reply hazy, try again.', 'Ask again later.', 'Better not tell you now.',
  'Cannot predict now.', 'Concentrate and ask again.',
  "Don't count on it.", 'My reply is no.', 'My sources say no.',
  'Outlook not so good.', 'Very doubtful.'
];

module.exports = {
  category: 'fun',
  help: [
    {
        name: '8ball',
        description: 'Ask the magic 8-ball a question',
        aliases: '8b',
        parameters: '(question)',
        information: 'n/a',
        usage: '8ball (question)',
        example: '8ball question'
    }
],

    name: '8ball',
  aliases: ['8b'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    const question = args.join(' ');
    if (!question) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}8ball <question>\``)] });

    const response = responses[Math.floor(Math.random() * responses.length)];
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('🎱 Magic 8-Ball')
      .addFields(
        { name: 'Question', value: question, inline: false },
        { name: 'Answer', value: response, inline: false }
      )
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
