const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const db = require('../db');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'previousreact',
        description: 'View the previous reaction on a message',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'previousreact',
        example: 'previousreact'
    }
],

    name: 'previousreact',
  aliases: ['pr'],

  run: async (client, message, args) => {
    const sub = args[0]?.toLowerCase();

    // previousreact add <emoji> <trigger>
    if (!sub || sub === 'add') {
      if (sub === 'add' || !sub) {
        const emoji = args[1] || args[0];
        const triggerStart = sub === 'add' ? 2 : 1;
        const trigger = args.slice(triggerStart).join(' ').toLowerCase();
        if (!emoji || !trigger) {
          return message.channel.send({
            embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Usage: \`previousreact add <emoji> <trigger word>\``)]
          });
        }
        const key = `previousreact_triggers_${message.guild.id}`;
        const triggers = db.get(key) || [];
        triggers.push({ emoji, trigger, owner: message.author.id });
        db.set(key, triggers);
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Added previous reaction trigger **${trigger}** → ${emoji}`)]
        });
      }
    }

    // previousreact delete <emote> <trigger>
    if (sub === 'delete') {
      const emoji = args[1];
      const trigger = args.slice(2).join(' ').toLowerCase();
      if (!emoji || !trigger) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Usage: \`previousreact delete <emote> <trigger word>\``)]
        });
      }
      const key = `previousreact_triggers_${message.guild.id}`;
      let triggers = db.get(key) || [];
      const before = triggers.length;
      triggers = triggers.filter(t => !(t.emoji === emoji && t.trigger === trigger));
      db.set(key, triggers);
      if (triggers.length < before) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Removed previous reaction trigger **${trigger}** → ${emoji}`)]
        });
      }
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: No trigger found matching **${trigger}** → ${emoji}`)]
      });
    }

    // previousreact deleteall <trigger>
    if (sub === 'deleteall') {
      const trigger = args.slice(1).join(' ').toLowerCase();
      if (!trigger) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Usage: \`previousreact deleteall <trigger word>\``)]
        });
      }
      const key = `previousreact_triggers_${message.guild.id}`;
      let triggers = db.get(key) || [];
      const before = triggers.length;
      triggers = triggers.filter(t => t.trigger !== trigger);
      db.set(key, triggers);
      const removed = before - triggers.length;
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Removed **${removed}** previous reaction trigger(s) for **${trigger}**`)]
      });
    }

    // previousreact clear
    if (sub === 'clear') {
      db.set(`previousreact_triggers_${message.guild.id}`, []);
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Cleared all previous reaction triggers in this guild.`)]
      });
    }

    // previousreact owner <trigger>
    if (sub === 'owner') {
      const trigger = args.slice(1).join(' ').toLowerCase();
      if (!trigger) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Usage: \`previousreact owner <trigger word>\``)]
        });
      }
      const triggers = db.get(`previousreact_triggers_${message.guild.id}`) || [];
      const found = triggers.find(t => t.trigger === trigger);
      if (!found) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: No previous react trigger found for **${trigger}**`)]
        });
      }
      const owner = await client.users.fetch(found.owner).catch(() => null);
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: **${trigger}** was created by ${owner ? owner.tag : `<@${found.owner}>`}`)]
      });
    }

    // previousreact list
    if (sub === 'list') {
      const triggers = db.get(`previousreact_triggers_${message.guild.id}`) || [];
      if (!triggers.length) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: No previous reaction triggers in this guild.`)]
        });
      }
      const grouped = {};
      for (const t of triggers) {
        if (!grouped[t.trigger]) grouped[t.trigger] = [];
        grouped[t.trigger].push(t.emoji);
      }
      const lines = Object.entries(grouped).map(([trigger, emojis]) => `**${trigger}** → ${emojis.join(' ')}`);
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor(color).setTitle('Previous Reaction Triggers').setDescription(lines.join('\n'))]
      });
    }

    return message.channel.send({
      embeds: [new EmbedBuilder().setColor(color).setDescription(`${message.author}: Unknown subcommand. Use \`previousreact list\`, \`previousreact add\`, \`previousreact delete\`, etc.`)]
    });
  }
};
