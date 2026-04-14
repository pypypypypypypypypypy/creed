const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');

const CHARS = {
  A: ['  #  ', ' # # ', '#####', '#   #', '#   #'],
  B: ['#### ', '#   #', '#### ', '#   #', '#### '],
  C: [' ####', '#    ', '#    ', '#    ', ' ####'],
  D: ['#### ', '#   #', '#   #', '#   #', '#### '],
  E: ['#####', '#    ', '#### ', '#    ', '#####'],
  F: ['#####', '#    ', '#### ', '#    ', '#    '],
  G: [' ####', '#    ', '#  ##', '#   #', ' ####'],
  H: ['#   #', '#   #', '#####', '#   #', '#   #'],
  I: ['#####', '  #  ', '  #  ', '  #  ', '#####'],
  J: ['#####', '   # ', '   # ', '#  # ', ' ##  '],
  K: ['#   #', '#  # ', '###  ', '#  # ', '#   #'],
  L: ['#    ', '#    ', '#    ', '#    ', '#####'],
  M: ['#   #', '## ##', '# # #', '#   #', '#   #'],
  N: ['#   #', '##  #', '# # #', '#  ##', '#   #'],
  O: [' ### ', '#   #', '#   #', '#   #', ' ### '],
  P: ['#### ', '#   #', '#### ', '#    ', '#    '],
  Q: [' ### ', '#   #', '# # #', '#  ##', ' ####'],
  R: ['#### ', '#   #', '#### ', '#  # ', '#   #'],
  S: [' ####', '#    ', ' ### ', '    #', '#### '],
  T: ['#####', '  #  ', '  #  ', '  #  ', '  #  '],
  U: ['#   #', '#   #', '#   #', '#   #', ' ### '],
  V: ['#   #', '#   #', '#   #', ' # # ', '  #  '],
  W: ['#   #', '#   #', '# # #', '## ##', '#   #'],
  X: ['#   #', ' # # ', '  #  ', ' # # ', '#   #'],
  Y: ['#   #', ' # # ', '  #  ', '  #  ', '  #  '],
  Z: ['#####', '   # ', '  #  ', ' #   ', '#####'],
  '0': [' ### ', '#  ##', '# # #', '##  #', ' ### '],
  '1': ['  #  ', ' ##  ', '  #  ', '  #  ', '#####'],
  '2': [' ### ', '#   #', '  ## ', ' #   ', '#####'],
  '3': ['#### ', '    #', ' ### ', '    #', '#### '],
  '4': ['#   #', '#   #', '#####', '    #', '    #'],
  '5': ['#####', '#    ', '#### ', '    #', '#### '],
  '6': [' ### ', '#    ', '#### ', '#   #', ' ### '],
  '7': ['#####', '    #', '   # ', '  #  ', '  #  '],
  '8': [' ### ', '#   #', ' ### ', '#   #', ' ### '],
  '9': [' ### ', '#   #', ' ####', '    #', ' ### '],
  ' ': ['     ', '     ', '     ', '     ', '     '],
  '!': ['  #  ', '  #  ', '  #  ', '     ', '  #  '],
  '?': [' ### ', '#   #', '  ## ', '     ', '  #  '],
  '.': ['     ', '     ', '     ', '     ', '  #  '],
  ',': ['     ', '     ', '     ', '  #  ', ' #   '],
  '-': ['     ', '     ', '#####', '     ', '     '],
  '+': ['     ', '  #  ', '#####', '  #  ', '     '],
  '*': ['# # #', ' ### ', '#####', ' ### ', '# # #'],
  '#': [' # # ', '#####', ' # # ', '#####', ' # # '],
  '@': [' ### ', '#   #', '# ###', '# ## ', ' ####'],
};

function toAscii(text) {
  const upper = text.toUpperCase().slice(0, 20);
  const rows = ['', '', '', '', ''];
  for (const ch of upper) {
    const char = CHARS[ch] || CHARS[' '];
    for (let i = 0; i < 5; i++) {
      rows[i] += char[i] + ' ';
    }
  }
  return rows.join('\n');
}

module.exports = {
  category: 'fun',
  help: [
    {
        name: 'ascii',
        description: 'Convert text into ASCII art',
        aliases: 'asciify, asciiart',
        parameters: '(text)',
        information: 'n/a',
        usage: 'ascii (text)',
        example: 'ascii text'
    }
],

    name: 'ascii',
  aliases: ['asciify', 'asciiart'],
  category: 'fun',

  run: async (client, message, args) => {
    if (!args[0]) {
      const embed = new EmbedBuilder()
        .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
        .setTitle('Command: ascii')
        .setDescription('Convert text into ASCII art.')
        .addFields(
          { name: '**Aliases**', value: 'asciify, asciiart', inline: true },
          { name: '**Parameters**', value: '<text>', inline: true },
          { name: '**Information**', value: 'Max 20 characters', inline: true },
          { name: '**Usage**', value: '```Syntax: ,ascii <text>\nExample: ,ascii hello```' }
        )
        .setFooter({ text: 'Module: fun' })
        .setTimestamp()
        .setColor(color);
      return message.channel.send({ embeds: [embed] });
    }

    const text = args.join(' ').slice(0, 20);
    const art = toAscii(text);

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(color)
          .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
          .setTitle('ASCII Art')
          .setDescription(`\`\`\`\n${art}\n\`\`\``)
          .setFooter({ text: `"${text}" • Module: fun` })
          .setTimestamp()
      ]
    });
  }
};
