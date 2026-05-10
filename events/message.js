const client = require('../index');
const db = require('../db');
const { default_prefix, color } = require("../config.json");
const { EmbedBuilder } = require('discord.js');
const { handleGeneratedCommand } = require('../generatedCommands/handleMissingCommand');
const { buildErrorPayload } = require('../utils/errorEmbed');
function getEmojis() {
  delete require.cache[require.resolve('../emojis.json')];
  return require('../emojis.json');
}

client.on("messageCreate", async message => {
  if (message.partial) return;
  if (message.author.bot) return;

  // DM handler — all commands work in DMs except the moderation category
  if (!message.guild) {
    if (!message.content.startsWith(default_prefix)) return;
    const dmArgs = message.content.slice(default_prefix.length).trim().split(/ +/g);
    const dmCmd = dmArgs.shift()?.toLowerCase();
    if (!dmCmd) return;
    let dmCommand = client.commands.get(dmCmd);
    if (!dmCommand) dmCommand = client.commands.get(client.aliases.get(dmCmd));
    if (!dmCommand) return;
    if (dmCommand.category === 'moderation') return;
    try { await dmCommand.run(client, message, dmArgs); } catch {
      message.channel.send({ content: `\`${dmCmd}\` can't be used in DMs.` }).catch(() => {});
    }
    return;
  }

  if (!message.guild) return;

  // Bot owner blacklist enforcement — silently ignore blacklisted users / leave blacklisted guilds
  const userBlacklist = db.get('bot_blacklist') || [];
  if (userBlacklist.includes(message.author.id)) return;
  const guildBlacklist = db.get('bot_guild_blacklist') || [];
  if (guildBlacklist.includes(message.guild.id)) {
    message.guild.leave().catch(() => {});
    return;
  }

  global.__boredMsgCount = (global.__boredMsgCount || 0) + 1;
  if (!global.__boredUsers) global.__boredUsers = new Set();
  global.__boredUsers.add(message.author.id);

  // Sticky messages
  if (global.stickyMessages) {
    const key = `${message.guild.id}:${message.channel.id}`;
    const sticky = global.stickyMessages[key];
    if (sticky) {
      if (!global.stickyLastMsg) global.stickyLastMsg = {};
      if (global.stickyLastMsg[key]) {
        await global.stickyLastMsg[key].delete().catch(() => {});
      }
      const sent = await message.channel.send({ content: sticky.content }).catch(() => null);
      if (sent) global.stickyLastMsg[key] = sent;
    }
  }

  if (db.has(`afk-${message.author.id}+${message.guild.id}`)) {
    db.delete(`afk-${message.author.id}+${message.guild.id}`);
    return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`👋 ${message.author}: Welcome back, you're no longer **AFK**`)] });
  }

  const mentioned = message.mentions.members.first();
  if (mentioned && db.has(`afk-${mentioned.id}+${message.guild.id}`)) {
    const embed = new EmbedBuilder()
      .setColor('#FFFFFF')
      .setDescription(`💤 ${mentioned} is AFK: ` + db.get(`afk-${mentioned.id}+${message.guild.id}`));
    message.channel.send({ embeds: [embed] });
  }

  // Automod enforcement
  const automodEnabled = db.get(`automod.${message.guild.id}.enabled`) ?? false;
  if (automodEnabled && !message.member?.permissions.has('ManageMessages')) {
    const content = message.content;
    const guildId = message.guild.id;

    // Anti-link
    if (db.get(`automod.${guildId}.antilink`)) {
      const urlRegex = /https?:\/\/[^\s]+|www\.[^\s]+/i;
      if (urlRegex.test(content)) {
        await message.delete().catch(() => {});
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`🚫 ${message.author}: Links are not allowed in this server.`)] });
      }
    }

    // Anti-invite
    if (db.get(`automod.${guildId}.antiinvite`)) {
      const inviteRegex = /discord\.gg\/[^\s]+|discord\.com\/invite\/[^\s]+/i;
      if (inviteRegex.test(content)) {
        await message.delete().catch(() => {});
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`🚫 ${message.author}: Discord invites are not allowed in this server.`)] });
      }
    }

    // Anti-spam
    if (db.get(`automod.${guildId}.antispam`)) {
      if (!global.spamTracker) global.spamTracker = {};
      const key = `${guildId}:${message.author.id}`;
      const now = Date.now();
      if (!global.spamTracker[key]) global.spamTracker[key] = [];
      global.spamTracker[key] = global.spamTracker[key].filter(t => now - t < 5000);
      global.spamTracker[key].push(now);
      if (global.spamTracker[key].length >= 5) {
        global.spamTracker[key] = [];
        await message.delete().catch(() => {});
        await message.member?.timeout(10000, 'Anti-spam').catch(() => {});
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#FFFFFF').setDescription(`🚫 ${message.author}: Slow down! You have been timed out for spamming.`)] });
      }
    }
  }

  // Auto-reactions for specific channels
  const autoReactions = db.get(`reaction_messages_${message.guild.id}`) || {};
  if (autoReactions[message.channel.id]) {
    const emojis = autoReactions[message.channel.id];
    for (const emoji of emojis) {
      try {
        const customMatch = emoji.match(/^<a?:(\w+):(\d+)>$/);
        if (customMatch) {
          await message.react(customMatch[2]).catch(() => {});
        } else {
          await message.react(emoji).catch(() => {});
        }
      } catch {}
    }
  }

  // Reaction triggers — react to messages containing trigger words
  const reactionTriggers = db.get(`reaction_triggers_${message.guild.id}`) || [];
  if (reactionTriggers.length > 0) {
    const contentLower = message.content.toLowerCase();
    for (const { emoji, trigger } of reactionTriggers) {
      if (contentLower.includes(trigger)) {
        try {
          const customMatch = emoji.match(/^<a?:(\w+):(\d+)>$/);
          if (customMatch) {
            await message.react(customMatch[2]).catch(() => {});
          } else {
            await message.react(emoji).catch(() => {});
          }
        } catch {}
      }
    }
  }

  let prefix = db.get(`prefix_${message.guild.id}`);
  if (prefix === null) prefix = default_prefix;

  const args1 = message.content.trim().split(/ +/g);
  const isReply = !!message.reference?.messageId;
  const mentionRegex = new RegExp(`^<@!?${client.user.id}>$`);
  const isDirectBotMention = mentionRegex.test(message.content.trim());
  if (!isReply && isDirectBotMention && args1.length === 1 && message.mentions.users.has(client.user.id)) {
    const emojis = getEmojis();
    const prefixEmbed = new EmbedBuilder()
      .setColor(color)
      .setDescription(
        `${emojis.approve} ${message.author}: **${client.user.username}'s prefix** for this server is \`${prefix}\`\n` +
        `${emojis.replyline} Set a new prefix by using \`${prefix}prefix set\``
      );
    return message.channel.send({ embeds: [prefixEmbed] });
  }

  // Autoresponder
  const responders = db.get(`autoresponders_${message.guild.id}`) || [];
  if (responders.length) {
    const contentLower = message.content.toLowerCase();
    const match = responders.find(r => contentLower.includes(r.trigger));
    if (match) {
      const reply = match.response
        .replace(/{user}/g, message.author.toString())
        .replace(/{user\.tag}/g, message.author.tag)
        .replace(/{guild}/g, message.guild.name)
        .replace(/{membercount}/g, message.guild.memberCount);
      message.channel.send(reply).catch(() => {});
    }
  }

  if (!message.content.startsWith(prefix)) return;

  // ,live — owner streaming toggle
  {
    const { ActivityType } = require('discord.js');
    let isLive = global.__boredIsLive || false;
    const stripped = message.content.slice(prefix.length).trim().toLowerCase();
    if (stripped === 'live' && message.author.id === '1501779903811682375') {
      if (isLive) {
        global.__boredIsLive = false;
        await client.user.setPresence({ activities: [], status: 'online' });
        return message.channel.send('📴 Stream ended.');
      } else {
        global.__boredIsLive = true;
        await client.user.setPresence({
          status: 'online',
          activities: [{ name: 'Bored', type: ActivityType.Streaming, url: 'https://www.twitch.tv/discord' }],
        });
        return message.channel.send('🟣 Now streaming **Bored**.');
      }
    }
  }

  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  let cmd = args.shift().toLowerCase();
  if (cmd.length === 0) return;

  const cmdx = db.get(`cmd_${message.guild.id}`);
  if (cmdx) {
    const cmdy = cmdx.find(x => x.name === cmd);
    if (cmdy) return message.channel.send(cmdy.responce);
  }

  const customAliases = db.get(`custom_aliases_${message.guild.id}`) || {};
  if (customAliases[cmd]) {
    const expanded = customAliases[cmd].split(/ +/g).filter(Boolean);
    cmd = expanded.shift()?.toLowerCase() || cmd;
    args.unshift(...expanded, ...args.splice(0));
  }

  let command = client.commands.get(cmd);
  if (!command) command = client.commands.get(client.aliases.get(cmd));
  if (command) {
    // Check if command is disabled server-wide or per-channel
    const disabledGlobal = db.get(`disabled_${message.guild.id}_${command.name}`);
    const disabledChannel = db.get(`disabled_${message.guild.id}_${message.channel.id}_${command.name}`);
    if (disabledGlobal || disabledChannel) return;

    // Check if the command's module is disabled
    if (command.category) {
      const disabledModules = db.get(`disabled_modules_${message.guild.id}`) || [];
      if (disabledModules.includes(command.category)) return;
    }

    try {
      global.__boredCmdCount = (global.__boredCmdCount || 0) + 1;
      // Bot owner bypasses all user permission checks
      const { isOwner: __isOwner } = require('../utils/owners');
      if (__isOwner(message.author.id) && message.member) {
        const { PermissionsBitField: __PBF } = require('discord.js');
        // Wrap message.member in a plain prototype-chained object and assign
        // permissions as a simple own data property so every .has() returns true.
        // Simple assignment never fails — avoids defineProperty throwing on the
        // GuildMember instance and swallowing the command run entirely.
        const __patched = Object.create(message.member);
        __patched.permissions = new __PBF(__PBF.All);
        message.member = __patched;
      }
      await command.run(client, message, args);
    } catch (err) {
      const payload = buildErrorPayload(message, command.name || cmd, err);
      console.error(`Command error [${cmd}] (code ${payload.code}):`, err);
      message.channel.send({ content: payload.content, embeds: payload.embeds }).catch(() => {});
    }
  } else {
    await handleGeneratedCommand(client, message, cmd, args, prefix);
  }
});

// Previous reaction triggers — react to edited messages containing trigger words
client.on("messageUpdate", async (oldMessage, newMessage) => {
  if (!newMessage.guild || newMessage.author?.bot) return;
  if (newMessage.partial) {
    try { await newMessage.fetch(); } catch { return; }
  }

  const previousTriggers = db.get(`previousreact_triggers_${newMessage.guild.id}`) || [];
  if (!previousTriggers.length) return;

  const contentLower = newMessage.content?.toLowerCase() || '';
  for (const { emoji, trigger } of previousTriggers) {
    if (contentLower.includes(trigger)) {
      try {
        const customMatch = emoji.match(/^<a?:(\w+):(\d+)>$/);
        if (customMatch) {
          await newMessage.react(customMatch[2]).catch(() => {});
        } else {
          await newMessage.react(emoji).catch(() => {});
        }
      } catch {}
    }
  }
});

// NoSelfReact — remove self-reactions
client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot) return;
  if (reaction.partial) {
    try { await reaction.fetch(); } catch { return; }
  }
  if (!reaction.message.guild) return;
  if (reaction.message.partial) {
    try { await reaction.message.fetch(); } catch { return; }
  }

  const guildKey = `noselfreact_${reaction.message.guild.id}`;
  const cfg = db.get(guildKey);
  if (!cfg || !cfg.enabled) return;

  // Only block self-reactions (user reacting to their own message)
  if (reaction.message.author?.id !== user.id) return;

  // Check bypass for server owner
  if (cfg.bypass && reaction.message.guild.ownerId === user.id) return;

  // Check exempts
  if (cfg.exempts && cfg.exempts.includes(user.id)) return;
  if (cfg.exempts && cfg.exempts.includes(reaction.message.channel.id)) return;

  const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
  if (member && cfg.exempts) {
    for (const role of member.roles.cache.values()) {
      if (cfg.exempts.includes(role.id)) return;
    }
  }

  // Check emoji filter (if specific emojis are set, only block those)
  if (cfg.emojis && cfg.emojis.length > 0) {
    const reactionEmoji = reaction.emoji.id
      ? `<:${reaction.emoji.name}:${reaction.emoji.id}>`
      : reaction.emoji.name;
    if (!cfg.emojis.includes(reactionEmoji)) return;
  }

  // Remove the self-reaction
  await reaction.users.remove(user.id).catch(() => {});

  // Apply punishment
  const punishment = cfg.punishment || 'none';
  if (punishment === 'warn') {
    await user.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`You are not allowed to react to your own messages in **${reaction.message.guild.name}**.`)] }).catch(() => {});
  } else if (punishment === 'kick' && member) {
    await member.kick('NoSelfReact violation').catch(() => {});
  } else if (punishment === 'ban') {
    await reaction.message.guild.members.ban(user.id, { reason: 'NoSelfReact violation' }).catch(() => {});
  } else if (punishment === 'mute' && member) {
    const muteRole = reaction.message.guild.roles.cache.find(r => r.name.toLowerCase() === 'muted');
    if (muteRole) await member.roles.add(muteRole).catch(() => {});
  }
});
