const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

// In-memory store (use db for persistence in production)
if (!global.reactionRoles) global.reactionRoles = {};

function getKey(guildId, messageId, emoji) {
  return `${guildId}:${messageId}:${emoji}`;
}

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'reactionrole',
        description: 'Manage reaction-based role menus',
        aliases: 'rr',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'reactionrole',
        example: 'reactionrole'
    },
    {
        name: 'reactionrole add',
        description: 'Add a reaction role',
        aliases: 'n/a',
        parameters: '(message link) (emoji) (role)',
        information: 'MANAGE_GUILD',
        usage: 'reactionrole add (message link) (emoji) (role)',
        example: 'reactionrole add message'
    },
    {
        name: 'reactionrole remove',
        description: 'Remove a reaction role',
        aliases: 'n/a',
        parameters: '(message link) (emoji)',
        information: 'MANAGE_GUILD',
        usage: 'reactionrole remove (message link) (emoji)',
        example: 'reactionrole remove message'
    },
    {
        name: 'reactionrole list',
        description: 'List all reaction roles',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'reactionrole list',
        example: 'reactionrole list'
    },
    {
        name: 'reactionrole reset',
        description: 'Reset all reaction roles',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'reactionrole reset',
        example: 'reactionrole reset'
    }
],

    name: 'reactionrole',
  aliases: ['rr'],

  run: async (client, message, args) => {
    const sub = args[0]?.toLowerCase();

    const helpEmbed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: reactionrole')
      .setDescription('Manage reaction roles for the server.')
      .addFields(
        { name: '**Subcommands**', value: 'add, remove, list, clear', inline: false },
        { name: '**Usage**', value: '```reactionrole add <message link> <emoji> <role>\nreactionrole remove <message link> <emoji>\nreactionrole list\nreactionrole clear```' }
      )
      .setFooter({ text: 'Module: utility' })
      .setTimestamp()
      .setColor(color);

    const linkRegex = /https?:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/channels\/(\d+)\/(\d+)\/(\d+)/;

    if (!sub || !['add', 'remove', 'list', 'clear'].includes(sub)) {
      return message.channel.send({ embeds: [helpEmbed] });
    }

    if (sub === 'list') {
      const guildRoles = Object.entries(global.reactionRoles)
        .filter(([k]) => k.startsWith(message.guild.id + ':'));
      if (!guildRoles.length) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: No reaction roles set up in this server.`)] });
      }
      const lines = guildRoles.map(([k, v]) => {
        const [, msgId, emoji] = k.split(':');
        return `Message \`${msgId}\` | Emoji: ${emoji} | Role: <@&${v}>`;
      });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Reaction Roles').setDescription(lines.join('\n')).setTimestamp()] });
    }

    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
    }

    if (sub === 'clear') {
      Object.keys(global.reactionRoles).forEach(k => {
        if (k.startsWith(message.guild.id + ':')) delete global.reactionRoles[k];
      });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('a3eb7b').setDescription(`${approve} ${message.author}: Cleared all reaction roles in this server.`)] });
    }

    if (sub === 'add') {
      const [, link, emojiArg, roleArg] = args;
      if (!link || !emojiArg || !roleArg) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Usage: \`reactionrole add <message link> <emoji> <role>\``)] });
      }
      const match = link.match(linkRegex);
      if (!match) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Invalid message link.`)] });
      const [, , channelId, messageId] = match;
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(roleArg);
      if (!role) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Role not found.`)] });

      const targetChannel = client.channels.cache.get(channelId);
      if (!targetChannel) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Channel not found.`)] });
      const targetMessage = await targetChannel.messages.fetch(messageId).catch(() => null);
      if (!targetMessage) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Message not found.`)] });

      await targetMessage.react(emojiArg).catch(() => null);
      const key = getKey(message.guild.id, messageId, emojiArg);
      global.reactionRoles[key] = role.id;

      return message.channel.send({ embeds: [new EmbedBuilder().setColor('a3eb7b').setDescription(`${approve} ${message.author}: Added reaction role ${emojiArg} → <@&${role.id}> to that message.`)] });
    }

    if (sub === 'remove') {
      const [, link, emojiArg] = args;
      if (!link || !emojiArg) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Usage: \`reactionrole remove <message link> <emoji>\``)] });
      }
      const match = link.match(linkRegex);
      if (!match) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Invalid message link.`)] });
      const [, , , messageId] = match;
      const key = getKey(message.guild.id, messageId, emojiArg);
      if (!global.reactionRoles[key]) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: No reaction role found for that message and emoji.`)] });
      }
      delete global.reactionRoles[key];
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('a3eb7b').setDescription(`${approve} ${message.author}: Removed reaction role for emoji ${emojiArg} on that message.`)] });
    }
  },
};
