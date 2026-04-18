const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { color } = require('../config.json');

async function paginate(message, pages, module) {
  let current = 0;

  function buildEmbed(i) {
    const p = pages[i];
    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL({ forceStatic: false }) || undefined })
      .setTitle(p.name)
      .setDescription(p.description ? `> ${p.description}` : null)
      .addFields(
        { name: 'Aliases', value: p.aliases || 'n/a', inline: false },
        { name: 'Parameters', value: p.parameters || 'n/a', inline: false },
        { name: 'Information', value: p.information || 'n/a', inline: false },
        { name: 'Usage', value: `\`\`\`\nSyntax: ${p.usage}\nExample: ${p.example || p.usage}\n\`\`\``, inline: false }
      )
      .setFooter({ text: `Page ${i + 1}/${pages.length} (${pages.length} entries) • Module: ${module}` });

    if (p.flags) embed.addFields({ name: 'Flags', value: p.flags, inline: false });
    return embed;
  }

  function buildRow(i, disabled = false) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('pag_prev')
        .setLabel('<')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled || i === 0),
      new ButtonBuilder()
        .setCustomId('pag_next')
        .setLabel('>')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled || i === pages.length - 1),
      new ButtonBuilder()
        .setCustomId('pag_page')
        .setLabel(`${i + 1}/${pages.length}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('pag_stop')
        .setLabel('x')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled)
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

    if (interaction.customId === 'pag_prev') current = current > 0 ? current - 1 : 0;
    if (interaction.customId === 'pag_next') current = current < pages.length - 1 ? current + 1 : pages.length - 1;

    msg.edit({ embeds: [buildEmbed(current)], components: [buildRow(current)] }).catch(() => {});
  });

  collector.on('end', () => {
    msg.edit({ components: [buildRow(current, true)] }).catch(() => {});
  });
}

module.exports = { paginate };
