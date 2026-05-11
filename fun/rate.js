const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { default_prefix } = require('../config.json');
const db = require('../db');

function calcRate(thing) {
  let hash = 0;
  for (let i = 0; i < thing.length; i++) hash = (hash * 31 + thing.charCodeAt(i)) % 101;
  const r = hash;
  const bar = '█'.repeat(Math.floor(r / 10)) + '░'.repeat(10 - Math.floor(r / 10));
  let label;
  if (r >= 90) label = '🔥 Exceptional!';
  else if (r >= 70) label = '✅ Pretty good!';
  else if (r >= 50) label = '😐 Decent.';
  else if (r >= 30) label = '😬 Could be better.';
  else label = '💀 Yikes.';
  return { r, bar, label };
}

module.exports = {
  category: 'fun',
  name: 'rate',
  help: [{ name: 'rate', description: 'Rate something out of 100', aliases: 'n/a', parameters: '(thing)', information: 'n/a', usage: 'rate (thing)', example: 'rate pizza' }],

  slashData: {
    name: 'rate',
    description: 'Rate something out of 100',
    dm_permission: true,
    options: [{ type: 3, name: 'thing', description: 'What to rate', required: true }],
  },
  runSlash: async (client, interaction) => {
    const thing = interaction.options.getString('thing');
    const { r, bar, label } = calcRate(thing.toLowerCase());
    const embed = new EmbedBuilder().setColor(color).setTitle('⭐ Rate')
      .setDescription(`I rate **${thing}** a **${r}/100**!\n${label}\n\`[${bar}]\``)
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  },

  run: async (client, message, args) => {
    const prefix = db.get(`prefix_${message.guild?.id}`) || default_prefix;
    const thing = args.join(' ');
    if (!thing) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}rate <thing>\``)] });
    const { r, bar, label } = calcRate(thing.toLowerCase());
    const embed = new EmbedBuilder().setColor(color).setTitle('⭐ Rate')
      .setDescription(`I rate **${thing}** a **${r}/100**!\n${label}\n\`[${bar}]\``)
      .setTimestamp();
    message.channel.send({ embeds: [embed] });
  }
};
