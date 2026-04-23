const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

module.exports = {
  name: 'alias',
  aliases: [],
  category: 'configuration',
  help: [
    { name: 'alias', description: 'Manage command aliases', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'alias', example: 'alias' },
    { name: 'alias add', description: 'Add a command alias', aliases: 'n/a', parameters: '(command) (alias)', information: 'MANAGE_GUILD', usage: 'alias add (command) (alias)', example: 'alias add ban b' },
    { name: 'alias remove', description: 'Remove a command alias', aliases: 'n/a', parameters: '(alias)', information: 'MANAGE_GUILD', usage: 'alias remove (alias)', example: 'alias remove b' },
    { name: 'alias list', description: 'List all custom aliases', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'alias list', example: 'alias list' },
    { name: 'alias clear', description: 'Clear all custom aliases', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'alias clear', example: 'alias clear' },
  ],

  run: async (client, message, args) => {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });

    const prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const sub = (args[0] || '').toLowerCase();
    const guildId = message.guild.id;
    const aliasKey = `custom_aliases_${guildId}`;

    if (!sub) {
      const aliases = db.get(aliasKey) || {};
      const count = Object.keys(aliases).length;
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color)
        .setTitle('Command Aliases')
        .setDescription(`**${count}** custom alias(es) configured.`)
        .addFields({ name: 'Subcommands', value: `\`${prefix}alias add <command> <alias>\`\n\`${prefix}alias remove <alias>\`\n\`${prefix}alias list\`\n\`${prefix}alias clear\`` })
        .setTimestamp()] });
    }

    if (sub === 'add') {
      const cmdName = (args[1] || '').toLowerCase();
      const aliasName = (args[2] || '').toLowerCase();
      if (!cmdName || !aliasName) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`${prefix}alias add <command> <alias>\``)] });
      const cmd = client.commands.get(cmdName) || client.commands.get(client.aliases.get(cmdName));
      if (!cmd) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: \`${cmdName}\` is not a valid command.`)] });
      const aliases = db.get(aliasKey) || {};
      aliases[aliasName] = cmd.name;
      db.set(aliasKey, aliases);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: \`${aliasName}\` is now an alias for \`${cmd.name}\`.`)] });
    }

    if (sub === 'remove') {
      const aliasName = (args[1] || '').toLowerCase();
      if (!aliasName) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Provide an alias to remove.`)] });
      const aliases = db.get(aliasKey) || {};
      if (!aliases[aliasName]) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: \`${aliasName}\` is not a custom alias.`)] });
      delete aliases[aliasName];
      db.set(aliasKey, aliases);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Removed alias \`${aliasName}\`.`)] });
    }

    if (sub === 'list') {
      const aliases = db.get(aliasKey) || {};
      const entries = Object.entries(aliases);
      if (!entries.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: No custom aliases.`)] });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color)
        .setTitle('Custom Aliases')
        .setDescription(entries.map(([a, c]) => `\`${a}\` → \`${c}\``).join('\n'))] });
    }

    if (sub === 'clear') {
      db.set(aliasKey, {});
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: All custom aliases cleared.`)] });
    }
  }
};
