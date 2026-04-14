const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { color } = require('../config.json');

/**
 * Sends a paginated command info embed with buttons.
 * @param {import('discord.js').Message} message
 * @param {object[]} pages - Array of page objects: { name, description, aliases, parameters, information, usage, example }
 * @param {string} module - Module name shown in footer
 */
async function paginate(message, pages, module) {
  let current = 0;

  function buildEmbed(i) {
    const p = pages[i];
    return new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL({ forceStatic: false }) || undefined })
      .setTitle(p.name)
      .setDescription(`> ${p.description}`)
      .addFields(
        { name: 'Aliases', value: p.aliases || 'n/a', inline: false },
        { name: 'Parameters', value: p.parameters || 'n/a', inline: false },
        { name: 'Information', value: p.information || 'n/a', inline: false },
        { name: 'Usage', value: `\`\`\`\nSyntax: ${p.usage}\nExample: ${p.example || p.usage}\n\`\`\``, inline: false }
      )
      .setFooter({ text: `Page ${i + 1}/${pages.length} (${pages.length} entries) • Module: ${module}` });
  }

  function buildRow(i, disabled = false) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('pag_prev')
        .setLabel('<')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled || i === 0),
      new ButtonBuilder()
        .setCustomId('pag_stop')
        .setEmoji({ name: 'x_square', id: '1440975468500357210' })
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId('pag_next')
        .setLabel('>')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled || i === pages.length - 1)
    );
  }

  const components = pages.length === 1 ? [] : [buildRow(0)];
  const msg = await message.channel.send({ embeds: [buildEmbed(0)], components });

  if (pages.length === 1) return;

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: i => i.user.id === message.author.id,
    time: 2 * 60_000,
  });

  collector.on('collect', async interaction => {
    await interaction.deferUpdate();

    if (interaction.customId === 'pag_stop') {
      collector.stop('user');
      return msg.delete().catch(() => {});
    }

    if (interaction.customId === 'pag_prev') current = current > 0 ? current - 1 : pages.length - 1;
    if (interaction.customId === 'pag_next') current = current < pages.length - 1 ? current + 1 : 0;

    msg.edit({ embeds: [buildEmbed(current)], components: [buildRow(current)] }).catch(() => {});
  });

  collector.on('end', () => {
    msg.edit({ components: [buildRow(current, true)] }).catch(() => {});
  });
}

module.exports = { paginate };
