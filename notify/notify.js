const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

if (!global.notifyWatchers) global.notifyWatchers = {};

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'notify',
        description: 'Manage stream / content notifications',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'notify',
        example: 'notify'
    },
    {
        name: 'notify add',
        description: 'Add a notification for a streamer or content creator',
        aliases: 'n/a',
        parameters: '(platform) (username) (channel)',
        information: 'MANAGE_GUILD',
        usage: 'notify add (platform) (username) (channel)',
        example: 'notify add platform'
    },
    {
        name: 'notify remove',
        description: 'Remove a notification',
        aliases: 'n/a',
        parameters: '(platform) (username)',
        information: 'MANAGE_GUILD',
        usage: 'notify remove (platform) (username)',
        example: 'notify remove platform'
    },
    {
        name: 'notify list',
        description: 'List all active notifications',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'notify list',
        example: 'notify list'
    },
    {
        name: 'notify reset',
        description: 'Reset all notifications',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'notify reset',
        example: 'notify reset'
    }
],

    name: 'notify',
  aliases: ['notifications'],

  run: async (client, message, args) => {
    const sub = args[0]?.toLowerCase();

    const helpEmbed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: notify')
      .setDescription('Get notified when a Discord username or vanity URL becomes available.')
      .addFields(
        { name: '**Subcommands**', value: 'add, remove, list', inline: false },
        { name: '**Resource Types**', value: 'username, vanity', inline: false },
        { name: '**Usage**', value: '```notify add <username|vanity> <name>\nnotify remove <username|vanity> <name>\nnotify list```' }
      )
      .setFooter({ text: 'Module: utility' })
      .setTimestamp()
      .setColor(color);

    if (!sub || !['add', 'remove', 'list'].includes(sub)) {
      return message.channel.send({ embeds: [helpEmbed] });
    }

    const userId = message.author.id;

    if (sub === 'list') {
      const watches = global.notifyWatchers[userId];
      if (!watches || !watches.length) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription('You have no notify watchers set up.')] });
      }
      const lines = watches.map((w, i) => `**${i + 1}.** \`${w.type}\` — **${w.desired}**`);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Your Notify Watchers').setDescription(lines.join('\n')).setTimestamp()] });
    }

    if (sub === 'add') {
      const [, type, desired] = args;
      if (!type || !desired || !['username', 'vanity'].includes(type.toLowerCase())) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Usage: \`notify add <username|vanity> <name>\``)] });
      }
      if (!global.notifyWatchers[userId]) global.notifyWatchers[userId] = [];
      if (global.notifyWatchers[userId].length >= 10) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You can only watch up to 10 resources.`)] });
      }
      if (global.notifyWatchers[userId].find(w => w.type === type.toLowerCase() && w.desired === desired)) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're already watching that.`)] });
      }
      global.notifyWatchers[userId].push({ type: type.toLowerCase(), desired, channelId: message.channel.id });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('a3eb7b').setDescription(`${approve} ${message.author}: Now watching \`${type.toLowerCase()}\` **${desired}**. I'll notify you here when it becomes available.`)] });
    }

    if (sub === 'remove') {
      const [, type, desired] = args;
      if (!type || !desired) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Usage: \`notify remove <username|vanity> <name>\``)] });
      }
      const watches = global.notifyWatchers[userId] || [];
      const idx = watches.findIndex(w => w.type === type.toLowerCase() && w.desired === desired);
      if (idx === -1) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: No watcher found for that.`)] });
      }
      watches.splice(idx, 1);
      global.notifyWatchers[userId] = watches;
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('a3eb7b').setDescription(`${approve} ${message.author}: Removed watcher for \`${type.toLowerCase()}\` **${desired}**.`)] });
    }
  },
};
