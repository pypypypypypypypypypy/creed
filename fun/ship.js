const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'fun',
  help: [
    {
        name: 'ship',
        description: 'Ship two users together',
        aliases: 'n/a',
        parameters: '(user1) (user2)',
        information: 'n/a',
        usage: 'ship (user1) (user2)',
        example: 'ship user1 user2'
    }
],

    name: 'ship',

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    const user1 = message.mentions.users.first() || message.author;
    const user2 = message.mentions.users.array ? message.mentions.users.array()[1] : [...message.mentions.users.values()][1];

    if (!user2) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}ship @user1 @user2\``)] });

    const combined = user1.id + user2.id;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) hash = (hash * 31 + combined.charCodeAt(i)) % 101;
    const percent = hash;

    let desc;
    if (percent >= 80) desc = '💞 Perfect match!';
    else if (percent >= 60) desc = '💕 Great compatibility!';
    else if (percent >= 40) desc = '💛 Decent chemistry.';
    else if (percent >= 20) desc = '🤔 Could use some work.';
    else desc = '💔 Not meant to be.';

    const bar = '█'.repeat(Math.floor(percent / 10)) + '░'.repeat(10 - Math.floor(percent / 10));

    const embed = new EmbedBuilder()
      .setColor('ff73fa')
      .setTitle(`💘 Ship: ${user1.username} × ${user2.username}`)
      .setDescription(`**${percent}%** ${desc}\n\`[${bar}]\``)
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
