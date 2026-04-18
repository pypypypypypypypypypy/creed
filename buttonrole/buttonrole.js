const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');

if (!global.buttonRoles) global.buttonRoles = {};

module.exports = {
  category: 'buttonrole',
  help: [
    {
        name: 'buttonrole',
        description: 'Manage button-based role assignment',
        aliases: 'brole',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'buttonrole',
        example: 'buttonrole'
    },
    {
        name: 'buttonrole add',
        description: 'Add a button role to a message',
        aliases: 'n/a',
        parameters: '(message link) (role) (label)',
        information: 'MANAGE_GUILD',
        usage: 'buttonrole add (message link) (role) (label)',
        example: 'buttonrole add message'
    },
    {
        name: 'buttonrole remove',
        description: 'Remove a button role',
        aliases: 'n/a',
        parameters: '(message link) (role)',
        information: 'MANAGE_GUILD',
        usage: 'buttonrole remove (message link) (role)',
        example: 'buttonrole remove message'
    },
    {
        name: 'buttonrole list',
        description: 'List all button roles',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'buttonrole list',
        example: 'buttonrole list'
    }
],

    name: 'buttonrole',
  aliases: ['brole'],

  run: async (client, message, args) => {
    const sub = args[0]?.toLowerCase();

    const helpEmbed = new EmbedBuilder()
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
      .setTitle('Command: buttonrole')
      .setDescription('Manage button roles for messages.')
      .addFields(
        { name: '**Subcommands**', value: 'add, remove, removeall, reset, list', inline: false },
        { name: '**Usage**', value: '```buttonrole add <message link> <role> [style] [emoji] [label]\nbuttonrole remove <message link> <index>\nbuttonrole removeall <message link>\nbuttonrole reset\nbuttonrole list```' }
      )
      .setFooter({ text: 'Module: utility' })
      .setTimestamp()
      .setColor(color);

    if (!sub || !['add','remove','removeall','reset','list'].includes(sub)) {
      return message.channel.send({ embeds: [helpEmbed] });
    }

    const guildId = message.guild.id;
    const linkRegex = /https?:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/channels\/(\d+)\/(\d+)\/(\d+)/;

    if (sub === 'list') {
      const guildButtons = Object.entries(global.buttonRoles).filter(([k]) => k.startsWith(guildId + ':'));
      if (!guildButtons.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription('No button roles in this server.')] });
      const lines = guildButtons.map(([k, v]) => {
        const msgId = k.split(':')[1];
        const roles = v.map((r, i) => `  ${i + 1}. ${r.label || r.roleId} → <@&${r.roleId}>`).join('\n');
        return `Message \`${msgId}\`:\n${roles}`;
      });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Button Roles').setDescription(lines.join('\n\n')).setTimestamp()] });
    }

    if (sub === 'reset') {
      Object.keys(global.buttonRoles).forEach(k => { if (k.startsWith(guildId + ':')) delete global.buttonRoles[k]; });
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Cleared all button roles in this server.`)] });
    }

    const linkArg = args[1];
    if (!linkArg) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Provide a message link.`)] });
    const match = linkArg.match(linkRegex);
    if (!match) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Invalid message link.`)] });
    const [, , channelId, messageId] = match;
    const key = `${guildId}:${messageId}`;

    if (sub === 'removeall') {
      delete global.buttonRoles[key];
      const ch = client.channels.cache.get(channelId);
      if (ch) {
        const msg = await ch.messages.fetch(messageId).catch(() => null);
        if (msg) await msg.edit({ components: [] }).catch(() => {});
      }
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Removed all button roles from that message.`)] });
    }

    if (sub === 'remove') {
      const idx = parseInt(args[2]) - 1;
      if (isNaN(idx)) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Provide a valid index.`)] });
      const existing = global.buttonRoles[key] || [];
      if (idx < 0 || idx >= existing.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Index out of range.`)] });
      existing.splice(idx, 1);
      global.buttonRoles[key] = existing;

      const ch = client.channels.cache.get(channelId);
      if (ch && existing.length > 0) {
        const msg = await ch.messages.fetch(messageId).catch(() => null);
        if (msg) {
          const row = new ActionRowBuilder().addComponents(
            existing.map(r => {
              const btn = new ButtonBuilder()
                .setCustomId(`brole_${r.roleId}`)
                .setStyle(r.style || ButtonStyle.Primary);
              if (r.label) btn.setLabel(r.label);
              if (r.emoji) btn.setEmoji(r.emoji);
              return btn;
            })
          );
          await msg.edit({ components: [row] }).catch(() => {});
        }
      }
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Removed button role at index ${idx + 1}.`)] });
    }

    if (sub === 'add') {
      const [, , roleArg, styleArg, emojiArg, ...labelParts] = args;
      if (!roleArg) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Provide a role.`)] });
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(roleArg);
      if (!role) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Role not found.`)] });

      const styleMap = { primary: ButtonStyle.Primary, secondary: ButtonStyle.Secondary, success: ButtonStyle.Success, danger: ButtonStyle.Danger };
      const btnStyle = (styleArg && styleMap[styleArg.toLowerCase()]) || ButtonStyle.Primary;
      const label = labelParts.length ? labelParts.join(' ') : role.name;

      if (!global.buttonRoles[key]) global.buttonRoles[key] = [];
      global.buttonRoles[key].push({ roleId: role.id, style: btnStyle, emoji: emojiArg || null, label });

      const ch = client.channels.cache.get(channelId);
      if (!ch) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Channel not found.`)] });
      const msg = await ch.messages.fetch(messageId).catch(() => null);
      if (!msg) return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Message not found.`)] });

      const all = global.buttonRoles[key];
      const rows = [];
      for (let i = 0; i < all.length; i += 5) {
        const row = new ActionRowBuilder().addComponents(
          all.slice(i, i + 5).map(r => {
            const btn = new ButtonBuilder()
              .setCustomId(`brole_${r.roleId}`)
              .setStyle(r.style || ButtonStyle.Primary);
            if (r.label) btn.setLabel(r.label);
            if (r.emoji) btn.setEmoji(r.emoji);
            return btn;
          })
        );
        rows.push(row);
      }

      await msg.edit({ components: rows }).catch(() => {});
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Added button role **${label}** → <@&${role.id}>.`)] });
    }
  },
};
