const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const { isOwner } = require('../utils/owners');

module.exports = {
  name: "guilds",
  aliases: ["serverlist", "slt"],
  category: "owner",
  help: [
    {
      name: 'guilds',
      description: 'List all guilds the bot is in',
      aliases: 'serverlist, slt',
      parameters: 'n/a',
      information: 'BOT_OWNER',
      usage: 'guilds',
      example: 'guilds'
    }
  ],

  run: async (client, message, args) => {
    if (!isOwner(message.author.id)) return;

    const perPage = 10;
    let page = 0;

    const sorted = [...client.guilds.cache.values()].sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
    const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));

    function getDescription(pageIndex) {
      const start = pageIndex * perPage;
      const end = start + perPage;
      const lines = sorted.slice(start, end).map((g, i) =>
        `**${start + i + 1}** — ${g.name} | ${g.memberCount || 0} members\nID: \`${g.id}\``
      );
      return `Total Servers: **${sorted.length}**\n\n${lines.join('\n\n') || '*No guilds*'}`;
    }

    function buildEmbed(pageIndex) {
      return new EmbedBuilder()
        .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
        .setColor('#7fa5a8')
        .setFooter({ text: `Page ${pageIndex + 1}/${totalPages}` })
        .setDescription(getDescription(pageIndex));
    }

    function buildRow(pageIndex, disabled = false) {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('guilds_prev')
          .setLabel('◀')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disabled || pageIndex === 0),
        new ButtonBuilder()
          .setCustomId('guilds_stop')
          .setLabel('✕')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(disabled),
        new ButtonBuilder()
          .setCustomId('guilds_next')
          .setLabel('▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disabled || pageIndex >= totalPages - 1)
      );
    }

    let msg;
    try {
      msg = await message.channel.send({
        embeds: [buildEmbed(page)],
        components: totalPages > 1 ? [buildRow(page)] : [],
      });
    } catch (err) {
      console.error('guilds command failed to send:', err);
      return message.channel.send(`Failed to send guilds list: \`${err.message}\``).catch(() => {});
    }

    if (totalPages <= 1) return;

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === message.author.id,
      time: 5 * 60_000,
    });

    collector.on('collect', async interaction => {
      try { await interaction.deferUpdate(); } catch {}

      if (interaction.customId === 'guilds_stop') {
        collector.stop('user');
        return msg.delete().catch(() => {});
      }

      if (interaction.customId === 'guilds_prev') page = Math.max(0, page - 1);
      if (interaction.customId === 'guilds_next') page = Math.min(totalPages - 1, page + 1);

      msg.edit({ embeds: [buildEmbed(page)], components: [buildRow(page)] }).catch(() => {});
    });

    collector.on('end', () => {
      msg.edit({ components: [buildRow(page, true)] }).catch(() => {});
    });
  }
};
