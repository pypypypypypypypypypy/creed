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

    // Build position list. Highest in our layout (Developer, index 0) gets the
    // largest position; lowest (NPC) gets position 1.
    const positions = found.map(({ role }, _i) => {
      const layoutIndex = ROLES.findIndex((d) => d.name === role.name);
      return { role: role.id, position: ROLES.length - layoutIndex };
    });

    try {
      await guild.roles.setPositions(positions);
    } catch (e) {
      return message.channel.send({ embeds: [
        new EmbedBuilder().setColor(color).setDescription(`${deny} ${message.author}: Reorder failed: ${e.message}`),
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
