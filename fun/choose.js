const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');

module.exports = {
  category: 'fun',
  help: [
    {
        name: 'choose',
        description: 'Let the bot choose between multiple options',
        aliases: 'pick, decide',
        parameters: '(option1 | option2 | ...)',
        information: 'n/a',
        usage: 'choose (option1 | option2 | ...)',
        example: 'choose option1 |'
    }
],

    name: 'choose',
  aliases: ['pick', 'decide'],
  category: 'fun',

  run: async (client, message, args) => {
    const helpEmbed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: choose')
      .setDescription('Let bleed choose between options for you.')
      .addFields(
        { name: '**Aliases**', value: 'pick, decide', inline: true },
        { name: '**Parameters**', value: '[option1 / option2 / ...]', inline: true },
        { name: '**Information**', value: 'Separate options with a comma or "or"', inline: true },
        { name: '**Usage**', value: '```Syntax: ,choose <option1>, <option2>, ...\nExample: ,choose pizza, burger, sushi```' }
      )
      .setFooter({ text: 'Module: fun' })
      .setTimestamp()
      .setColor(color);

    if (!args[0]) return message.channel.send({ embeds: [helpEmbed] });

    const input = args.join(' ');
    let options;

    if (input.includes(',')) {
      options = input.split(',').map(o => o.trim()).filter(o => o.length > 0);
    } else if (input.toLowerCase().includes(' or ')) {
      options = input.split(/\s+or\s+/i).map(o => o.trim()).filter(o => o.length > 0);
    } else {
      options = input.split(' ').filter(o => o.length > 0);
    }

    if (options.length < 2) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Please provide at least **2 options** to choose from.\n**Usage:** \`,choose pizza, burger, sushi\``)] });
    }

    const chosen = options[Math.floor(Math.random() * options.length)];

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setDescription(`🎲 Out of **${options.length}** options, I choose: **${chosen}**`)
      .setFooter({ text: `Options: ${options.join(' • ')}` })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
