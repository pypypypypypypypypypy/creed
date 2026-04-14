const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

module.exports = {
  name: 'filter',
  aliases: ['wordfilter', 'wf'],
  category: 'configuration',
  help: [
    { name: 'filter', description: 'Manage the word filter', aliases: 'wordfilter, wf', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'filter', example: 'filter' },
    { name: 'filter add', description: 'Add a word to the filter', aliases: 'n/a', parameters: '(word)', information: 'MANAGE_GUILD', usage: 'filter add (word)', example: 'filter add badword' },
    { name: 'filter remove', description: 'Remove a word from the filter', aliases: 'n/a', parameters: '(word)', information: 'MANAGE_GUILD', usage: 'filter remove (word)', example: 'filter remove badword' },
    { name: 'filter list', description: 'List all filtered words', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'filter list', example: 'filter list' },
    { name: 'filter clear', description: 'Clear all filtered words', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'filter clear', example: 'filter clear' },
    { name: 'filter event', description: 'Set filter punishment (delete, warn, mute, kick, ban)', aliases: 'n/a', parameters: '(event)', information: 'MANAGE_GUILD', usage: 'filter event (type)', example: 'filter event delete' },
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });

    const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const sub = (args[0] || '').toLowerCase();
    const guildId = message.guild.id;
    const filterKey = `filter_words_${guildId}`;

    if (!sub) {
      const words = db.get(filterKey) || [];
      const event = db.get(`filter_event_${guildId}`) || 'delete';
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color)
        .setTitle('Word Filter')
        .setDescription(`**Filtered Words:** ${words.length}\n**Action:** ${event}`)
        .addFields({ name: 'Subcommands', value: `\`${prefix}filter add <word>\`\n\`${prefix}filter remove <word>\`\n\`${prefix}filter list\`\n\`${prefix}filter clear\`\n\`${prefix}filter event <type>\`` })
        .setTimestamp()] });
    }

    if (sub === 'add') {
      const word = args.slice(1).join(' ').toLowerCase();
      if (!word) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Provide a word to filter.`)] });
      const words = db.get(filterKey) || [];
      if (words.includes(word)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: \`${word}\` is already filtered.`)] });
      words.push(word);
      db.set(filterKey, words);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Added \`${word}\` to the filter.`)] });
    }

    if (sub === 'remove') {
      const word = args.slice(1).join(' ').toLowerCase();
      if (!word) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Provide a word to remove.`)] });
      let words = db.get(filterKey) || [];
      if (!words.includes(word)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: \`${word}\` is not in the filter.`)] });
      words = words.filter(w => w !== word);
      db.set(filterKey, words);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Removed \`${word}\` from the filter.`)] });
    }

    if (sub === 'list') {
      const words = db.get(filterKey) || [];
      if (!words.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: No words in the filter.`)] });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color)
        .setTitle('Filtered Words')
        .setDescription(words.map((w, i) => `\`${i + 1}\` ${w}`).join('\n'))
        .setFooter({ text: `${words.length} word(s)` })] });
    }

    if (sub === 'clear') {
      db.set(filterKey, []);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Cleared all filtered words.`)] });
    }

    if (sub === 'event') {
      const event = (args[1] || '').toLowerCase();
      const valid = ['delete', 'warn', 'mute', 'kick', 'ban'];
      if (!event || !valid.includes(event))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Valid events: ${valid.map(v => `\`${v}\``).join(', ')}`)] });
      db.set(`filter_event_${guildId}`, event);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Filter action set to **${event}**.`)] });
    }
  }
};
