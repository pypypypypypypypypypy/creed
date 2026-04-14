const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { color } = require('../config.json');
const db = require('../db');

function hasAdmin(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator);
}

function isOwner(member) {
  return member.guild.ownerId === member.id;
}

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'noselfreact',
        description: 'Toggle preventing self-reactions',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'noselfreact',
        example: 'noselfreact'
    }
],

    name: 'noselfreact',
  aliases: ['nsr'],

  run: async (client, message, args) => {
    const sub = args[0]?.toLowerCase();
    const guildKey = `noselfreact_${message.guild.id}`;

    // noselfreact (main — show status, requires Admin)
    if (!sub) {
      if (!hasAdmin(message.member)) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: You need **Administrator** permissions to use this command.`)]
        });
      }
      const cfg = db.get(guildKey) || {};
      const enabled = cfg.enabled || false;
      const punishment = cfg.punishment || 'none';
      const emoji = cfg.emoji || null;
      const bypass = cfg.bypass || false;
      const exempts = cfg.exempts || [];
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(color)
          .setTitle('NoSelfReact Configuration')
          .setDescription(
            `**Status:** ${enabled ? 'Enabled' : 'Disabled'}\n` +
            `**Punishment:** ${punishment}\n` +
            `**Emoji Filter:** ${emoji || 'None (all emojis)'}\n` +
            `**Bypass (Owner):** ${bypass ? 'On' : 'Off'}\n` +
            `**Exempts:** ${exempts.length ? exempts.map(e => `<@${e}>`).join(', ') : 'None'}`
          )]
      });
    }

    // noselfreact toggle <enable|disable>
    if (sub === 'toggle') {
      if (!hasAdmin(message.member)) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: You need **Administrator** permissions.`)]
        });
      }
      const setting = args[1]?.toLowerCase();
      if (!['enable', 'disable'].includes(setting)) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Usage: \`noselfreact toggle <enable|disable>\``)]
        });
      }
      const cfg = db.get(guildKey) || {};
      cfg.enabled = setting === 'enable';
      db.set(guildKey, cfg);
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: NoSelfReact has been **${setting}d**.`)]
      });
    }

    // noselfreact bypass <on|off> — Server Owner only
    if (sub === 'bypass') {
      if (!isOwner(message.member)) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Only the **Server Owner** can use this subcommand.`)]
        });
      }
      const setting = args[1]?.toLowerCase();
      if (!['on', 'off'].includes(setting)) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Usage: \`noselfreact bypass <on|off>\``)]
        });
      }
      const cfg = db.get(guildKey) || {};
      cfg.bypass = setting === 'on';
      db.set(guildKey, cfg);
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Owner bypass has been turned **${setting}**.`)]
      });
    }

    // noselfreact punishment <punishment>
    if (sub === 'punishment') {
      if (!hasAdmin(message.member)) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: You need **Administrator** permissions.`)]
        });
      }
      const punishment = args[1]?.toLowerCase();
      const validPunishments = ['none', 'warn', 'mute', 'kick', 'ban'];
      if (!punishment || !validPunishments.includes(punishment)) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Valid punishments: \`${validPunishments.join('`, `')}\``)]
        });
      }
      const cfg = db.get(guildKey) || {};
      cfg.punishment = punishment;
      db.set(guildKey, cfg);
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: NoSelfReact punishment set to **${punishment}**.`)]
      });
    }

    // noselfreact emoji <emoji or emote>
    if (sub === 'emoji') {
      if (!hasAdmin(message.member)) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: You need **Administrator** permissions.`)]
        });
      }

      const msub = args[1]?.toLowerCase();

      // noselfreact emoji list
      if (msub === 'list') {
        const cfg = db.get(guildKey) || {};
        const emojis = cfg.emojis || [];
        if (!emojis.length) {
          return message.channel.send({
            embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: No specific emojis set — all self-reactions are blocked.`)]
          });
        }
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setTitle('NoSelfReact Emoji List').setDescription(emojis.join(' '))]
        });
      }

      const emojiVal = args[1];
      if (!emojiVal) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Usage: \`noselfreact emoji <emoji>\` or \`noselfreact emoji list\``)]
        });
      }
      const cfg = db.get(guildKey) || {};
      const emojis = cfg.emojis || [];
      if (emojis.includes(emojiVal)) {
        cfg.emojis = emojis.filter(e => e !== emojiVal);
        db.set(guildKey, cfg);
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Removed ${emojiVal} from the blocked emoji list.`)]
        });
      }
      emojis.push(emojiVal);
      cfg.emojis = emojis;
      db.set(guildKey, cfg);
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Added ${emojiVal} to the blocked emoji list.`)]
      });
    }

    // noselfreact exempt <member|channel|role>
    if (sub === 'exempt') {
      if (!hasAdmin(message.member)) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: You need **Administrator** permissions.`)]
        });
      }

      const msub = args[1]?.toLowerCase();

      // noselfreact exempt list
      if (msub === 'list') {
        const cfg = db.get(guildKey) || {};
        const exempts = cfg.exempts || [];
        if (!exempts.length) {
          return message.channel.send({
            embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: No exempts set.`)]
          });
        }
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setTitle('NoSelfReact Exempts').setDescription(exempts.map(e => `<@${e}>`).join('\n'))]
        });
      }

      const target = message.mentions.members.first() || message.mentions.channels.first() || message.mentions.roles.first();
      if (!target) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Please mention a **member**, **channel**, or **role** to exempt.`)]
        });
      }
      const cfg = db.get(guildKey) || {};
      const exempts = cfg.exempts || [];
      const targetId = target.id;
      if (exempts.includes(targetId)) {
        cfg.exempts = exempts.filter(e => e !== targetId);
        db.set(guildKey, cfg);
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Removed <@${targetId}> from exempts.`)]
        });
      }
      exempts.push(targetId);
      cfg.exempts = exempts;
      db.set(guildKey, cfg);
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Added <@${targetId}> to exempts.`)]
      });
    }

    return message.channel.send({
      embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Unknown subcommand. Use \`noselfreact toggle\`, \`noselfreact punishment\`, \`noselfreact exempt\`, etc.`)]
    });
  }
};
