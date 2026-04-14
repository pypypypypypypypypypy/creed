const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

const VALID_MODULES = [
  'configuration', 'economy', 'fun', 'information', 'lastfm', 'moderation',
  'security', 'utility', 'giveaway', 'starboard', 'roleplay', 'reactionrole',
  'reaction', 'bumpreminder', 'sticker', 'stickymessage', 'emoji', 'buttonrole',
  'notify', 'timer', 'automod', 'message', 'music', 'leveling'
];

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'disablemodule',
        description: 'Disable an entire command module',
        aliases: 'dmodule',
        parameters: '(module)',
        information: 'MANAGE_GUILD',
        usage: 'disablemodule (module)',
        example: 'disablemodule module'
    }
],

    name: 'disablemodule',
  aliases: ['dmodule', 'dm'],
  category: 'utility',

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });

    if (!args[0]) {
      const disabled = db.get(`disabled_modules_${message.guild.id}`) || [];
      const embed = new EmbedBuilder().setColor(color)
        .setTitle('Disable Module')
        .setDescription('Disable an entire category of commands in this server.')
        .addFields(
          { name: 'Valid Modules', value: VALID_MODULES.join(', '), inline: false },
          { name: 'Currently Disabled', value: disabled.length ? disabled.join(', ') : 'None', inline: false }
        )
        .setFooter({ text: 'Usage: ,disablemodule <module>' });
      return message.channel.send({ embeds: [embed] });
    }

    const mod = args[0].toLowerCase();
    if (!VALID_MODULES.includes(mod))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: \`${mod}\` is not a valid module. Valid modules: ${VALID_MODULES.join(', ')}`)] });

    const disabled = db.get(`disabled_modules_${message.guild.id}`) || [];
    if (disabled.includes(mod))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: The \`${mod}\` module is already disabled.`)] });

    disabled.push(mod);
    db.set(`disabled_modules_${message.guild.id}`, disabled);
    return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: The \`${mod}\` module has been **disabled** in this server.`)] });
  }
};
