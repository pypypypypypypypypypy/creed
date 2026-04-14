const client = require('../bleed');
const db = require('../db');
const { default_prefix, color, owner } = require("../config.json");
const { EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const generatedEntries = require('../generatedCommands/missingCommands.json');

function getTotalCommandCount() {
  const names = new Set();
  for (const cmd of client.commands.values()) {
    if (cmd.name) names.add(cmd.name.toLowerCase());
  }
  for (const entry of generatedEntries) {
    const root = (entry.parts?.[0] || entry.command || '').toLowerCase();
    if (root) names.add(root);
  }
  return names.size;
}

client.on("guildCreate", async guild => {
  // Send the welcome message
  let channelToSend;
  guild.channels.cache.forEach(channel => {
    if (
      channel.type === ChannelType.GuildText &&
      !channelToSend &&
      channel.permissionsFor(guild.members.me).has(PermissionFlagsBits.SendMessages)
    ) channelToSend = channel;
  });

  if (!channelToSend) return;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setThumbnail(client.user.displayAvatarURL({ size: 2048 }))
    .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
    .setTitle(`Thanks for adding ${client.user.username}!`)
    .setDescription(
      `**${client.user.username}** is a multipurpose Discord bot with **${getTotalCommandCount()} commands** across moderation, utility, fun, Last.fm, and more — built to keep your server organised and running smoothly.\n\n` +
      `**${client.user.username}'s default prefix is set to:** \`${default_prefix}\`\n` +
      `To change it, run \`${default_prefix}prefix set <prefix>\` and make sure the bot has the necessary permissions.`
    )
    .addFields(
      { name: 'Quick Start Guide', value:
        `\`${default_prefix}prefix set <prefix>\` — Change the command prefix for this server\n` +
        `\`${default_prefix}autorole set\` — Set a role to give all new members on join\n` +
        `\`${default_prefix}welcome channel\` — Set a channel for welcome messages\n` +
        `\`${default_prefix}modlogs channel\` — Set a channel to log moderation actions\n` +
        `\`${default_prefix}help\` — Browse all ${getTotalCommandCount()} commands`
      },
      { name: 'Invite', value: `[Add ${client.user.username} to another server](https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot)`, inline: true },
      { name: 'Help', value: `Run \`${default_prefix}help\` to view all commands`, inline: true }
    )
    .setFooter({ text: `${client.user.username} • Use ${default_prefix}help to get started` })
    .setTimestamp();

  channelToSend.send({ embeds: [embed] });
});
