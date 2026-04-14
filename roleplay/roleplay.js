const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { paginate } = require('../utils/paginate');

module.exports = {
  category: 'roleplay',
  help: [
    {
        name: 'roleplay',
        description: 'View all roleplay commands',
        aliases: 'rp',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'roleplay',
        example: 'roleplay'
    }
],

    name: 'roleplay',
  aliases: ['rp'],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: You need **Administrator** permission to manage roleplay settings.`)] });
    }

    const sub = args[0]?.toLowerCase();
    let prefix = db.get(`prefix_${message.guild.id}`);
    if (prefix === null) prefix = require('../config.json').default_prefix;

    if (sub === 'enable') {
      db.set(`roleplay_${message.guild.id}`, true);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Roleplay commands have been **enabled**.`)] });
    }

    if (sub === 'disable') {
      db.delete(`roleplay_${message.guild.id}`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Roleplay commands have been **disabled**.`)] });
    }

    return paginate(message, [
      { name: 'roleplay', description: 'View roleplay settings for the server', aliases: 'rp', parameters: 'n/a', information: 'ADMINISTRATOR', usage: `${prefix}roleplay`, example: `${prefix}roleplay` },
      { name: 'roleplay enable', description: 'Enable roleplay commands for the server', aliases: 'n/a', parameters: 'n/a', information: 'ADMINISTRATOR', usage: `${prefix}roleplay enable`, example: `${prefix}roleplay enable` },
      { name: 'roleplay disable', description: 'Disable roleplay commands for the server', aliases: 'n/a', parameters: 'n/a', information: 'ADMINISTRATOR', usage: `${prefix}roleplay disable`, example: `${prefix}roleplay disable` },
    ], 'roleplay');
  }
};
