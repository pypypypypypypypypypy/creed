const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');

module.exports = {
  category: 'information',
  help: [
    {
      name: 'members',
      description: 'View members with a specific role',
      aliases: 'inrole',
      parameters: '(role)',
      information: 'n/a',
      usage: 'members (role)',
      example: 'members @Member',
    },
  ],

  name: 'members',
  aliases: ['inrole'],

  run: async (client, message, args) => {
    if (args.includes('@everyone') || args.includes('@here')) return;

    if (!args[0]) {
      const helpEmbed = new EmbedBuilder()
        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL({ forceStatic: false }) })
        .setTitle('Command: members')
        .setDescription('View members in a role')
        .addFields(
          { name: '**Aliases**', value: 'inrole', inline: true },
          { name: '**Parameters**', value: 'role', inline: true },
          { name: '**Information**', value: 'N/A', inline: true },
          { name: '**Usage**', value: '```Syntax: members <role>\nExample: members @Friends```' },
        )
        .setFooter({ text: 'Module: information' })
        .setTimestamp()
        .setColor(color);
      return message.channel.send({ embeds: [helpEmbed] });
    }

    const query = args.join(' ').trim();
    const role =
      message.mentions.roles.first() ||
      message.guild.roles.cache.get(args[0]) ||
      message.guild.roles.cache.find(r => r.name.toLowerCase() === query.toLowerCase()) ||
      message.guild.roles.cache.find(r => r.name.toLowerCase().includes(query.toLowerCase()));

    if (!role) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You need to enter a **valid** role.`)],
      });
    }

    await message.channel.sendTyping().catch(() => {});

    let members;
    try {
      await message.guild.members.fetch();
      members = role.members;
    } catch {
      members = message.guild.members.cache.filter(m => m.roles.cache.has(role.id));
    }

    const total = members.size;

    if (total === 0) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(role.hexColor || color).setDescription(`${warn} ${message.author}: No members have the **${role.name}** role.`)],
      });
    }

    const sorted = [...members.values()].sort((a, b) => a.user.username.localeCompare(b.user.username));

    const lines = sorted.map(m => `${m} — \`${m.user.tag}\``);
    let description = '';
    let shown = 0;
    for (const line of lines) {
      if (description.length + line.length + 1 > 3900) break;
      description += (description ? '\n' : '') + line;
      shown++;
    }
    const truncated = shown < total;

    const embed = new EmbedBuilder()
      .setColor(role.hexColor || color)
      .setAuthor({
        name: message.author.username,
        iconURL: message.author.displayAvatarURL({ forceStatic: false, size: 2048 }),
      })
      .setTitle(`Members in '${role.name}'`)
      .setDescription(description)
      .setFooter({
        text: truncated
          ? `Showing ${shown} of ${total} members`
          : `${total} member${total === 1 ? '' : 's'}`,
      });

    return message.channel.send({ embeds: [embed] });
  },
};
