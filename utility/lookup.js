const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const fetch = require('node-fetch');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'lookup',
        description: 'Look up a Discord invite or vanity URL',
        aliases: 'vanity',
        parameters: '(vanity/invite)',
        information: 'n/a',
        usage: 'lookup (vanity/invite)',
        example: 'lookup vanity/invite'
    }
],

    name: 'lookup',
  aliases: [],

  run: async (client, message, args) => {
    const helpEmbed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: lookup')
      .setDescription('Look up available vanities or usernames.')
      .addFields(
        { name: '**Aliases**', value: 'vanity', inline: true },
        { name: '**Parameters**', value: '[resource type] [length]', inline: true },
        { name: '**Information**', value: 'N/A', inline: true },
        { name: '**Usage**', value: '```Syntax: lookup <username|vanity> [length]\nExample: lookup vanity 4\nExample: lookup username 5```' }
      )
      .setFooter({ text: 'Module: utility' })
      .setTimestamp()
      .setColor(color);

    if (!args[0]) return message.channel.send({ embeds: [helpEmbed] });

    const type = args[0].toLowerCase();
    const length = parseInt(args[1]) || 3;

    if (!['username', 'vanity'].includes(type)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Resource type must be \`username\` or \`vanity\`.`)] });
    }

    if (length < 1 || length > 32) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Length must be between 1 and 32.`)] });
    }

    const thinking = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`Searching for available **${type}** with length **${length}**...`)] });

    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const generateRandom = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

    const results = [];
    const attempts = 20;

    for (let i = 0; i < attempts; i++) {
      const candidate = generateRandom(length);
      try {
        if (type === 'vanity') {
          const res = await fetch(`https://discord.com/api/v10/invites/${candidate}`);
          if (res.status === 404) results.push(candidate);
        } else {
          const res = await fetch(`https://discord.com/api/v10/users/@me`, {
            headers: { Authorization: `Bot ${client.token}` },
          });
          results.push(candidate);
        }
      } catch {}
      if (results.length >= 5) break;
      await new Promise(r => setTimeout(r, 300));
    }

    if (!results.length) {
      return thinking.edit({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: No available ${type}s found with length **${length}** after checking.`)] });
    }

    return thinking.edit({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Available ${type}s (length ${length})`).setDescription(results.map(r => `\`${r}\``).join(', ')).setTimestamp()] });
  },
};
