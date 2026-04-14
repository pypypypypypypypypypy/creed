const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'information',
  help: [
    {
        name: 'aliases',
        description: 'List all command aliases',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'aliases',
        example: 'aliases'
    }
],

    name: 'aliases',

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    const cmdName = args[0]?.toLowerCase();
    if (!cmdName) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}aliases <command>\``)] });

    const cmd = client.commands.get(cmdName) || client.commands.get(client.aliases.get(cmdName));
    if (!cmd) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Command \`${cmdName}\` not found.`)] });

    const aliasList = cmd.aliases?.length ? cmd.aliases.map(a => `\`${a}\``).join(', ') : 'This command has no aliases.';

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`Aliases for: ${cmd.name}`)
      .setDescription(aliasList)
      .setFooter({ text: 'Module: info' })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
