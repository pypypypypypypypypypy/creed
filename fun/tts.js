const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { color } = require("../config.json");
const { warn } = require('../emojis.json');
const https = require('https');
const http = require('http');

const VOICES = [
  'en-US', 'en-GB', 'en-AU', 'en-IN', 'en-CA',
  'es-ES', 'es-MX', 'fr-FR', 'de-DE', 'it-IT',
  'pt-BR', 'pt-PT', 'ru-RU', 'ja-JP', 'ko-KR',
  'zh-CN', 'zh-TW', 'ar-SA', 'hi-IN', 'nl-NL',
  'pl-PL', 'sv-SE', 'tr-TR', 'da-DK', 'fi-FI',
  'nb-NO', 'cs-CZ', 'el-GR', 'he-IL', 'ro-RO'
];

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchBuffer(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

module.exports = {
  category: 'fun',
  help: [
    {
        name: 'tts',
        description: 'Convert text to speech in a voice channel',
        aliases: 'n/a',
        parameters: '(text)',
        information: 'CONNECT',
        usage: 'tts (text)',
        example: 'tts text'
    }
],

    name: "tts",
  aliases: ["texttospeech", "speak"],

  run: async (client, message, args) => {
    if (!args[0]) {
      return message.channel.send({ embeds: [new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
        .setTitle('Command: tts')
        .setDescription('Convert text to speech and send it as an audio file')
        .addFields(
          { name: '**Aliases**', value: 'texttospeech, speak', inline: true },
          { name: '**Parameters**', value: '<text> [--voice <lang>]', inline: true },
          { name: '**Usage**', value: '```Syntax: ,tts <text>\nExample: ,tts Hello world\n,tts Hello --voice es-ES```' }
        )
        .setFooter({ text: 'Module: fun' })
        .setTimestamp()
      ] });
    }

    let voice = 'en-US';
    let text = args.join(' ');

    const voiceIdx = args.indexOf('--voice');
    if (voiceIdx !== -1 && args[voiceIdx + 1]) {
      const requestedVoice = args[voiceIdx + 1];
      if (VOICES.includes(requestedVoice)) {
        voice = requestedVoice;
        text = args.filter((_, i) => i !== voiceIdx && i !== voiceIdx + 1).join(' ');
      } else {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Invalid voice. Available voices: \`${VOICES.join('`, `')}\``)] });
      }
    }

    if (!text.trim())
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please provide some text to convert`)] });

    if (text.length > 200)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Text must be **200 characters or less** (provided: ${text.length})`)] });

    try {
      const encoded = encodeURIComponent(text);
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${voice}&client=tw-ob`;

      const audioBuffer = await fetchBuffer(ttsUrl);
      const attachment = new AttachmentBuilder(audioBuffer, { name: 'tts.mp3' });

      const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
        .setDescription(`**Text:** ${text}\n**Voice:** \`${voice}\``)
        .setFooter({ text: 'Module: fun' })
        .setTimestamp();

      await message.channel.send({ embeds: [embed], files: [attachment] });
    } catch (err) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Failed to generate TTS audio. Please try again later.`)] });
    }
  }
};
