// Shared role + channel layout used by ,ownersetup and ,organizeroles.
// Order in ROLES is top-to-bottom hierarchy (Developer = highest).
const { PermissionFlagsBits, ChannelType } = require('discord.js');

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

const CATEGORIES = [
  { name: 'bored', channels: [
    { name: 'bored',     type: ChannelType.GuildText },
    { name: 'bored.bot', type: ChannelType.GuildVoice },
  ] },
  { name: 'bored', channels: [
    { name: 'updates', type: ChannelType.GuildAnnouncement },
    { name: 'latency', type: ChannelType.GuildAnnouncement },
    { name: 'sudo',    type: ChannelType.GuildText },
  ] },
  { name: 'bored', channels: [
    { name: 'status',   type: ChannelType.GuildAnnouncement },
    { name: 'purchase', type: ChannelType.GuildAnnouncement },
  ] },
  { name: 'primary', channels: [
    { name: 'general',  type: ChannelType.GuildText },
    { name: 'commands', type: ChannelType.GuildText },
  ] },
  { name: 'cosmetic', channels: [
    { name: 'setup',   type: ChannelType.GuildMedia },
    { name: 'support', type: ChannelType.GuildForum },
  ] },
  { name: 'internal', locked: true, channels: [
    { name: 'code',      type: ChannelType.GuildText },
    { name: 'interface', type: ChannelType.GuildText },
    { name: 'test',      type: ChannelType.GuildText },
  ] },
];

const STAFF_ROLE_NAMES = ['Administrator', 'Manager', 'Head Moderator', 'Senior Moderator', 'Moderator', 'Staff'];

module.exports = { ROLES, CATEGORIES, STAFF_ROLE_NAMES };
