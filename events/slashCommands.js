const client = require('../bored');
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');

// One real slash command — earns the "Supports Commands" badge once it has
// been used in at least one guild.
const commands = [
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription("Check the bot's websocket latency."),
];

client.on('clientReady', async () => {
  try {
    await client.application.commands.set(commands.map((c) => c.toJSON()));
    console.log(`Registered ${commands.length} global slash command(s).`);
  } catch (e) {
    console.log('Failed to register slash commands:', e.message);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    const ws = Math.round(client.ws.ping);
    const embed = new EmbedBuilder()
      .setColor(color)
      .setDescription(`🏓 Pong! \`${ws}ms\` websocket latency.`);
    try {
      await interaction.reply({ embeds: [embed] });
    } catch {}
  }
});
