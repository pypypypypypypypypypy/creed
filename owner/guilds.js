const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const { isOwner } = require('../utils/owners');

module.exports = {
  category: 'owner',
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

    name: "guilds",
  aliases: ["serverlist", "slt"],
  category: "owner",

  run: async (client, message, args) => {
    if (!isOwner(message.author.id)) return;

    const perPage = 10;
    let page = 0;

    const totalPages = Math.ceil(client.guilds.cache.size / perPage);

    function getDescription(pageIndex) {
      const start = pageIndex * perPage;
      const end = start + perPage;
      return (
        `Total Servers - ${client.guilds.cache.size}\n\n` +
        client.guilds.cache
          .sort((a, b) => b.memberCount - a.memberCount)
          .map(r => r)
          .map((r, i) => `**${i + 1}** - ${r.name} | ${r.memberCount} Members\nID - ${r.id}`)
          .slice(start, end)
          .join("\n\n")
      );
    }

    function buildEmbed(pageIndex) {
      return new EmbedBuilder()
        .setAuthor({ name: client.user.tag, iconURL: client.user.displayAvatarURL({ forceStatic: false }) })
        .setColor("7fa5a8")
        .setFooter({ text: `Page ${pageIndex + 1}/${totalPages}` })
        .setDescription(getDescription(pageIndex));
    }

    function buildRow(pageIndex, disabled = false) {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('guilds_prev')
          .setEmoji({ name: 'left', id: '905600769376530443' })
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disabled || pageIndex === 0),
        new ButtonBuilder()
          .setCustomId('guilds_stop')
          .setEmoji({ name: 'x_square', id: '1440975468500357210' })
          .setStyle(ButtonStyle.Danger)
          .setDisabled(disabled),
        new ButtonBuilder()
          .setCustomId('guilds_next')
          .setEmoji({ name: 'right', id: '905600782437589032' })
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disabled || pageIndex === totalPages - 1)
      );
    }

    const msg = await message.channel.send({
      embeds: [buildEmbed(page)],
      components: [buildRow(page)],
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === message.author.id,
      time: 5 * 60_000,
    });

    collector.on('collect', async interaction => {
      await interaction.deferUpdate();

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
