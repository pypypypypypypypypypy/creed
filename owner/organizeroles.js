const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn, deny, approve } = require('../emojis.json');
const { canRunOwnerCmd } = require('../utils/owners');
const { ROLES } = require('../data/serverLayout');

module.exports = {
  category: 'owner',
  help: [
    {
      name: 'organizeroles',
      description: '[Owner] Reorder existing roles to match the canonical layout (Developer at the top, NPC at the bottom).',
      aliases: 'roleorder, orgroles',
      parameters: 'n/a',
      information: 'Owner-only (or authorized via ,authorize). Looks for each role in the layout and bulk-reorders the ones it finds. Roles missing from the server are simply skipped — nothing is created or deleted.',
      usage: 'organizeroles',
      example: 'organizeroles',
    },
  ],

  name: 'organizeroles',
  aliases: ['roleorder', 'orgroles'],

  run: async (client, message, args) => {
    if (!canRunOwnerCmd(message.author.id, 'organizeroles')) return;
    if (!message.guild) return;

    const guild = message.guild;
    const me = guild.members.me;
    if (!me.permissions.has('ManageRoles')) {
      return message.channel.send({ embeds: [
        new EmbedBuilder().setColor(color).setDescription(`${deny} ${message.author}: I need **Manage Roles**.`),
      ] });
    }

    // Make sure the cache is fresh so position math is right.
    await guild.roles.fetch().catch(() => {});

    // Find layout roles in TOP-DOWN order (Developer first, NPC last).
    const found = [];
    const missing = [];
    for (const def of ROLES) {
      const role = guild.roles.cache.find((r) => r.name === def.name);
      if (role) found.push({ def, role }); else missing.push(def.name);
    }

    if (found.length === 0) {
      return message.channel.send({ embeds: [
        new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: None of the layout roles exist in this server. Run \`,ownersetup\` first.`),
      ] });
    }

    // Hierarchy gate. Discord forbids moving any role to a position >= the
    // bot's own top role, regardless of Manage Roles / Administrator. So we
    // pack the layout roles into the slots immediately below the bot.
    const myTop = me.roles.highest.position;
    if (myTop - 1 < found.length) {
      return message.channel.send({ embeds: [
        new EmbedBuilder().setColor(color).setDescription(
          `${deny} ${message.author}: My top role is at position **${myTop}** but I need to be above **${found.length}** layout roles. ` +
          `Drag my role higher in **Server Settings → Roles** (it must sit above every role being reordered) and try again.`
        ),
      ] });
    }

    // found is already in layout order (top-down). Place Developer at
    // (myTop - 1), API/Web Dev at (myTop - 2), …, NPC at (myTop - found.length).
    const positions = found.map(({ role }, i) => ({
      role: role.id,
      position: myTop - 1 - i,
    }));

    try {
      await guild.roles.setPositions(positions);
    } catch (e) {
      return message.channel.send({ embeds: [
        new EmbedBuilder().setColor(color).setDescription(
          `${deny} ${message.author}: Reorder failed: \`${e.message}\`. ` +
          `Most common cause is my role not being above the roles I'm trying to move.`
        ),
      ] });
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('Roles reorganized')
      .addFields(
        { name: `Reordered (${found.length})`, value: found.map(({ def }) => def.name).join(', ').slice(0, 1024) },
        { name: `Missing (${missing.length})`, value: missing.length ? missing.join(', ').slice(0, 1024) : '*none*' },
      );
    return message.channel.send({ embeds: [embed] });
  },
};
