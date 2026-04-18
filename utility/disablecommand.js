const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'disablecommand',
        description: 'Disable a command in the server',
        aliases: 'disablecmd',
        parameters: '(command)',
        information: 'MANAGE_GUILD',
        usage: 'disablecommand (command)',
        example: 'disablecommand command'
    }
],

    name: 'disablecommand',
  aliases: ['disablecmd', 'disablcommand'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });

    if (!args[0]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}disablecommand [#channel] <command>\``)] });

    const channel = message.mentions.channels.first();
    const cmdName = channel ? args[1]?.toLowerCase() : args[0]?.toLowerCase();
    if (!cmdName) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Provide a command name.`)] });

    const cmd = client.commands.get(cmdName) || client.commands.find(c => c.aliases?.includes(cmdName));
    if (!cmd) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Command \`${cmdName}\` not found.`)] });
    if (cmd.name === 'enablecommand' || cmd.name === 'disablecommand') return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You cannot disable this command.`)] });

    const key = channel ? `disabled_${message.guild.id}_${channel.id}_${cmd.name}` : `disabled_${message.guild.id}_${cmd.name}`;
    db.set(key, true);
    const where = channel ? `in ${channel}` : 'server-wide';
    message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Disabled command \`${cmd.name}\` ${where}.`)] });
  }
};
