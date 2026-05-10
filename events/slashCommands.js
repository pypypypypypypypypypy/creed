const client = require('../index');
const {
  SlashCommandBuilder,
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');
const { color } = require('../config.json');

const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription("Check the bot's websocket latency."),

  new SlashCommandBuilder()
    .setName('quote')
    .setDescription('Quote someone in a stylized embed.')
    .addStringOption((o) =>
      o.setName('text').setDescription('The quote text').setRequired(true).setMaxLength(500)
    )
    .addUserOption((o) =>
      o.setName('user').setDescription('Person being quoted (defaults to you)').setRequired(false)
    ),

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

async function sendQuoteEmbed(interaction, targetUser, rawText) {
  let text = (rawText || '').trim();
  if (!text) {
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor('#efa23a').setDescription('That message has no text to quote.')],
      flags: MessageFlags.Ephemeral,
    }).catch(() => {});
  }
  if (text.length > 500) text = text.slice(0, 500) + '…';

  const displayName = targetUser.globalName || targetUser.username;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({
      name: displayName,
      iconURL: targetUser.displayAvatarURL({ forceStatic: false }),
    })
    .setDescription(`>>> ${text}`)
    .setFooter({
      text: `@${targetUser.username}${interaction.user.id !== targetUser.id ? ` • quoted by ${interaction.user.tag}` : ''}`,
    })
    .setTimestamp();

  try {
    await interaction.reply({ embeds: [embed] });
  } catch {
    await interaction.editReply({ embeds: [embed] }).catch(() => {});
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
    return sendQuoteEmbed(interaction, targetUser, text);
  }

  // Right-click "Quote" message context menu
  if (interaction.isMessageContextMenuCommand() && interaction.commandName === 'Quote') {
    const msg = interaction.targetMessage;
    let text = (msg.content || '').trim();
    if (!text && msg.embeds.length) {
      text = msg.embeds[0].description || msg.embeds[0].title || '';
    }
    return sendQuoteEmbed(interaction, msg.author, text);
  }
});
