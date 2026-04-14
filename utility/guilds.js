const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType } = require('discord.js')
const Discord = { MessageEmbed: EmbedBuilder };
const { color } = require('../config.json');

const ALLOWED_IDS = ['370268185410404353'];

const NAME_COL = 30;

function buildTable(rows) {
  const header = ` # ${'Name'.padEnd(NAME_COL)} Server ID`;
  const divider = `───┼${'─'.repeat(NAME_COL + 1)}┼────────────────────`;
  const lines = rows.map(({ i, g }) => {
    const num = String(i).padStart(2, ' ');
    const name = g.name.length > NAME_COL
      ? g.name.slice(0, NAME_COL - 3) + '...'
      : g.name.padEnd(NAME_COL, ' ');
    return `${num} │ ${name} │ ${g.id}`;
  });
  return `\`\`\`\n${header}\n${divider}\n${lines.join('\n')}\n\`\`\``;
}

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'guilds',
        description: 'List all guilds the bot is in',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'BOT_OWNER',
        usage: 'guilds',
        example: 'guilds'
    }
],

    name: 'guilds',
  category: 'utility',

  run: async (client, message, args) => {
    if (!ALLOWED_IDS.includes(message.author.id)) return;

    const guilds = [...client.guilds.cache.values()].sort((a, b) =>
      a.name.toLowerCase().localeCompare(b.name.toLowerCase())
    );

    const rows = guilds.map((g, idx) => ({ i: idx + 1, g }));

    const chunks = [];
    let current = [];
    for (const row of rows) {
      current.push(row);
      if (current.length === 2) {
        chunks.push(current);
        current = [];
      }
    }
    if (current.length) chunks.push(current);

    for (let i = 0; i < chunks.length; i++) {
      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(i === 0 ? `${client.user.username} — ${guilds.length} Guild${guilds.length !== 1 ? 's' : ''}` : `Guilds (continued)`)
        .setDescription(buildTable(chunks[i]));

      await message.channel.send({ embeds: [embed] });
    }
  }
};
