const { EmbedBuilder, PermissionFlagsBits, PermissionsBitField } = require('discord.js');
const { color } = require('../config.json');
const { warn, deny, approve } = require('../emojis.json');
const { canRunOwnerCmd } = require('../utils/owners');
const { ROLES } = require('../data/serverLayout');

const P = PermissionFlagsBits;

module.exports = {
  category: 'owner',
  help: [
    {
      name: 'ownerroles',
      description: '[Owner] Create the canonical role layout in hierarchy order — no reordering needed, no channels touched.',
      aliases: 'mkroles',
      parameters: 'n/a',
      information: 'Owner-only (or authorized). Creates roles top-down (Developer first, NPC last). Because Discord drops every new role to the bottom of the hierarchy, this naturally lands them in the right order — no setPositions, no requirement that the bot sits above anything but @everyone. Roles that already exist by name are skipped.',
      usage: 'ownerroles',
      example: 'ownerroles',
    },
  ],

  name: 'ownerroles',
  aliases: ['mkroles'],

  run: async (client, message, args) => {
    if (!canRunOwnerCmd(message.author.id, 'ownerroles')) return;
    if (!message.guild) return;

    const guild = message.guild;
    const me = guild.members.me;
    if (!me.permissions.has(P.ManageRoles)) {
      return message.channel.send({ embeds: [
        new EmbedBuilder().setColor(color).setDescription(`${deny} ${message.author}: I need **Manage Roles**.`),
      ] });
    }

    await guild.roles.fetch().catch(() => {});

    const created = [];
    const skipped = [];
    const errors = [];

    // Iterate TOP-DOWN. Developer is created first → ends up highest, because
    // every subsequent role gets inserted at position 1 and pushes the older
    // ones up. NPC is created last → stays at the bottom.
    for (const def of ROLES) {
      const existing = guild.roles.cache.find((r) => r.name === def.name);
      if (existing) { skipped.push(def.name); continue; }
      try {
        await guild.roles.create({
          name: def.name,
          color: def.color,
          permissions: new PermissionsBitField(def.perms),
          reason: `ownerroles by ${message.author.tag}`,
        });
        created.push(def.name);
      } catch (e) {
        errors.push(`\`${def.name}\`: ${e.message}`);
      }
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('Owner roles — done')
      .addFields(
        { name: `Created (${created.length})`, value: created.length ? created.join(', ').slice(0, 1024) : '*none*' },
        { name: `Skipped (${skipped.length})`, value: skipped.length ? skipped.join(', ').slice(0, 1024) : '*none*' },
      );
    if (errors.length) {
      embed.addFields({ name: `Errors (${errors.length})`, value: errors.slice(0, 8).join('\n').slice(0, 1024) });
    }
    if (skipped.length && created.length) {
      embed.setFooter({ text: 'Newly-created roles land just above @everyone. Pre-existing roles kept their old positions — run ,organizeroles to align everything.' });
    }
    return message.channel.send({ embeds: [embed] });
  },
};
