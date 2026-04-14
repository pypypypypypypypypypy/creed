const client = require('../bleed');
const db = require('../db');

client.on('presenceUpdate', async (oldPresence, newPresence) => {
  if (!newPresence?.guild) return;
  const guildId = newPresence.guild.id;

  if (!db.get(`vanity_enabled_${guildId}`)) return;

  const vanityUrl = db.get(`vanity_url_${guildId}`);
  const roleId = db.get(`vanity_role_${guildId}`);
  if (!vanityUrl || !roleId) return;

  const member = newPresence.member || await newPresence.guild.members.fetch(newPresence.userId).catch(() => null);
  if (!member || member.user.bot) return;

  const role = newPresence.guild.roles.cache.get(roleId);
  if (!role) return;

  const activities = newPresence.activities || [];
  const hasVanity = activities.some(a =>
    a.state?.toLowerCase().includes(vanityUrl.toLowerCase()) ||
    a.name?.toLowerCase().includes(vanityUrl.toLowerCase())
  );

  const hasRole = member.roles.cache.has(roleId);

  if (hasVanity && !hasRole) {
    await member.roles.add(role).catch(() => {});
  } else if (!hasVanity && hasRole) {
    await member.roles.remove(role).catch(() => {});
  }
});
