const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'rolelist',
        description: 'List all roles in the server',
        aliases: 'roles',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'rolelist',
        example: 'rolelist'
    }
],

    name: 'rolelist',
  aliases: ['roles'],

  run: async (client, message, args) => {
    const roles = message.guild.roles.cache
      .filter(r => r.id !== message.guild.id)
      .sort((a, b) => b.position - a.position)
      .map((r, index) => r);

    const rolesArray = [...roles.values()];

    const chunkSize = 10;
    const pages = [];
    for (let i = 0; i < rolesArray.length; i += chunkSize) {
      const chunk = rolesArray.slice(i, i + chunkSize);
      const description = chunk
        .map((r, idx) => {
          const num = String(i + idx + 1).padStart(2, '0');
          return `${num} ${r.toString()} — ${r.id}`;
        })
        .join('\n');
      pages.push(description);
    }

    if (pages.length === 0) {
      const embed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
        .setTitle(`Roles in ${message.guild.name}`)
        .setDescription('No roles found.')
        .setTimestamp();
      return message.channel.send({ embeds: [embed] });
    }

    let currentPage = 0;

    const buildEmbed = (page) => {
      return new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL({ forceStatic: false }) })
        .setTitle(`Roles in ${message.guild.name}`)
        .setDescription(pages[page])
        .setFooter({ text: `Page ${page + 1}/${pages.length} (${rolesArray.length} roles)` })
        .setTimestamp();
    };

    const buildRow = () => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('rolelist_prev')
          .setLabel('<')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage === 0),
        new ButtonBuilder()
          .setCustomId('rolelist_next')
          .setLabel('>')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage === pages.length - 1),
        new ButtonBuilder()
          .setCustomId('rolelist_sort')
          .setEmoji('↕')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('rolelist_close')
          .setLabel('X')
          .setStyle(ButtonStyle.Danger)
      );
    };

    const msg = await message.channel.send({
      embeds: [buildEmbed(currentPage)],
      components: [buildRow()]
    });

    const collector = msg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 60000
    });

    let ascending = false;

    collector.on('collect', async (interaction) => {
      if (interaction.customId === 'rolelist_prev') {
        if (currentPage > 0) currentPage--;
      } else if (interaction.customId === 'rolelist_next') {
        if (currentPage < pages.length - 1) currentPage++;
      } else if (interaction.customId === 'rolelist_sort') {
        ascending = !ascending;
        const sorted = ascending
          ? [...rolesArray].sort((a, b) => a.position - b.position)
          : [...rolesArray].sort((a, b) => b.position - a.position);

        pages.length = 0;
        for (let i = 0; i < sorted.length; i += chunkSize) {
          const chunk = sorted.slice(i, i + chunkSize);
          const description = chunk
            .map((r, idx) => {
              const num = String(i + idx + 1).padStart(2, '0');
              return `${num} ${r.toString()} — ${r.id}`;
            })
            .join('\n');
          pages.push(description);
        }
        currentPage = 0;
      } else if (interaction.customId === 'rolelist_close') {
        collector.stop();
        return msg.delete().catch(() => {});
      }

      await interaction.update({
        embeds: [buildEmbed(currentPage)],
        components: [buildRow()]
      });
    });

    collector.on('end', (collected, reason) => {
      if (reason === 'time') {
        msg.edit({ components: [] }).catch(() => {});
      }
    });
  }
};
