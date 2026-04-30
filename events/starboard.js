const client = require('../index');
const db = require('../db');
const { getConfig, postKey, buildBoardEmbed } = require('../starboard/boardHelper');

function emojiMatches(reactionEmoji, configEmoji) {
  // configEmoji can be unicode (⭐) or custom (<:name:id> or just name)
  const name = reactionEmoji.name;
  const id = reactionEmoji.id;
  if (id) {
    // custom emoji: match <:name:id> or just id
    return configEmoji.includes(id) || configEmoji === name;
  }
  // unicode
  return name === configEmoji || configEmoji === name;
}

function isIgnored(cfg, message, userId) {
  const ig = cfg.ignored || { channels: [], members: [], roles: [] };
  if (ig.channels.includes(message.channel.id)) return true;
  if (ig.members.includes(userId)) return true;
  // Check roles
  const member = message.guild.members.cache.get(userId);
  if (member && ig.roles.some(r => member.roles.cache.has(r))) return true;
  return false;
}

async function handleReaction(reaction, user, type) {
  if (user.bot) return;
  if (reaction.partial) { try { await reaction.fetch(); } catch { return; } }
  if (reaction.message.partial) { try { await reaction.message.fetch(); } catch { return; } }

  const message = reaction.message;
  if (!message.guild) return;

  const cfg = getConfig(type, message.guild.id);

  // Board not set up
  if (!cfg.channel) return;
  if (cfg.locked) return;

  // Emoji must match
  if (!emojiMatches(reaction.emoji, cfg.emoji)) return;

  // Don't process reactions in the board channel itself
  if (message.channel.id === cfg.channel) return;

  // Ignored check
  if (isIgnored(cfg, message, user.id)) return;

  // Self-star check
  if (!cfg.selfstar && user.id === message.author.id) return;

  // Fetch reaction count (excluding bots)
  const reactionObj = message.reactions.cache.find(r => emojiMatches(r.emoji, cfg.emoji));
  if (!reactionObj) return;
  await reactionObj.fetch();
  const reactors = await reactionObj.users.fetch();
  let count = reactors.filter(u => !u.bot).size;

  // If selfstar is off, don't count the author's own reaction
  if (!cfg.selfstar && reactors.has(message.author.id)) count--;

  const key = postKey(type, message.guild.id, message.id);
  const existing = db.get(key);

  if (count >= cfg.threshold) {
    const boardChannel = await client.channels.fetch(cfg.channel).catch(() => null);
    if (!boardChannel) return;

    const embed = await buildBoardEmbed(cfg, message, count, type);
    const label = `${cfg.emoji} **${count}** <#${message.channel.id}>`;

    if (existing && existing.boardMessageId) {
      // Update existing board post
      try {
        const boardMsg = await boardChannel.messages.fetch(existing.boardMessageId);
        await boardMsg.edit({ content: label, embeds: [embed] });
        db.set(key, { ...existing, count });
      } catch {
        // Board message deleted — re-create
        const sent = await boardChannel.send({ content: label, embeds: [embed] }).catch(() => null);
        if (sent) db.set(key, { boardMessageId: sent.id, count });
      }
    } else {
      // Create new board post
      const sent = await boardChannel.send({ content: label, embeds: [embed] }).catch(() => null);
      if (sent) db.set(key, { boardMessageId: sent.id, count });
    }
  } else if (existing && existing.boardMessageId && count < cfg.threshold) {
    // Count dropped below threshold — update embed only
    try {
      const boardChannel = await client.channels.fetch(cfg.channel).catch(() => null);
      if (!boardChannel) return;
      const boardMsg = await boardChannel.messages.fetch(existing.boardMessageId);
      const embed = await buildBoardEmbed(cfg, message, count, type);
      const label = `${cfg.emoji} **${count}** <#${message.channel.id}>`;
      await boardMsg.edit({ content: label, embeds: [embed] });
      db.set(key, { ...existing, count });
    } catch {}
  }
}

client.on('messageReactionAdd', async (reaction, user) => {
  await handleReaction(reaction, user, 'starboard');
  await handleReaction(reaction, user, 'clownboard');
});

client.on('messageReactionRemove', async (reaction, user) => {
  await handleReaction(reaction, user, 'starboard');
  await handleReaction(reaction, user, 'clownboard');
});
