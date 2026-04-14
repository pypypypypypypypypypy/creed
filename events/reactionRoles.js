const client = require('../bleed');

if (!global.reactionRoles) global.reactionRoles = {};

client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) { try { await reaction.fetch(); } catch { return; } }
  if (!reaction.message.guild) return;

  const guildId = reaction.message.guild.id;
  const messageId = reaction.message.id;
  const emoji = reaction.emoji.id ? `<${reaction.emoji.animated ? 'a' : ''}:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;
  const key = `${guildId}:${messageId}:${emoji}`;
  const roleId = global.reactionRoles[key];
  if (!roleId) return;

  const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
  if (!member) return;
  await member.roles.add(roleId).catch(() => {});
});

client.on('messageReactionRemove', async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) { try { await reaction.fetch(); } catch { return; } }
  if (!reaction.message.guild) return;

  const guildId = reaction.message.guild.id;
  const messageId = reaction.message.id;
  const emoji = reaction.emoji.id ? `<${reaction.emoji.animated ? 'a' : ''}:${reaction.emoji.name}:${reaction.emoji.id}>` : reaction.emoji.name;
  const key = `${guildId}:${messageId}:${emoji}`;
  const roleId = global.reactionRoles[key];
  if (!roleId) return;

  const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
  if (!member) return;
  await member.roles.remove(roleId).catch(() => {});
});
