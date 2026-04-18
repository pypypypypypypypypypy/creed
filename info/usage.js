const { EmbedBuilder } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'information',
  help: [
    {
        name: 'usage',
        description: 'View usage stats for a command',
        aliases: 'n/a',
        parameters: '(command)',
        information: 'n/a',
        usage: 'usage (command)',
        example: 'usage command'
    }
],

    name: 'usage',

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    const cmdName = args[0]?.toLowerCase();
    if (!cmdName) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}usage <command>\``)] });

    const cmd = client.commands.get(cmdName) || client.commands.get(client.aliases.get(cmdName));
    if (!cmd) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Command \`${cmdName}\` not found.`)] });

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`Usage: ${cmd.name}`)
      .addFields(
        { name: 'Name', value: cmd.name, inline: true },
        { name: 'Aliases', value: cmd.aliases?.join(', ') || 'None', inline: true },
        { name: 'Description', value: cmd.description || 'No description provided.', inline: false }
      )
      .setFooter({ text: 'Module: info' })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
