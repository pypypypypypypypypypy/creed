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

module.exports = {
  category: 'owner',
  help: [
    {
      name: 'ownersetup',
      description: '[Owner] Bulk-create the standard role + channel layout in the current server.',
      aliases: 'n/a',
      parameters: 'n/a',
      information: 'Owner-only. Creates 34 roles (with colors + sensible permissions) and 6 categories of channels. Skips anything already present, so it is safe to re-run.',
      usage: 'ownersetup',
      example: 'ownersetup',
    },
  ],

  name: 'ownersetup',
  aliases: [],

  run: async (client, message, args) => {
    if (!isOwner(message.author.id)) return;
    if (!message.guild) return;

    const me = message.guild.members.me;
    if (!me.permissions.has(P.ManageRoles) || !me.permissions.has(P.ManageChannels)) {
      return message.channel.send({ embeds: [
        new EmbedBuilder().setColor(color).setDescription(
          `${deny} ${message.author}: I need **Manage Roles** and **Manage Channels** to run setup.`
        ),
      ] });
    }

    // Confirmation prompt
    const confirmEmbed = new EmbedBuilder()
      .setColor(color)
      .setTitle('Owner setup — confirm')
      .setDescription(
        `${warn} This will create **${ROLES.length} roles** and **${CATEGORIES.length} categories** ` +
        `(plus their channels) in **${message.guild.name}**.\n\n` +
        `Existing roles/channels with the same name are **skipped** — safe to re-run.`
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ownersetup_confirm').setLabel('Confirm').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('ownersetup_cancel').setLabel('Cancel').setStyle(ButtonStyle.Danger),
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
      embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} Running setup… this can take a minute.`)],
      components: [],
    });

    const created = { roles: [], rolesSkipped: [], channels: [], channelsSkipped: [] };
    const errors = [];

    // ---------- ROLES ----------
    // Create from BOTTOM up so highest-priority entries end at the top.
    const createdRoleByName = new Map();
    for (let i = ROLES.length - 1; i >= 0; i--) {
      const def = ROLES[i];
      const existing = message.guild.roles.cache.find((r) => r.name === def.name);
      if (existing) {
        createdRoleByName.set(def.name, existing);
        created.rolesSkipped.push(def.name);
        continue;
      }
      try {
        const role = await message.guild.roles.create({
          name: def.name,
          color: def.color,
          permissions: new PermissionsBitField(def.perms),
          reason: `ownersetup by ${message.author.tag}`,
        });
        createdRoleByName.set(def.name, role);
        created.roles.push(def.name);
      } catch (e) {
        errors.push(`role \`${def.name}\`: ${e.message}`);
      }
    }

    // ---------- CHANNELS ----------
    for (const cat of CATEGORIES) {
      // Find an existing category with the same name that has no parent
      // (i.e. is itself a category) and is *not yet* one we just created.
      let category = message.guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name === cat.name && !created.channels.includes(`📁 ${cat.name}`)
      );

      if (!category) {
        try {
          const overwrites = [];
          if (cat.locked) {
            overwrites.push({
              id: message.guild.roles.everyone.id,
              deny: [P.ViewChannel],
            });
            for (const name of STAFF_ROLE_NAMES) {
              const r = createdRoleByName.get(name) || message.guild.roles.cache.find((x) => x.name === name);
              if (r) overwrites.push({ id: r.id, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory] });
            }
          }
          category = await message.guild.channels.create({
            name: cat.name,
            type: ChannelType.GuildCategory,
            permissionOverwrites: overwrites,
            reason: `ownersetup by ${message.author.tag}`,
          });
          created.channels.push(`📁 ${cat.name}`);
        } catch (e) {
          errors.push(`category \`${cat.name}\`: ${e.message}`);
          continue;
        }
      } else {
        created.channelsSkipped.push(`📁 ${cat.name}`);
      }

      for (const ch of cat.channels) {
        const dupe = message.guild.channels.cache.find(
          (c) => c.parentId === category.id && c.name === ch.name && c.type === ch.type
        );
        if (dupe) {
          created.channelsSkipped.push(`#${ch.name}`);
          continue;
        }
        try {
          await message.guild.channels.create({
            name: ch.name,
            type: ch.type,
            parent: category.id,
            reason: `ownersetup by ${message.author.tag}`,
          });
          created.channels.push(`#${ch.name}`);
        } catch (e) {
          errors.push(`channel \`${ch.name}\`: ${e.message}`);
        }
      }
    }

    // ---------- SUMMARY ----------
    const summary = new EmbedBuilder()
      .setColor(color)
      .setTitle('Owner setup — done')
      .addFields(
        { name: `Roles created (${created.roles.length})`,    value: created.roles.length    ? created.roles.join(', ').slice(0, 1024)    : '*none*' },
        { name: `Roles skipped (${created.rolesSkipped.length})`, value: created.rolesSkipped.length ? created.rolesSkipped.join(', ').slice(0, 1024) : '*none*' },
        { name: `Channels created (${created.channels.length})`, value: created.channels.length ? created.channels.join(', ').slice(0, 1024) : '*none*' },
        { name: `Channels skipped (${created.channelsSkipped.length})`, value: created.channelsSkipped.length ? created.channelsSkipped.join(', ').slice(0, 1024) : '*none*' },
      );
    if (errors.length) {
      summary.addFields({ name: `Errors (${errors.length})`, value: errors.slice(0, 8).join('\n').slice(0, 1024) });
    }

    return message.channel.send({ embeds: [summary] });
  },
};
