const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, loading: loadingEmoji } = require('../emojis.json');
const fetch = require('node-fetch');

const langMap = {
  spanish:'es', french:'fr', german:'de', italian:'it', portuguese:'pt',
  russian:'ru', japanese:'ja', korean:'ko', chinese:'zh', arabic:'ar',
  dutch:'nl', polish:'pl', turkish:'tr', hindi:'hi', swedish:'sv',
  norwegian:'no', danish:'da', finnish:'fi', greek:'el', hebrew:'he',
  thai:'th', vietnamese:'vi', indonesian:'id', malay:'ms', ukrainian:'uk',
  czech:'cs', romanian:'ro', hungarian:'hu', english:'en'
};

async function doTranslate(lang, text) {
  const targetLang = langMap[lang.toLowerCase()] || lang.toLowerCase();
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|${targetLang}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data || data.responseStatus !== 200) throw new Error('Translation failed');
  return { translated: data.responseData.translatedText, targetLang };
}

module.exports = {
  category: 'utility',
  name: 'translate',
  aliases: ['tr', 'trans'],
  help: [{ name: 'translate', description: 'Translate text to another language', aliases: 'tr, trans', parameters: '(language) (text)', information: 'n/a', usage: 'translate (lang) (text)', example: 'translate spanish Hello!' }],

  slashData: {
    name: 'translate',
    description: 'Translate text into another language',
    dm_permission: true,
    options: [
      { type: 3, name: 'language', description: 'Target language (e.g. spanish, french, ja)', required: true },
      { type: 3, name: 'text', description: 'Text to translate', required: true },
    ],
  },
  runSlash: async (client, interaction) => {
    const lang = interaction.options.getString('language');
    const text = interaction.options.getString('text');
    await interaction.deferReply();
    try {
      const { translated } = await doTranslate(lang, text);
      const embed = new EmbedBuilder().setColor(color).setTitle('Translation')
        .addFields(
          { name: '**Original**', value: `\`\`\`${text.slice(0, 900)}\`\`\`` },
          { name: `**Translated (${lang})**`, value: `\`\`\`${translated.slice(0, 900)}\`\`\`` }
        ).setFooter({ text: 'Powered by MyMemory' }).setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch {
      await interaction.editReply({ content: 'Could not translate. Make sure the language is valid.' });
    }
  },

  run: async (client, message, args) => {
    if (!args[0] || !args[1]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`,translate <language> <text>\``)] });
    const lang = args[0];
    const text = args.slice(1).join(' ');
    const loading = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${loadingEmoji} Translating...`)] });
    try {
      const { translated } = await doTranslate(lang, text);
      const embed = new EmbedBuilder().setColor(color)
        .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
        .setTitle('Translation')
        .addFields(
          { name: '**Original**', value: `\`\`\`${text.slice(0, 900)}\`\`\`` },
          { name: `**Translated (${lang})**`, value: `\`\`\`${translated.slice(0, 900)}\`\`\`` }
        ).setFooter({ text: 'Powered by MyMemory' }).setTimestamp();
      await loading.delete().catch(() => {});
      message.channel.send({ embeds: [embed] });
    } catch {
      await loading.delete().catch(() => {});
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${warn} ${message.author}: Could not translate. Make sure the language is valid.`)] });
    }
  }
};
