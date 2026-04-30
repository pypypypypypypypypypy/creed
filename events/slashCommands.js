const client = require('../index');
const {
  SlashCommandBuilder,
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  EmbedBuilder,
  AttachmentBuilder,
  MessageFlags,
} = require('discord.js');
const { color } = require('../config.json');
const {
  generateQuoteImage,
  fetchAvatarBuffer,
  resolveDisplayName,
} = require('../utility/quote');

// One real slash command — earns the "Supports Commands" badge once it has
// been used in at least one guild.
const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription("Check the bot's websocket latency."),

  new SlashCommandBuilder()
    .setName('quote')
    .setDescription('Generate a stylized quote image.')
    .addStringOption((o) =>
      o.setName('text').setDescription('The quote text').setRequired(true).setMaxLength(500)
    )
    .addUserOption((o) =>
      o.setName('user').setDescription('Person being quoted (defaults to you)').setRequired(false)
    ),

  // Right-click message → Apps → Quote
  new ContextMenuCommandBuilder()
    .setName('Quote')
    .setType(ApplicationCommandType.Message),
];

client.on('clientReady', async () => {
  try {
    await client.application.commands.set(commands.map((c) => c.toJSON()));
    console.log(`Registered ${commands.length} global slash command(s).`);
  } catch (e) {
    console.log('Failed to register slash commands:', e.message);
  }
});

async function renderAndReply(interaction, targetUser, rawText) {
  let text = (rawText || '').trim();
  if (!text) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor('#efa23a').setDescription("That message has no text to quote.")],
      flags: MessageFlags.Ephemeral,
    }).catch(() => {});
  }
  if (text.length > 500) text = text.slice(0, 500) + '…';

  await interaction.deferReply().catch(() => {});

  try {
    const avatarBuffer = await fetchAvatarBuffer(targetUser);
    const displayName = await resolveDisplayName(interaction.guild, targetUser);
    const png = await generateQuoteImage({
      avatarBuffer,
      text,
      displayName,
      username: targetUser.username,
    });
    const file = new AttachmentBuilder(png, { name: 'quote.png' });
    await interaction.editReply({ files: [file] });
  } catch (e) {
    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`Failed to render quote — \`${(e && e.message) || 'unknown error'}\``)],
    }).catch(() => {});
  }
}

client.on('interactionCreate', async (interaction) => {
  // /ping
  if (interaction.isChatInputCommand() && interaction.commandName === 'ping') {
    const ws = Math.round(client.ws.ping);
    const embed = new EmbedBuilder().setColor(color).setDescription(`🏓 Pong! \`${ws}ms\` websocket latency.`);
    try { await interaction.reply({ embeds: [embed] }); } catch {}
    return;
  }

  // /quote
  if (interaction.isChatInputCommand() && interaction.commandName === 'quote') {
    const text = interaction.options.getString('text', true);
    const targetUser = interaction.options.getUser('user') || interaction.user;
    return renderAndReply(interaction, targetUser, text);
  }

  // Right-click "Quote" message context menu
  if (interaction.isMessageContextMenuCommand() && interaction.commandName === 'Quote') {
    const msg = interaction.targetMessage;
    let text = (msg.content || '').trim();
    if (!text && msg.embeds.length) {
      text = msg.embeds[0].description || msg.embeds[0].title || '';
    }
    return renderAndReply(interaction, msg.author, text);
  }
});
