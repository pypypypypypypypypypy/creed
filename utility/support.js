const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, ChannelType, PermissionFlagsBits } = require('discord.js');
const { color } = require('../config.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'support',
        description: 'Get a link to the support server',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'support',
        example: 'support'
    }
],

    name: 'support',
  category: 'utility',

  run: async (client, message, args) => {
    const botName = client.user.username;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${botName} Support`)
      .setDescription(
        `If you are currently facing issues with ${botName}, or have billing problems, feel free to open a ticket depending on your issue. Remember that staff work voluntarily, always be respectful.\n\n` +
        `> Additionally, please **do not ping** any staff member.`
      )
      .setFooter({ text: 'Click the button below to create a ticket' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('support_ticket')
        .setLabel('📩 Create Ticket')
        .setStyle(ButtonStyle.Primary)
    );

    const msg = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.customId === 'support_ticket' && !i.user.bot,
      time: 10 * 60_000,
    });

    collector.on('collect', async interaction => {
      await interaction.deferReply({ ephemeral: true });

      const user = interaction.user;
      const member = interaction.member;
      if (!member) return;

      const ticketName = `support-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      const existing = message.guild.channels.cache.find(
        c => c.name === ticketName && c.type === ChannelType.GuildText
      );
      if (existing) {
        return interaction.editReply({ content: `You already have an open support ticket: ${existing}` });
      }

      const overwrites = [
        { id: message.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
        { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
      ];

      message.guild.roles.cache
        .filter(r => r.permissions.has(PermissionFlagsBits.Administrator))
        .forEach(r => overwrites.push({
          id: r.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        }));

      let category = message.guild.channels.cache.find(
        c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === 'support'
      );
      if (!category) {
        category = await message.guild.channels.create({
          name: 'Support',
          type: ChannelType.GuildCategory,
          permissionOverwrites: overwrites
        }).catch(() => null);
      }

      const ticketChannel = await message.guild.channels.create({
        name: ticketName,
        type: ChannelType.GuildText,
        parent: category || undefined,
        permissionOverwrites: overwrites,
        topic: `Support ticket for ${user.tag}`
      }).catch(() => null);

      if (!ticketChannel) return interaction.editReply({ content: 'Failed to create ticket channel.' });

      const ticketEmbed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ forceStatic: false }) })
        .setTitle(`${botName} Support Ticket`)
        .setDescription(
          `Hey ${member}, your support ticket has been created!\n\n` +
          `Please describe your issue in detail and a staff member will be with you shortly.\n\n` +
          `> Please **do not ping** any staff members — we will get to you as soon as possible.`
        )
        .setTimestamp();

      ticketChannel.send({ content: `${member}` }).catch(() => {});
      ticketChannel.send({ embeds: [ticketEmbed] });

      interaction.editReply({ content: `Your ticket has been created: ${ticketChannel}` });
    });
  }
};
