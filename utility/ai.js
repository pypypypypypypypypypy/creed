const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const fetch = require('node-fetch');

const aiCooldowns = new Map();
const aiGlobalHits = [];
const GLOBAL_LIMIT = 25;
const GLOBAL_WINDOW_MS = 60_000;

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

    const now = Date.now();
    const last = aiCooldowns.get(message.author.id) || 0;
    if (now - last < 5000) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please wait a few seconds before using \`,ai\` again.`)] });
    }

    while (aiGlobalHits.length && now - aiGlobalHits[0] > GLOBAL_WINDOW_MS) aiGlobalHits.shift();
    if (aiGlobalHits.length >= GLOBAL_LIMIT) {
      const wait = Math.ceil((GLOBAL_WINDOW_MS - (now - aiGlobalHits[0])) / 1000);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: AI is rate-limited globally. Try again in ${wait}s.`)] });
    }
    aiGlobalHits.push(now);
    aiCooldowns.set(message.author.id, now);

    const question = args.join(' ');

    const blocked = [
      /\bn[i1]gg(er|a)s?\b/i,
      /\bf[a@]gg?(ot|y)?s?\b/i,
      /\bk[i1]ke\b/i, /\bch[i1]nks?\b/i, /\bsp[i1]cs?\b/i, /\btr[a@]nn(y|ies)\b/i, /\bret[a@]rds?\b/i,
      /\bcp\b|child p[o0]rn|underage (sex|porn|nude)/i,
      /\b(rape|molest)\b/i,
      /how (do|to|can) (i|you|one) (make|build|cook|synth|create) (a |an )?(bomb|meth|cocaine|fentanyl|nerve gas|ricin|sarin|nuke|nuclear|firearm|gun|silencer|suppressor)/i,
      /(suicide|kill myself|kms|end my life)/i,
    ];
    if (blocked.some(re => re.test(question))) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: That prompt was blocked by the content filter.`)] });
    }

    const thinking = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`<a:loading:1496708542676074667> ${message.author}: Thinking...`)] });

    try {

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${"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"}`,
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
