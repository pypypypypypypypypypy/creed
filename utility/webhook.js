const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

if (!global.webhooks) global.webhooks = {};

function genShortId() {
  return Math.random().toString(36).substr(2, 8);
}

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'webhook',
        description: 'Manage server webhooks',
        aliases: 'wh',
        parameters: 'n/a',
        information: 'MANAGE_WEBHOOKS',
        usage: 'webhook',
        example: 'webhook'
    },
    {
        name: 'webhook create',
        description: 'Create a webhook in a channel',
        aliases: 'n/a',
        parameters: '(channel) (name)',
        information: 'MANAGE_WEBHOOKS',
        usage: 'webhook create (channel) (name)',
        example: 'webhook create channel'
    },
    {
        name: 'webhook delete',
        description: 'Delete a webhook',
        aliases: 'n/a',
        parameters: '(webhook id)',
        information: 'MANAGE_WEBHOOKS',
        usage: 'webhook delete (webhook id)',
        example: 'webhook delete webhook'
    },
    {
        name: 'webhook list',
        description: 'List all webhooks',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_WEBHOOKS',
        usage: 'webhook list',
        example: 'webhook list'
    },
    {
        name: 'webhook send',
        description: 'Send a message via a webhook',
        aliases: 'n/a',
        parameters: '(webhook url) (message)',
        information: 'MANAGE_WEBHOOKS',
        usage: 'webhook send (webhook url) (message)',
        example: 'webhook send webhook'
    }
],

    name: 'webhook',
  aliases: ['wh'],

  run: async (client, message, args) => {
    const sub = args[0]?.toLowerCase();

    const helpEmbed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: webhook')
      .setDescription('Manage and use webhooks.')
      .addFields(
        { name: '**Subcommands**', value: 'create, delete, send, edit, avatar, list', inline: false },
        { name: '**Usage**', value: '```webhook create <name>\nwebhook delete <short id>\nwebhook send <short id> <content>\nwebhook edit <#channel> <message id> <content>\nwebhook avatar <short id> [url]\nwebhook list```' }
      )
      .setFooter({ text: 'Module: utility' })
      .setTimestamp()
      .setColor(color);

    if (!sub || !['create','delete','send','edit','avatar','list'].includes(sub)) {
      return message.channel.send({ embeds: [helpEmbed] });
    }

    const guildId = message.guild.id;
    if (!global.webhooks[guildId]) global.webhooks[guildId] = {};

    if (sub === 'list') {
      const whs = Object.entries(global.webhooks[guildId]);
      if (!whs.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription('No webhooks created via this bot in this server.')] });
      const lines = whs.map(([id, wh]) => `\`${id}\` — **${wh.name}** in <#${wh.channelId}>`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Webhooks').setDescription(lines.join('\n')).setTimestamp()] });
    }

    if (sub === 'create') {
      const name = args.slice(1).join(' ');
      if (!name) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Provide a name for the webhook.`)] });
      if (!message.member.permissions.has(PermissionFlagsBits.ManageWebhooks)) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_webhooks\``)] });
      }
      try {
        const wh = await message.channel.createWebhook({ name, reason: `Created by ${message.author.tag}` });
        const shortId = genShortId();
        global.webhooks[guildId][shortId] = { name, channelId: message.channel.id, url: wh.url, id: wh.id, token: wh.token };
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('a3eb7b').setDescription(`${approve} ${message.author}: Webhook **${name}** created! Short ID: \`${shortId}\``)] });
      } catch (e) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Failed to create webhook: ${e.message}`)] });
      }
    }

    if (sub === 'delete') {
      const shortId = args[1];
      if (!shortId) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Provide the short ID.`)] });
      const whData = global.webhooks[guildId][shortId];
      if (!whData) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Webhook not found.`)] });
      if (!message.member.permissions.has(PermissionFlagsBits.ManageWebhooks)) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_webhooks\``)] });
      }
      try {
        const wh = await client.fetchWebhook(whData.id, whData.token).catch(() => null);
        if (wh) await wh.delete();
        delete global.webhooks[guildId][shortId];
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('a3eb7b').setDescription(`${approve} ${message.author}: Deleted webhook \`${shortId}\`.`)] });
      } catch (e) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Failed: ${e.message}`)] });
      }
    }

    if (sub === 'send') {
      const [, shortId, ...contentParts] = args;
      const content = contentParts.join(' ');
      if (!shortId || !content) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Usage: \`webhook send <short id> <content>\``)] });
      const whData = global.webhooks[guildId][shortId];
      if (!whData) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Webhook not found.`)] });
      try {
        const wh = await client.fetchWebhook(whData.id, whData.token).catch(() => null);
        if (!wh) throw new Error('Webhook not found on Discord.');
        await wh.send({ content });
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('a3eb7b').setDescription(`${approve} ${message.author}: Message sent via webhook \`${shortId}\`.`)] });
      } catch (e) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Failed: ${e.message}`)] });
      }
    }

    if (sub === 'edit') {
      const targetChannel = message.mentions.channels.first();
      const messageId = args[2];
      const content = args.slice(3).join(' ');
      if (!targetChannel || !messageId || !content) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Usage: \`webhook edit <#channel> <message id> <content>\``)] });
      }
      try {
        const channelWebhooks = await targetChannel.fetchWebhooks();
        const wh = channelWebhooks.first();
        if (!wh) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: No webhook found in that channel.`)] });
        await wh.editMessage(messageId, { content });
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('a3eb7b').setDescription(`${approve} ${message.author}: Message edited.`)] });
      } catch (e) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Failed: ${e.message}`)] });
      }
    }

    if (sub === 'avatar') {
      const [, shortId, url] = args;
      if (!shortId) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Provide the short ID.`)] });
      const whData = global.webhooks[guildId][shortId];
      if (!whData) return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Webhook not found.`)] });
      try {
        const wh = await client.fetchWebhook(whData.id, whData.token).catch(() => null);
        if (!wh) throw new Error('Webhook not found on Discord.');
        await wh.edit({ avatar: url || null });
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('a3eb7b').setDescription(`${approve} ${message.author}: Webhook avatar ${url ? 'updated' : 'removed'}.`)] });
      } catch (e) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Failed: ${e.message}`)] });
      }
    }
  },
};
