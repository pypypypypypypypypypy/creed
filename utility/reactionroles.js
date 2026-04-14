const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'reactionroles',
        description: 'Manage reaction-based role assignments',
        aliases: 'rr',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'reactionroles',
        example: 'reactionroles'
    },
    {
        name: 'reactionroles add',
        description: 'Add a reaction role to a message',
        aliases: 'n/a',
        parameters: '(message link) (emoji) (role)',
        information: 'MANAGE_GUILD',
        usage: 'reactionroles add (message link) (emoji) (role)',
        example: 'reactionroles add message'
    },
    {
        name: 'reactionroles remove',
        description: 'Remove a reaction role',
        aliases: 'n/a',
        parameters: '(message link) (emoji)',
        information: 'MANAGE_GUILD',
        usage: 'reactionroles remove (message link) (emoji)',
        example: 'reactionroles remove message'
    },
    {
        name: 'reactionroles list',
        description: 'List all reaction roles',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'reactionroles list',
        example: 'reactionroles list'
    },
    {
        name: 'reactionroles reset',
        description: 'Reset all reaction roles',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'reactionroles reset',
        example: 'reactionroles reset'
    }
],

    name: 'reactionroles',

  run: async (client, message, args) => {
    if (!global.reactionRoles) global.reactionRoles = {};

    const guildRoles = Object.entries(global.reactionRoles)
      .filter(([k]) => k.startsWith(message.guild.id + ':'));

    if (!guildRoles.length) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: No reaction roles set up in this server.`)] });
    }

    const lines = guildRoles.map(([k, v]) => {
      const [, msgId, emoji] = k.split(':');
      return `Message \`${msgId}\` | Emoji: ${emoji} | Role: <@&${v}>`;
    });

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`Reaction Roles — ${message.guild.name}`)
      .setDescription(lines.join('\n'))
      .setFooter({ text: `Total: ${guildRoles.length}` })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
