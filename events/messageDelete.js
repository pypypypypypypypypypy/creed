const client = require('../bored');
const db = require('../db');
const { color } = require("../config.json");
const { EmbedBuilder, ChannelType } = require('discord.js');

const MAX_SNIPES = 10;

client.snipes = new Map();
client.editSnipes = new Map();
client.reactionSnipes = new Map();

function pushSnipe(map, channelId, entry) {
  const arr = map.get(channelId) || [];
  arr.unshift(entry);
  if (arr.length > MAX_SNIPES) arr.length = MAX_SNIPES;
  map.set(channelId, arr);
}

client.on('messageDelete', async function (message) {
  if (message.partial) return;
  if (message.channel.type !== ChannelType.GuildText) return;
  if (!message.author) return;

  pushSnipe(client.snipes, message.channel.id, {
    content: message.content || '',
    author: message.author.tag,
    authorId: message.author.id,
    authorAvatar: message.author.displayAvatarURL({ forceStatic: false }),
    image: message.attachments.first()?.proxyURL || null,
    timestamp: Date.now(),
  });

  const logs = db.get(`logschannel_${message.guild.id}`);
  if (!logs) return;
  if (message.author.bot) return;

  const embed = new EmbedBuilder()
    .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ forceStatic: false }) })
    .setTitle(`Deleted Message`)
    .setDescription(message.content || '*(no content)*')
    .setFooter({ text: `User ID: ${message.author.id}` })
    .setTimestamp()
    .setColor(color);

  if (message.attachments.first()) embed.setImage(message.attachments.first().proxyURL);

  const logChannel = client.channels.cache.get(logs);
  if (logChannel) logChannel.send({ embeds: [embed] }).catch(() => {});
});

client.on('messageUpdate', async function (oldMessage, newMessage) {
  if (oldMessage.partial || newMessage.partial) return;
  if (!oldMessage.author || oldMessage.author.bot) return;
  if (oldMessage.channel.type !== ChannelType.GuildText) return;
  if (oldMessage.content === newMessage.content) return;

  pushSnipe(client.editSnipes, oldMessage.channel.id, {
    before: oldMessage.content || '',
    after: newMessage.content || '',
    author: oldMessage.author.tag,
    authorId: oldMessage.author.id,
    authorAvatar: oldMessage.author.displayAvatarURL({ forceStatic: false }),
    messageUrl: newMessage.url,
    timestamp: Date.now(),
  });
});

client.on('messageReactionRemove', async function (reaction, user) {
  if (reaction.partial) { try { await reaction.fetch(); } catch { return; } }
  if (!reaction.message.guild) return;
  if (user.bot) return;

  pushSnipe(client.reactionSnipes, reaction.message.channelId, {
    emoji: reaction.emoji.toString(),
    author: user.tag,
    authorId: user.id,
    authorAvatar: user.displayAvatarURL({ forceStatic: false }),
    messageId: reaction.message.id,
    messageUrl: reaction.message.url,
    timestamp: Date.now(),
  });
});
