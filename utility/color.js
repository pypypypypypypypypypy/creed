const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');

function hexToRgb(hex) {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return { r, g, b };
}

function hexToHsl(hex) {
  let { r, g, b } = hexToRgb(hex);
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

function getCssName(hex) {
  const cssColors = {
    'FF0000': 'Red', 'FF4500': 'OrangeRed', 'FF8C00': 'DarkOrange', 'FFA500': 'Orange',
    'FFD700': 'Gold', 'FFFF00': 'Yellow', 'ADFF2F': 'GreenYellow', '00FF00': 'Lime',
    '008000': 'Green', '006400': 'DarkGreen', '00FA9A': 'MediumSpringGreen', '00FFFF': 'Cyan',
    '0000FF': 'Blue', '00008B': 'DarkBlue', '8A2BE2': 'BlueViolet', 'EE82EE': 'Violet',
    'FF00FF': 'Magenta', 'FF1493': 'DeepPink', 'FF69B4': 'HotPink', 'FFC0CB': 'Pink',
    'FFFFFF': 'White', '000000': 'Black', '808080': 'Gray', 'C0C0C0': 'Silver',
    'A52A2A': 'Brown', 'D2691E': 'Chocolate', 'F5DEB3': 'Wheat', 'F5F5DC': 'Beige',
    '800000': 'Maroon', '800080': 'Purple', '008080': 'Teal', '000080': 'Navy',
    'F0F8FF': 'AliceBlue', 'FAEBD7': 'AntiqueWhite', '7FFFD4': 'Aquamarine',
    '5F9EA0': 'CadetBlue', 'DC143C': 'Crimson', '1E90FF': 'DodgerBlue',
    'B22222': 'Firebrick', '228B22': 'ForestGreen', 'DCDCDC': 'Gainsboro',
    'FFD700': 'Gold', 'DAA520': 'Goldenrod', '7CFC00': 'LawnGreen', '20B2AA': 'LightSeaGreen',
    '9370DB': 'MediumPurple', '3CB371': 'MediumSeaGreen', '7B68EE': 'MediumSlateBlue',
    '191970': 'MidnightBlue', 'F5FFFA': 'MintCream', 'BC8F8F': 'RosyBrown',
    '4169E1': 'RoyalBlue', '2E8B57': 'SeaGreen', 'A0522D': 'Sienna', '87CEEB': 'SkyBlue',
    '6A5ACD': 'SlateBlue', '708090': 'SlateGray', 'D2B48C': 'Tan', '40E0D0': 'Turquoise',
    'F5F5F5': 'WhiteSmoke', '9ACD32': 'YellowGreen'
  };
  return cssColors[hex.toUpperCase()] || null;
}

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'color',
        description: 'View color information or get a color preview',
        aliases: 'n/a',
        parameters: '(hex / role)',
        information: 'n/a',
        usage: 'color (hex / role)',
        example: 'color hex /'
    }
],

    name: 'color',
  aliases: ['hex', 'colour'],
  category: 'utility',

  run: async (client, message, args) => {
    if (!args[0]) {
      const embed = new EmbedBuilder()
        .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
        .setTitle('Command: color')
        .setDescription('Display information about a hex color.')
        .addFields(
          { name: '**Aliases**', value: 'hex, colour', inline: true },
          { name: '**Parameters**', value: '<hex code>', inline: true },
          { name: '**Information**', value: 'N/A', inline: true },
          { name: '**Usage**', value: '```Syntax: ,color <hex>\nExample: ,color #5865F2```' }
        )
        .setFooter({ text: 'Module: utility' })
        .setTimestamp()
        .setColor(color);
      return message.channel.send({ embeds: [embed] });
    }

    let hex = args[0].replace('#', '').trim();

    // Expand shorthand hex (e.g. #FFF → #FFFFFF)
    if (/^[0-9a-fA-F]{3}$/.test(hex)) {
      hex = hex.split('').map(c => c + c).join('');
    }

    if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: \`${args[0]}\` is not a valid hex color. Example: \`#5865F2\``)] });
    }

    const upper = hex.toUpperCase();
    const decimal = parseInt(hex, 16);
    const { r, g, b } = hexToRgb(hex);
    const { h, s, l } = hexToHsl(hex);
    const cssName = getCssName(upper);

    const embed = new EmbedBuilder()
      .setColor(decimal)
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle(`Color: #${upper}`)
      .addFields(
        { name: 'Hex', value: `\`#${upper}\``, inline: true },
        { name: 'RGB', value: `\`rgb(${r}, ${g}, ${b})\``, inline: true },
        { name: 'HSL', value: `\`hsl(${h}, ${s}%, ${l}%)\``, inline: true },
        { name: 'Decimal', value: `\`${decimal}\``, inline: true },
        { name: 'Integer', value: `\`${decimal.toString(2).padStart(24, '0')}\``, inline: true },
        ...(cssName ? [{ name: 'CSS Name', value: `\`${cssName}\``, inline: true }] : [])
      )
      .setFooter({ text: 'Module: utility' })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
