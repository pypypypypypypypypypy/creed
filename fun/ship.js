const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { default_prefix } = require('../config.json');
const db = require('../db');

function calcShip(id1, id2, name1, name2) {
  const combined = id1 + id2;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) hash = (hash * 31 + combined.charCodeAt(i)) % 101;
  const p = hash;
  const bar = '█'.repeat(Math.floor(p / 10)) + '░'.repeat(10 - Math.floor(p / 10));
  let desc;
  if (p >= 80) desc = '💞 Perfect match!';
  else if (p >= 60) desc = '💕 Great chemistry!';
  else if (p >= 40) desc = '💛 Decent spark.';
  else if (p >= 20) desc = '🤔 Needs work.';
  else desc = '💔 Not meant to be.';
  return new EmbedBuilder().setColor('#ff69b4')
    .setTitle(`💘 ${name1} × ${name2}`)
    .setDescription(`**${p}%** ${desc}\n\`[${bar}]\``)
    .setTimestamp();
}

module.exports = {
  category: 'fun',
  name: 'ship',
  help: [{ name: 'ship', description: 'Ship two users together', aliases: 'n/a', parameters: '(user1) (user2)', information: 'n/a', usage: 'ship @user1 @user2', example: 'ship @user1 @user2' }],

  slashData: {
    name: 'ship',
    description: 'Ship two users together',
    dm_permission: true,
    options: [
      { type: 6, name: 'user1', description: 'First user', required: true },
      { type: 6, name: 'user2', description: 'Second user', required: true },
    ],
  },
  runSlash: async (client, interaction) => {
    const u1 = interaction.options.getUser('user1');
    const u2 = interaction.options.getUser('user2');
    await interaction.reply({ embeds: [calcShip(u1.id, u2.id, u1.username, u2.username)] });
  },

  run: async (client, message, args) => {
    const prefix = db.get(`prefix_${message.guild?.id}`) || default_prefix;
    const u1 = message.mentions.users.first();
    const u2 = [...message.mentions.users.values()][1];
    if (!u1 || !u2) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}ship @user1 @user2\``)] });
    message.channel.send({ embeds: [calcShip(u1.id, u2.id, u1.username, u2.username)] });
  }
};
