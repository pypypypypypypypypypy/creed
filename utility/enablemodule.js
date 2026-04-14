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
        name: 'enablemodule',
        description: 'Re-enable a disabled module',
        aliases: 'emodule',
        parameters: '(module)',
        information: 'MANAGE_GUILD',
        usage: 'enablemodule (module)',
        example: 'enablemodule module'
    }
],

    name: 'enablemodule',
  aliases: ['emodule', 'em'],
  category: 'utility',

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });

    if (!args[0]) {
      const disabled = db.get(`disabled_modules_${message.guild.id}`) || [];
      const embed = new EmbedBuilder().setColor(color)
        .setTitle('Enable Module')
        .setDescription('Re-enable a previously disabled category of commands.')
        .addFields(
          { name: 'Currently Disabled', value: disabled.length ? disabled.join(', ') : 'None — all modules are enabled', inline: false }
        )
        .setFooter({ text: 'Usage: ,enablemodule <module>' });
      return message.channel.send({ embeds: [embed] });
    }

    const mod = args[0].toLowerCase();
    if (!VALID_MODULES.includes(mod))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: \`${mod}\` is not a valid module.`)] });

    const disabled = db.get(`disabled_modules_${message.guild.id}`) || [];
    if (!disabled.includes(mod))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: The \`${mod}\` module is not disabled.`)] });

    const updated = disabled.filter(m => m !== mod);
    db.set(`disabled_modules_${message.guild.id}`, updated);
    return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: The \`${mod}\` module has been **enabled** in this server.`)] });
  }
};
