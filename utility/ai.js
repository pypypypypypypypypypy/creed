const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const fetch = require('node-fetch');

const aiCooldowns = new Map();
const aiGlobalHits = [];
const GLOBAL_LIMIT = 25;
const GLOBAL_WINDOW_MS = 60_000;

const CHATGPT_EMOJI_ID = '1497623180393582835';
const CHATGPT_ICON = `https://cdn.discordapp.com/emojis/${CHATGPT_EMOJI_ID}.png`;

const SYSTEM_PROMPT =
  'You are a concise assistant inside a Discord chat. ' +
  'Reply in as few words as possible — usually 1–4 short sentences, or a tight numbered list of 2–4 bullets when listing steps. ' +
  'No filler, no preamble, no apologies, no "as an AI", no closing remarks. ' +
  'Use **bold** only for key terms. Skip headings. Get straight to the answer.';

module.exports = {
  category: 'utility',
  help: [
    {
      name: 'ai',
      description: 'Ask the AI a question',
      aliases: 'ask, chatgpt',
      parameters: '(question)',
      information: 'n/a',
      usage: 'ai (question)',
      example: 'ai how to cook a bagel'
    }
  ],

  name: 'ai',
  aliases: ['ask', 'chatgpt'],

  run: async (client, message, args) => {
    if (!args[0]) {
      const helpEmbed = new EmbedBuilder()
        .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
        .setTitle('Command: ai')
        .setDescription('Ask the AI a question.')
        .addFields(
          { name: '**Aliases**', value: 'ask, chatgpt', inline: true },
          { name: '**Parameters**', value: '[question]', inline: true },
          { name: '**Information**', value: 'N/A', inline: true },
          { name: '**Usage**', value: '```Syntax: ai <question>\nExample: ai how to cook a bagel```' }
        )
        .setFooter({ text: 'Module: utility' })
        .setTimestamp()
        .setColor(color);
      return message.channel.send({ embeds: [helpEmbed] });
    }

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

    const thinking = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`<a:loading:1496728277690089503> ${message.author}: Thinking...`)] });

    const startedAt = Date.now();

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${"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"}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: question },
          ],
          temperature: 0.4,
          max_tokens: 220,
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      let answer = data.choices?.[0]?.message?.content?.trim() || 'No response.';

      if (answer.length > 4000) answer = answer.slice(0, 3997) + '...';

      const took = ((Date.now() - startedAt) / 1000).toFixed(0);

      const embed = new EmbedBuilder()
        .setColor(color)
        .setDescription(answer)
        .setFooter({ text: `gpt-oss • took ${took}s`, iconURL: CHATGPT_ICON });

      await thinking.edit({ embeds: [embed] });
    } catch (e) {
      await thinking.edit({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Failed to get a response. ${e.message}`)] });
    }
  },
};
