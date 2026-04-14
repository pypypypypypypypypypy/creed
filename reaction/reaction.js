const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const db = require('../db');

function parseEmoji(emojiStr) {
  const custom = emojiStr.match(/^<a?:(\w+):(\d+)>$/);
  if (custom) return { id: custom[2], name: custom[1] };
  return emojiStr;
}

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'reaction',
        description: 'Manage auto-reactions for channels or messages',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'reaction',
        example: 'reaction'
    },
    {
        name: 'reaction add',
        description: 'Add an auto-reaction to a channel',
        aliases: 'n/a',
        parameters: '(channel) (emoji)',
        information: 'MANAGE_GUILD',
        usage: 'reaction add (channel) (emoji)',
        example: 'reaction add channel'
    },
    {
        name: 'reaction remove',
        description: 'Remove an auto-reaction',
        aliases: 'n/a',
        parameters: '(channel) (emoji)',
        information: 'MANAGE_GUILD',
        usage: 'reaction remove (channel) (emoji)',
        example: 'reaction remove channel'
    },
    {
        name: 'reaction list',
        description: 'List all auto-reactions',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'reaction list',
        example: 'reaction list'
    },
    {
        name: 'reaction reset',
        description: 'Reset all auto-reactions',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'reaction reset',
        example: 'reaction reset'
    }
],

    name: 'reaction',
  aliases: [],

  run: async (client, message, args) => {
    const sub = args[0]?.toLowerCase();

    // reaction <message link> <emoji>
    if (!sub || sub.startsWith('https://')) {
      const link = args[0];
      const emojiStr = args[1];
      if (!link || !emojiStr) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Please provide a **message link** and **emoji**.\nUsage: \`reaction <message link> <emoji>\``)]
        });
      }

      const match = link.match(/https:\/\/(?:ptb\.|canary\.)?discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/);
      if (!match) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Invalid message link.`)]
        });
      }

      const [, , channelId, messageId] = match;
      try {
        const ch = await client.channels.fetch(channelId).catch(() => null);
        if (!ch) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Could not find that channel.`)] });
        const msg = await ch.messages.fetch(messageId).catch(() => null);
        if (!msg) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Could not find that message.`)] });

        const emoji = parseEmoji(emojiStr);
        await msg.react(typeof emoji === 'string' ? emoji : `${emoji.name}:${emoji.id}`);
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Added reaction ${emojiStr} to the message.`)]
        });
      } catch (e) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Failed to react to the message. Make sure the emoji is valid.`)]
        });
      }
    }

    // reaction add <emoji> <trigger>
    if (sub === 'add') {
      const emoji = args[1];
      const trigger = args.slice(2).join(' ').toLowerCase();
      if (!emoji || !trigger) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Usage: \`reaction add <emoji> <trigger word>\``)]
        });
      }
      const key = `reaction_triggers_${message.guild.id}`;
      const triggers = db.get(key) || [];
      triggers.push({ emoji, trigger, owner: message.author.id });
      db.set(key, triggers);
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Added reaction trigger **${trigger}** → ${emoji}`)]
      });
    }

    // reaction delete <emoji> <trigger>
    if (sub === 'delete') {
      const emoji = args[1];
      const trigger = args.slice(2).join(' ').toLowerCase();
      if (!emoji || !trigger) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Usage: \`reaction delete <emoji> <trigger word>\``)]
        });
      }
      const key = `reaction_triggers_${message.guild.id}`;
      let triggers = db.get(key) || [];
      const before = triggers.length;
      triggers = triggers.filter(t => !(t.emoji === emoji && t.trigger === trigger));
      db.set(key, triggers);
      if (triggers.length < before) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Removed reaction trigger **${trigger}** → ${emoji}`)]
        });
      }
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: No trigger found matching **${trigger}** → ${emoji}`)]
      });
    }

    // reaction deleteall <trigger>
    if (sub === 'deleteall') {
      const trigger = args.slice(1).join(' ').toLowerCase();
      if (!trigger) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Usage: \`reaction deleteall <trigger word>\``)]
        });
      }
      const key = `reaction_triggers_${message.guild.id}`;
      let triggers = db.get(key) || [];
      const before = triggers.length;
      triggers = triggers.filter(t => t.trigger !== trigger);
      db.set(key, triggers);
      const removed = before - triggers.length;
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Removed **${removed}** reaction trigger(s) for **${trigger}**`)]
      });
    }

    // reaction clear
    if (sub === 'clear') {
      db.set(`reaction_triggers_${message.guild.id}`, []);
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Cleared all reaction triggers in this guild.`)]
      });
    }

    // reaction owner <trigger>
    if (sub === 'owner') {
      const trigger = args.slice(1).join(' ').toLowerCase();
      if (!trigger) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Usage: \`reaction owner <trigger word>\``)]
        });
      }
      const triggers = db.get(`reaction_triggers_${message.guild.id}`) || [];
      const found = triggers.find(t => t.trigger === trigger);
      if (!found) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: No trigger found for **${trigger}**`)]
        });
      }
      const owner = await client.users.fetch(found.owner).catch(() => null);
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: **${trigger}** was created by ${owner ? owner.tag : `<@${found.owner}>`}`)]
      });
    }

    // reaction list
    if (sub === 'list') {
      const triggers = db.get(`reaction_triggers_${message.guild.id}`) || [];
      if (!triggers.length) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: No reaction triggers in this guild.`)]
        });
      }
      const grouped = {};
      for (const t of triggers) {
        if (!grouped[t.trigger]) grouped[t.trigger] = [];
        grouped[t.trigger].push(t.emoji);
      }
      const lines = Object.entries(grouped).map(([trigger, emojis]) => `**${trigger}** → ${emojis.join(' ')}`);
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setTitle('Reaction Triggers').setDescription(lines.join('\n'))]
      });
    }

    // reaction messages
    if (sub === 'messages') {
      const msub = args[1]?.toLowerCase();

      // reaction messages list
      if (msub === 'list') {
        const data = db.get(`reaction_messages_${message.guild.id}`) || {};
        const entries = Object.entries(data);
        if (!entries.length) {
          return message.channel.send({
            embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: No auto-reaction channels set.`)]
          });
        }
        const lines = entries.map(([channelId, emojis]) => `<#${channelId}>: ${emojis.join(' ')}`);
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setTitle('Auto Reaction Channels').setDescription(lines.join('\n'))]
        });
      }

      // reaction messages <channel> [emoji1] [emoji2] [emoji3]
      const channelMention = args[1];
      const channelId = channelMention?.replace(/[<#>]/g, '');
      const emojis = args.slice(2).filter(Boolean);

      if (!channelMention) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Usage: \`reaction messages <channel> [emoji1] [emoji2] [emoji3]\`\nOmit emojis to remove auto reactions from channel.`)]
        });
      }

      const key = `reaction_messages_${message.guild.id}`;
      const data = db.get(key) || {};

      if (!emojis.length) {
        delete data[channelId];
        db.set(key, data);
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Removed auto reactions from <#${channelId}>.`)]
        });
      }

      data[channelId] = emojis;
      db.set(key, data);
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Set auto reactions for <#${channelId}>: ${emojis.join(' ')}`)]
      });
    }

    return message.channel.send({
      embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Unknown subcommand. Use \`reaction list\`, \`reaction add\`, \`reaction delete\`, etc.`)]
    });
  }
};
