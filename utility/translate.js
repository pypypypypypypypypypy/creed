const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const fetch = require('node-fetch');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'translate',
        description: 'Translate text into another language',
        aliases: 'tr, trans',
        parameters: '(language) (text)',
        information: 'n/a',
        usage: 'translate (language) (text)',
        example: 'translate language text'
    }
],

    name: 'translate',
  aliases: ['tr', 'trans'],
  category: 'utility',

  run: async (client, message, args) => {
    const helpEmbed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: translate')
      .setDescription('Translate text to another language.')
      .addFields(
        { name: '**Aliases**', value: 'tr, trans', inline: true },
        { name: '**Parameters**', value: '[language] [text]', inline: true },
        { name: '**Information**', value: 'N/A', inline: true },
        { name: '**Usage**', value: '```Syntax: ,translate <language> <text>\nExample: ,translate spanish Hello, how are you?```' }
      )
      .setFooter({ text: 'Module: utility' })
      .setTimestamp()
      .setColor(color);

    if (!args[0]) return message.channel.send({ embeds: [helpEmbed] });

    const lang = args[0];
    const text = args.slice(1).join(' ');

    if (!text) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Please provide text to translate.\n**Usage:** \`,translate <language> <text>\``)] });
    }

    const loading = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`<a:loading:1496708542676074667> ${message.author}: Translating...`)] });

    try {
      const langMap = {
        spanish: 'es', french: 'fr', german: 'de', italian: 'it', portuguese: 'pt',
        russian: 'ru', japanese: 'ja', korean: 'ko', chinese: 'zh', arabic: 'ar',
        dutch: 'nl', polish: 'pl', turkish: 'tr', hindi: 'hi', swedish: 'sv',
        norwegian: 'no', danish: 'da', finnish: 'fi', greek: 'el', hebrew: 'he',
        thai: 'th', vietnamese: 'vi', indonesian: 'id', malay: 'ms', ukrainian: 'uk',
        czech: 'cs', romanian: 'ro', hungarian: 'hu', english: 'en'
      };

      const targetLang = langMap[lang.toLowerCase()] || lang.toLowerCase();
      const encoded = encodeURIComponent(text);
      const url = `https://api.mymemory.translated.net/get?q=${encoded}&langpair=autodetect|${targetLang}`;

      const res = await fetch(url);
      const data = await res.json();

      if (!data || data.responseStatus !== 200) {
        await loading.delete().catch(() => {});
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${warn} ${message.author}: Could not translate the text. Make sure the language is valid.`)] });
      }

      const translated = data.responseData.translatedText;
      const detectedLang = data.responseData.detectedLanguage || 'Unknown';

      const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
        .setTitle('Translation')
        .addFields(
          { name: '**Original**', value: `\`\`\`${text.length > 900 ? text.slice(0, 900) + '...' : text}\`\`\``, inline: false },
          { name: `**Translated (${lang})**`, value: `\`\`\`${translated.length > 900 ? translated.slice(0, 900) + '...' : translated}\`\`\``, inline: false }
        )
        .setFooter({ text: `Powered by MyMemory` })
        .setTimestamp();

      await loading.delete().catch(() => {});
      message.channel.send({ embeds: [embed] });
    } catch (e) {
      await loading.delete().catch(() => {});
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${warn} ${message.author}: An error occurred while translating.`)] });
    }
  }
};
