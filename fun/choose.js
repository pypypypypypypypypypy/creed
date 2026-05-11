const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');

function pickChoice(input, user) {
  let options;
  if (input.includes(',')) options = input.split(',').map(o => o.trim()).filter(Boolean);
  else if (/\bor\b/i.test(input)) options = input.split(/\s+or\s+/i).map(o => o.trim()).filter(Boolean);
  else options = input.split(' ').filter(Boolean);
  if (options.length < 2) return null;
  const chosen = options[Math.floor(Math.random() * options.length)];
  return new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: user.username, iconURL: user.displayAvatarURL({ forceStatic: false }) })
    .setDescription(`🎲 Out of **${options.length}** options, I choose: **${chosen}**`)
    .setFooter({ text: `Options: ${options.join(' • ')}` })
    .setTimestamp();
}

module.exports = {
  category: 'fun',
  name: 'choose',
  aliases: ['pick', 'decide'],
  help: [{ name: 'choose', description: 'Let the bot choose between options', aliases: 'pick, decide', parameters: '(option1, option2, ...)', information: 'n/a', usage: 'choose (options)', example: 'choose pizza, sushi, burger' }],

  slashData: {
    name: 'choose',
    description: 'Let the bot pick between options (separate with commas)',
    dm_permission: true,
    options: [{ type: 3, name: 'options', description: 'Options separated by commas', required: true }],
  },
  runSlash: async (client, interaction) => {
    const input = interaction.options.getString('options');
    const embed = pickChoice(input, interaction.user);
    if (!embed) return interaction.reply({ content: 'Provide at least 2 options separated by commas.', ephemeral: true });
    await interaction.reply({ embeds: [embed] });
  },

  run: async (client, message, args) => {
    if (!args[0]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`,choose pizza, burger, sushi\``)] });
    const embed = pickChoice(args.join(' '), message.author);
    if (!embed) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Provide at least **2** options.`)] });
    message.channel.send({ embeds: [embed] });
  }
};
