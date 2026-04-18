const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

module.exports = {
  category: 'sticker',
  help: [
    {
        name: 'sticker',
        description: 'Manage server stickers',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_EXPRESSIONS',
        usage: 'sticker',
        example: 'sticker'
    },
    {
        name: 'sticker add',
        description: 'Add a sticker to the server',
        aliases: 'n/a',
        parameters: '(name) (emoji) (image)',
        information: 'MANAGE_EXPRESSIONS',
        usage: 'sticker add (name) (emoji) (image)',
        example: 'sticker add name'
    },
    {
        name: 'sticker remove',
        description: 'Remove a server sticker',
        aliases: 'n/a',
        parameters: '(sticker name)',
        information: 'MANAGE_EXPRESSIONS',
        usage: 'sticker remove (sticker name)',
        example: 'sticker remove sticker'
    },
    {
        name: 'sticker list',
        description: 'List all server stickers',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_EXPRESSIONS',
        usage: 'sticker list',
        example: 'sticker list'
    }
],

    name: 'sticker',
  aliases: ['stickers'],

  run: async (client, message, args) => {
    const sub = args[0]?.toLowerCase();

    const helpEmbed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: sticker')
      .setDescription('Manage custom stickers in the server.')
      .addFields(
        { name: '**Subcommands**', value: 'add, remove, rename, list', inline: false },
        { name: '**Usage**', value: '```sticker add <url> <name>\nsticker remove <name>\nsticker rename <old> <new>\nsticker list```' }
      )
      .setFooter({ text: 'Module: utility' })
      .setTimestamp()
      .setColor(color);

    if (!sub || !['add', 'remove', 'rename', 'list'].includes(sub)) {
      return message.channel.send({ embeds: [helpEmbed] });
    }

    if (sub === 'list') {
      const stickers = await message.guild.stickers.fetch();
      if (!stickers.size) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription('No custom stickers in this server.')] });
      const list = stickers.map(s => `**${s.name}** — \`${s.id}\``).join('\n');
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle(`Stickers (${stickers.size})`).setDescription(list).setTimestamp()] });
    }

    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_emojis_and_stickers\``)] });
    }
    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: I'm **missing** permission: \`manage_emojis_and_stickers\``)] });
    }

    if (sub === 'add') {
      const [, url, ...nameParts] = args;
      const name = nameParts.join('_');
      if (!url || !name) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`sticker add <url> <name>\``)] });
      try {
        const sticker = await message.guild.stickers.create({ file: url, name, tags: 'misc' });
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Added sticker **${sticker.name}**!`)] });
      } catch (e) {
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Failed to add sticker: ${e.message}`)] });
      }
    }

    if (sub === 'remove') {
      const name = args[1];
      if (!name) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`sticker remove <name>\``)] });
      const stickers = await message.guild.stickers.fetch();
      const sticker = stickers.find(s => s.name.toLowerCase() === name.toLowerCase());
      if (!sticker) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Sticker \`${name}\` not found.`)] });
      await sticker.delete().catch(() => null);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Removed sticker **${name}**.`)] });
    }

    if (sub === 'rename') {
      const [, oldName, newName] = args;
      if (!oldName || !newName) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Usage: \`sticker rename <old name> <new name>\``)] });
      const stickers = await message.guild.stickers.fetch();
      const sticker = stickers.find(s => s.name.toLowerCase() === oldName.toLowerCase());
      if (!sticker) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Sticker \`${oldName}\` not found.`)] });
      await sticker.edit({ name: newName }).catch(() => null);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Renamed sticker to **${newName}**.`)] });
    }
  },
};
