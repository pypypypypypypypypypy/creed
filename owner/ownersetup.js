const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  PermissionsBitField,
} = require('discord.js');
const { color } = require('../config.json');
const { warn, deny, approve } = require('../emojis.json');
const { isOwner } = require('../utils/owners');

const P = PermissionFlagsBits;

const ROLES = [
  { name: 'Developer',                 color: '#A3A4FF', perms: [] },
  { name: 'Web Developer',             color: '#C27C0E', perms: [] },
  { name: 'API Developer',             color: '#2ECC71', perms: [] },
  { name: 'Administrator',             color: '#7EC0E8', perms: [P.Administrator] },
  { name: 'Manager',                   color: '#ED4245', perms: [P.ManageGuild, P.ManageRoles, P.ManageChannels, P.ManageMessages, P.KickMembers, P.BanMembers, P.ModerateMembers, P.MentionEveryone, P.ViewAuditLog] },
  { name: 'Partner',                   color: '#7FB6D8', perms: [] },
  { name: 'Head Moderator',            color: '#E67E22', perms: [P.KickMembers, P.BanMembers, P.ModerateMembers, P.ManageMessages, P.ManageNicknames, P.ViewAuditLog, P.MuteMembers, P.DeafenMembers, P.MoveMembers] },
  { name: 'Senior Moderator',          color: '#3498DB', perms: [P.KickMembers, P.BanMembers, P.ModerateMembers, P.ManageMessages, P.ManageNicknames, P.MuteMembers, P.DeafenMembers, P.MoveMembers] },
  { name: 'egirl',                     color: '#F47FFF', perms: [] },
  { name: 'Support Lead',              color: '#F5945C', perms: [P.ManageMessages] },
  { name: 'evelina beta',              color: '#9B9AFF', perms: [] },
  { name: 'legos bitches',             color: '#A89CF0', perms: [] },
  { name: 'Moderator',                 color: '#5DADE2', perms: [P.KickMembers, P.ModerateMembers, P.ManageMessages, P.ManageNicknames, P.MuteMembers, P.DeafenMembers, P.MoveMembers] },
  { name: 'Trusted',                   color: '#7FDBFF', perms: [] },
  { name: 'Sky',                       color: '#E84393', perms: [] },
  { name: 'Helper',                    color: '#BCC0C0', perms: [] },
  { name: 'Supporter',                 color: '#2ECC71', perms: [] },
  { name: 'Staff',                     color: '#9B59B6', perms: [P.ManageMessages] },
  { name: '-----Bug Hunter------',     color: '#FFFFFF', perms: [] },
  { name: 'Ruby Bug Hunter',           color: '#E74C3C', perms: [] },
  { name: 'Platinium Bug Hunter',      color: '#BDC3C7', perms: [] },
  { name: 'Golden Bug Hunter',         color: '#F1C40F', perms: [] },
  { name: 'Bug Hunter',                color: '#2ECC71', perms: [] },
  { name: '----Normal Roles-----',     color: '#85C1E9', perms: [] },
  { name: 'Translator',                color: '#E7E23A', perms: [] },
  { name: 'Instance Owner',            color: '#27AE60', perms: [] },
  { name: 'VIP',                       color: '#3498DB', perms: [] },
  { name: 'Donator',                   color: '#2ECC71', perms: [] },
  { name: 'Customer',                  color: '#F1C40F', perms: [] },
  { name: 'Beta Tester',               color: '#EC7063', perms: [] },
  { name: 'OG',                        color: '#48DBFB', perms: [] },
  { name: 'Verified',                  color: '#7FB3D5', perms: [] },
  { name: 'NPC',                       color: '#BDC3C7', perms: [] },
];

// Channel layout. Categories are created in this order; channels under each
// category are created in the order listed.
const CATEGORIES = [
  {
    name: 'bored',
    channels: [
      { name: 'bored',     type: ChannelType.GuildText },
      { name: 'bored.bot', type: ChannelType.GuildVoice },
    ],
  },
  {
    name: 'bored',
    channels: [
      { name: 'updates', type: ChannelType.GuildAnnouncement },
      { name: 'latency', type: ChannelType.GuildAnnouncement },
      { name: 'sudo',    type: ChannelType.GuildText },
    ],
  },
  {
    name: 'bored',
    channels: [
      { name: 'status',   type: ChannelType.GuildAnnouncement },
      { name: 'purchase', type: ChannelType.GuildAnnouncement },
    ],
  },
  {
    name: 'primary',
    channels: [
      { name: 'general',  type: ChannelType.GuildText },
      { name: 'commands', type: ChannelType.GuildText },
    ],
  },
  {
    name: 'cosmetic',
    channels: [
      { name: 'setup',   type: ChannelType.GuildMedia },
      { name: 'support', type: ChannelType.GuildForum },
    ],
  },
  {
    // Locked staff-only category. @everyone view is denied; staff/admin roles
    // are granted view + send via overwrites added after creation.
    name: 'internal',
    locked: true,
    channels: [
      { name: 'code',      type: ChannelType.GuildText },
      { name: 'interface', type: ChannelType.GuildText },
      { name: 'test',      type: ChannelType.GuildText },
    ],
  },
];

const STAFF_ROLE_NAMES = ['Administrator', 'Manager', 'Head Moderator', 'Senior Moderator', 'Moderator', 'Staff'];

async function disableCommunity(guild) {
  if (!guild.features.includes('COMMUNITY')) return { changed: false };
  await guild.edit({
    features: guild.features.filter((f) => f !== 'COMMUNITY'),
    rulesChannel: null,
    publicUpdatesChannel: null,
    reason: 'ownersetup: disabling community before wipe',
  });
  return { changed: true };
}

module.exports = {
  category: 'owner',
  help: [
    {
      name: 'ownersetup',
      description: '[Owner] Wipe the server (disable Community, delete every channel and every role below the bot) and create the standard role + channel layout.',
      aliases: 'n/a',
      parameters: 'n/a',
      information: 'Owner-only and DESTRUCTIVE. Disables Community, deletes ALL channels, deletes every role positioned below the bot (except @everyone and managed integration roles), then creates 34 roles (with colors + sensible permissions) and 6 categories of channels. The summary is DM\'d to you because the channel running the command is deleted.',
      usage: 'ownersetup',
      example: 'ownersetup',
    },
  ],

  name: 'ownersetup',
  aliases: [],

  run: async (client, message, args) => {
    if (!isOwner(message.author.id)) return;
    if (!message.guild) return;

    const guild = message.guild;
    const me = guild.members.me;
    if (!me.permissions.has(P.ManageRoles) || !me.permissions.has(P.ManageChannels) || !me.permissions.has(P.ManageGuild)) {
      return message.channel.send({ embeds: [
        new EmbedBuilder().setColor(color).setDescription(
          `${deny} ${message.author}: I need **Manage Roles**, **Manage Channels**, and **Manage Server** to run setup.`
        ),
      ] });
    }

    // Confirmation prompt
    const confirmEmbed = new EmbedBuilder()
      .setColor(color)
      .setTitle('Owner setup — DESTRUCTIVE confirm')
      .setDescription(
        `${warn} This will **wipe ${guild.name}**:\n` +
        `• Disable Community (if enabled)\n` +
        `• Delete **every** channel (including this one)\n` +
        `• Delete **every** role below my top role (except @everyone and managed roles)\n\n` +
        `Then it creates **${ROLES.length} roles** and **${CATEGORIES.length} categories** with their channels.\n\n` +
        `The result will be DM'd to you. **This cannot be undone.**`
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ownersetup_confirm').setLabel('Wipe + Setup').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('ownersetup_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
    );

    const prompt = await message.channel.send({ embeds: [confirmEmbed], components: [row] });

    let interaction;
    try {
      interaction = await prompt.awaitMessageComponent({
        filter: (i) => i.user.id === message.author.id,
        time: 30_000,
      });
    } catch {
      return prompt.edit({ components: [] }).catch(() => {});
    }

    if (interaction.customId === 'ownersetup_cancel') {
      return interaction.update({
        embeds: [new EmbedBuilder().setColor(color).setDescription(`${deny} Cancelled.`)],
        components: [],
      });
    }

    await interaction.update({
      embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} Wiping and setting up… results will be DM'd to you.`)],
      components: [],
    });

    const log = { communityDisabled: false, channelsDeleted: 0, rolesDeleted: 0, rolesCreated: [], channelsCreated: [], errors: [] };

    // ---------- 1. DISABLE COMMUNITY ----------
    try {
      const r = await disableCommunity(guild);
      log.communityDisabled = r.changed;
    } catch (e) {
      log.errors.push(`disable community: ${e.message}`);
    }

    // ---------- 2. DELETE ALL CHANNELS ----------
    const allChannels = [...guild.channels.cache.values()];
    for (const ch of allChannels) {
      try {
        await ch.delete('ownersetup wipe');
        log.channelsDeleted++;
      } catch (e) {
        log.errors.push(`delete #${ch.name}: ${e.message}`);
      }
    }

    // ---------- 3. DELETE ROLES BELOW BOT'S TOP ROLE ----------
    const myTop = me.roles.highest.position;
    const everyoneId = guild.roles.everyone.id;
    const rolesToDelete = [...guild.roles.cache.values()]
      .filter((r) => r.id !== everyoneId && !r.managed && r.position < myTop)
      .sort((a, b) => b.position - a.position); // delete top-down to avoid hierarchy issues
    for (const role of rolesToDelete) {
      try {
        await role.delete('ownersetup wipe');
        log.rolesDeleted++;
      } catch (e) {
        log.errors.push(`delete role \`${role.name}\`: ${e.message}`);
      }
    }

    // ---------- 4. CREATE ROLES ----------
    // Create from BOTTOM up so highest-priority entries end at the top.
    const createdRoleByName = new Map();
    for (let i = ROLES.length - 1; i >= 0; i--) {
      const def = ROLES[i];
      try {
        const role = await guild.roles.create({
          name: def.name,
          color: def.color,
          permissions: new PermissionsBitField(def.perms),
          reason: `ownersetup by ${message.author.tag}`,
        });
        createdRoleByName.set(def.name, role);
        log.rolesCreated.push(def.name);
      } catch (e) {
        log.errors.push(`create role \`${def.name}\`: ${e.message}`);
      }
    }

    // Force the exact hierarchy from the screenshot (Developer highest, NPC
    // lowest). @everyone is position 0; lowest custom role is 1, then up.
    try {
      const positions = ROLES
        .map((def, i) => {
          const role = createdRoleByName.get(def.name);
          if (!role) return null;
          return { role: role.id, position: ROLES.length - i };
        })
        .filter(Boolean);
      if (positions.length) await guild.roles.setPositions(positions);
    } catch (e) {
      log.errors.push(`reorder roles: ${e.message}`);
    }

    // ---------- 5. CREATE CHANNELS ----------
    for (const cat of CATEGORIES) {
      let category;
      try {
        const overwrites = [];
        if (cat.locked) {
          overwrites.push({ id: guild.roles.everyone.id, deny: [P.ViewChannel] });
          for (const name of STAFF_ROLE_NAMES) {
            const r = createdRoleByName.get(name);
            if (r) overwrites.push({ id: r.id, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory] });
          }
        }
        category = await guild.channels.create({
          name: cat.name,
          type: ChannelType.GuildCategory,
          permissionOverwrites: overwrites,
          reason: `ownersetup by ${message.author.tag}`,
        });
        log.channelsCreated.push(`📁 ${cat.name}`);
      } catch (e) {
        log.errors.push(`create category \`${cat.name}\`: ${e.message}`);
        continue;
      }

      for (const ch of cat.channels) {
        try {
          await guild.channels.create({
            name: ch.name,
            type: ch.type,
            parent: category.id,
            reason: `ownersetup by ${message.author.tag}`,
          });
          log.channelsCreated.push(`#${ch.name}`);
        } catch (e) {
          log.errors.push(`create channel \`${ch.name}\`: ${e.message}`);
        }
      }
    }

    // ---------- 6. DM SUMMARY ----------
    const summary = new EmbedBuilder()
      .setColor(color)
      .setTitle(`Owner setup — done in ${guild.name}`)
      .addFields(
        { name: 'Community disabled',   value: log.communityDisabled ? 'yes' : 'no (was already off)' },
        { name: 'Channels deleted',     value: String(log.channelsDeleted) },
        { name: 'Roles deleted',        value: String(log.rolesDeleted) },
        { name: `Roles created (${log.rolesCreated.length})`,    value: log.rolesCreated.length    ? log.rolesCreated.join(', ').slice(0, 1024)    : '*none*' },
        { name: `Channels created (${log.channelsCreated.length})`, value: log.channelsCreated.length ? log.channelsCreated.join(', ').slice(0, 1024) : '*none*' },
      );
    if (log.errors.length) {
      summary.addFields({ name: `Errors (${log.errors.length})`, value: log.errors.slice(0, 8).join('\n').slice(0, 1024) });
    }

    try {
      await message.author.send({ embeds: [summary] });
    } catch {
      // DMs closed — try posting in the first text channel we just made.
      const fallback = guild.channels.cache.find((c) => c.type === ChannelType.GuildText);
      if (fallback) await fallback.send({ content: `<@${message.author.id}>`, embeds: [summary] }).catch(() => {});
    }
  },
};
