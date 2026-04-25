const client = require('../bleed');
const db = require('../db');
const { default_prefix, color } = require("../config.json");
const { EmbedBuilder, ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const DOCS_URL = 'https://bored.up.railway.app/docs';
const DISCORD_URL = 'https://discord.gg/VWXFBA5AZH';

client.on("guildCreate", async guild => {
  const guildBlacklist = db.get('bot_guild_blacklist') || [];
  if (guildBlacklist.includes(guild.id)) {
    return guild.leave().catch(() => {});
  }

  let channelToSend;
  guild.channels.cache.forEach(channel => {
    if (
      channel.type === ChannelType.GuildText &&
      !channelToSend &&
      channel.permissionsFor(guild.members.me).has(PermissionFlagsBits.SendMessages)
    ) channelToSend = channel;
  });

  if (!channelToSend) return;

  const name = client.user.username;
  const p = default_prefix;

  const description =
    `Thank you for adding **${name}** to **/${guild.name}**. ${name} is a multipurpose Discord bot with over **1,000** commands aimed at making your Discord experience seamless, hassle-free and fun. We are committed to resolving any issues that you face, instead of removing the bot, please [contact our support server to receive further help](${DISCORD_URL}).\n\n` +
    `**${name}'s default prefix is set to:** \`${p}\`, If you would like to change this prefix, simply run \`${p}prefix set (prefix)\` and **ensure** that the bot has the necessary permissions.`;

  const quickStart =
    `\`${p}setup\` — Creates a jail and log channel along with the jail role\n` +
    `\`${p}voicemaster setup\` — Creates join to create voice channels\n` +
    `\`${p}filter setup\` — Initializes a setup for automod to moderate\n` +
    `\`${p}antinuke setup\` — Creates the antinuke setup to keep your server safe`;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name, iconURL: client.user.displayAvatarURL() })
    .setDescription(description)
    .addFields({ name: 'Quick Start Guide:', value: quickStart });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('Documentation').setURL(DOCS_URL).setStyle(ButtonStyle.Link),
    new ButtonBuilder().setLabel('Discord Server').setURL(DISCORD_URL).setStyle(ButtonStyle.Link),
    new ButtonBuilder().setLabel('Automatic Setup').setCustomId('bored_auto_setup').setStyle(ButtonStyle.Primary),
  );

  channelToSend.send({ embeds: [embed], components: [row] }).catch(() => {});
});
