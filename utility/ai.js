const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const fetch = require('node-fetch');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'ai',
        description: 'Ask the AI a question',
        aliases: 'n/a',
        parameters: '(question)',
        information: 'n/a',
        usage: 'ai (question)',
        example: 'ai question'
    }
],

    name: 'ai',
  aliases: ['ask', 'chatgpt'],

  run: async (client, message, args) => {
    const helpEmbed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: ai')
      .setDescription('Ask the AI a question.')
      .addFields(
        { name: '**Aliases**', value: 'ask, chatgpt', inline: true },
        { name: '**Parameters**', value: '[question]', inline: true },
        { name: '**Information**', value: 'N/A', inline: true },
        { name: '**Usage**', value: '```Syntax: ai <question>\nExample: ai What is the capital of France?```' }
      )
      .setFooter({ text: 'Module: utility' })
      .setTimestamp()
      .setColor(color);

    if (!args[0]) return message.channel.send({ embeds: [helpEmbed] });

    const question = args.join(' ');
    const thinking = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`<a:loading:1361068178616090685> ${message.author}: Thinking...`)] });

    try {
      if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not set');

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: question }],
          max_tokens: 500,
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      const answer = data.choices?.[0]?.message?.content?.trim() || 'No response received.';

      const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
        .addFields(
          { name: 'Question', value: question.length > 1024 ? question.slice(0, 1021) + '...' : question },
          { name: 'Answer', value: answer.length > 1024 ? answer.slice(0, 1021) + '...' : answer }
        )
        .setFooter({ text: 'Powered by Groq' })
        .setTimestamp();

      await thinking.edit({ embeds: [embed] });
    } catch (e) {
      await thinking.edit({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Failed to get a response. ${e.message}`)] });
    }
  },
};
