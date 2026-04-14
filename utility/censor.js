const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');

module.exports = {
  name: 'censor',
  aliases: ['censorship'],
  category: 'utility',
  help: [
    { name: 'censor add <word/phrase>', description: 'Add a word or phrase to the censor list', aliases: 'n/a', parameters: '<word>', information: 'MANAGE_GUILD', usage: 'censor add <word>', example: 'censor add badword' },
    { name: 'censor remove <word/phrase>', description: 'Remove a word from the censor list', aliases: 'n/a', parameters: '<word>', information: 'MANAGE_GUILD', usage: 'censor remove <word>', example: 'censor remove badword' },
    { name: 'censor list', description: 'View all censored words', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'censor list', example: 'censor list' },
    { name: 'censor reset', description: 'Clear all censored words', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'censor reset', example: 'censor reset' },
  ],

  run: async (client, message, args) => {
    const { warn, approve, deny } = require('../emojis.json');

    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You need **Manage Server** permission.`)] });
    }

    const sub = args[0]?.toLowerCase();
    const key = `censor_${message.guild.id}`;
    const list = db.get(key) || [];

    if (sub === 'add') {
      const word = args.slice(1).join(' ').toLowerCase();
      if (!word) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Provide a word or phrase to censor.`)] });
      if (list.includes(word)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: \`${word}\` is already censored.`)] });
      list.push(word);
      db.set(key, list);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: \`${word}\` has been added to the censor list.`)] });
    }

    if (sub === 'remove') {
      const word = args.slice(1).join(' ').toLowerCase();
      if (!word) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Provide a word to remove.`)] });
      if (!list.includes(word)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: \`${word}\` is not in the censor list.`)] });
      db.set(key, list.filter(w => w !== word));
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: \`${word}\` has been removed from the censor list.`)] });
    }

    if (sub === 'reset') {
      db.set(key, []);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Censor list has been cleared.`)] });
    }

    if (sub === 'list') {
      if (!list.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: No words are censored in this server.`)] });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Censor List — ${message.guild.name}`).setDescription(list.map((w, i) => `\`${i + 1}\` ${w}`).join('\n')).setFooter({ text: `${list.length} censored word(s)` })] });
    }

    return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Command: censor').setDescription('Manage the server censor list. Messages containing censored words are automatically deleted.').addFields(
      { name: 'Subcommands', value: '`censor add <word>` — Add a word\n`censor remove <word>` — Remove a word\n`censor list` — View all words\n`censor reset` — Clear all words' }
    )] });
  }
};
