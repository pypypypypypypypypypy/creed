const client = require('../bored');
const db = require('../db');
const { parseEmbed, buildBoostVars } = require('../utils/embedParser');

client.on("guildMemberUpdate", async (oldMember, newMember) => {
  const wasBoosting = !!oldMember.premiumSinceTimestamp;
  const isBoosting = !!newMember.premiumSinceTimestamp;

  if (!wasBoosting && isBoosting) {
    const channelId = db.get(`boost_channel_${newMember.guild.id}`);
    if (channelId) {
      const channel = newMember.guild.channels.cache.get(channelId);
      if (channel) {
        const msgTemplate = db.get(`boost_message_${newMember.guild.id}`) ||
          `Thank you {user} for boosting **{guild}**! We now have **{boostcount}** boosts!`;
        const vars = buildBoostVars(newMember);
        const payload = parseEmbed(msgTemplate, vars);
        if (payload && (payload.content || (payload.embeds && payload.embeds.length))) {
          channel.send(payload).catch(() => {});
        }
      }
    }
  }

  if (oldMember.nickname !== newMember.nickname || oldMember.user.username !== newMember.user.username) {
    const oldName = oldMember.nickname || oldMember.user.username;
    const newName = newMember.nickname || newMember.user.username;

    if (oldName !== newName) {
      const history = db.get(`namehistory_${newMember.id}`) || [];
      history.push({ name: oldName, timestamp: Date.now() });
      if (history.length > 50) history.splice(0, history.length - 50);
      db.set(`namehistory_${newMember.id}`, history);
    }
  }

  if (oldMember.nickname !== newMember.nickname) {
    const forcedNick = db.get(`forcenick_${newMember.guild.id}_${newMember.id}`);
    if (forcedNick && newMember.nickname !== forcedNick) {
      await newMember.setNickname(forcedNick, 'Forced nickname enforcement').catch(() => {});
    }
  }
});
