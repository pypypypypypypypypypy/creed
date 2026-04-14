const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

module.exports = {
  name: 'disablecommand',
  aliases: ['dc'],
  category: 'configuration',
  help: [
    { name: 'disablecommand', description: 'Disable a command in this server', aliases: 'dc', parameters: '(command)', information: 'MANAGE_GUILD', usage: 'disablecommand (command)', example: 'disablecommand snipe' },
    { name: 'disablecommand list', description: 'List all disabled commands', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'disablecommand list', example: 'disablecommand list' },
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });

    const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const sub = (args[0] || '').toLowerCase();
    const guildId = message.guild.id;

    if (!sub) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color)
      .setDescription(`${message.author}: Usage: \`${prefix}disablecommand <command>\` or \`${prefix}disablecommand list\``)] });

    if (sub === 'list') {
      const disabled = db.get(`disabled_commands_${guildId}`) || [];
      if (!disabled.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: No commands are disabled.`)] });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color)
        .setTitle('Disabled Commands')
        .setDescription(disabled.map(c => `\`${c}\``).join(', '))] });
    }

    const cmd = client.commands.get(sub) || client.commands.get(client.aliases.get(sub));
    if (!cmd) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: \`${sub}\` is not a valid command.`)] });

    const disabled = db.get(`disabled_commands_${guildId}`) || [];
    if (disabled.includes(cmd.name)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: \`${cmd.name}\` is already disabled.`)] });
    disabled.push(cmd.name);
    db.set(`disabled_commands_${guildId}`, disabled);
    db.set(`disabled_${guildId}_${cmd.name}`, true);
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: \`${cmd.name}\` has been disabled.`)] });
  }
};
