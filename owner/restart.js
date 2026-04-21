const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { color } = require('../config.json');
const { approve, warn } = require('../emojis.json');
const { isOwner } = require('../utils/owners');

module.exports = {
  name: 'restart',
  category: 'owner',
  help: [
    {
      name: 'restart',
      description: 'Restarts the bot process',
      aliases: 'n/a',
      parameters: 'n/a',
      information: 'Bot Owner / Administrator',
      usage: 'restart',
      example: 'restart'
    }
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator) && !isOwner(message.author.id)) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#efa23a')
            .setDescription(`${warn} ${message.author}: You're **missing** permission: \`administrator\``)
        ]
      });
    }

    await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(color)
          .setDescription(`${approve} ${message.author}: Restarting the bot...`)
      ]
    });

    console.log(`[Restart] Triggered by ${message.author.tag} (${message.author.id}) in ${message.guild.name}`);
    setTimeout(() => process.exit(0), 1000);
  }
};
