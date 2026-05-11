const { REST, Routes } = require('discord.js');
const { readdirSync } = require('fs');
const path = require('path');

const SLASH_DIRS = [
  'fun', 'utility', 'info', 'information', 'roleplay'
];

module.exports = (client) => {
  client.slashCommands = new Map();

  // Collect every command file that exports slashData + runSlash
  for (const dir of SLASH_DIRS) {
    const dirPath = path.join(__dirname, `../${dir}`);
    let files;
    try { files = readdirSync(dirPath).filter(f => f.endsWith('.js')); }
    catch { continue; }

    for (const file of files) {
      try {
        const cmd = require(`../${dir}/${file}`);
        if (cmd && cmd.slashData && cmd.runSlash) {
          client.slashCommands.set(cmd.slashData.name, cmd);
        }
      } catch {}
    }
  }

  // Register slash commands globally once the bot is ready
  client.once('ready', async () => {
    const token = process.env.DISCORD_TOKEN || process.env.TOKEN;
    const rest = new REST({ version: '10' }).setToken(token);
    const body = [...client.slashCommands.values()].map(c => c.slashData);

    try {
      await rest.put(Routes.applicationCommands(client.user.id), { body });
      console.log(`[slash] registered ${body.length} global slash command(s)`);
    } catch (e) {
      console.error('[slash] registration failed:', e.message);
    }
  });

  // Route interactions to runSlash handlers
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const cmd = client.slashCommands.get(interaction.commandName);
    if (!cmd) return;
    try {
      await cmd.runSlash(client, interaction);
    } catch (e) {
      console.error(`[slash] error in /${interaction.commandName}:`, e.message);
      const payload = { content: 'Something went wrong.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  });

  console.log(`[boot][slash] loaded ${client.slashCommands.size} slash command(s)`);
};
