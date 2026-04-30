const client = require('../index');
const {
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits
} = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const emojis = require('../emojis.json');
const { handleTicketInteraction, handleTicketModal } = require('../utility/ticket');

async function buyGetOrCreateCategory(guild, name, overwrites) {
  let category = guild.channels.cache.find(
    c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === name.toLowerCase()
  );
  if (!category) {
    category = await guild.channels.create({
      name,
      type: ChannelType.GuildCategory,
      permissionOverwrites: overwrites
    }).catch(() => null);
  }
  return category;
}

function errEmbed(text) {
  return new EmbedBuilder().setColor('#efa23a').setDescription(`${emojis.warn} ${text}`);
}

function okEmbed(text) {
  return new EmbedBuilder().setColor('#a3eb7b').setDescription(`${emojis.approve} ${text}`);
}

function getOwner(guildId, channelId) {
  return db.get(`vm_owner_${guildId}_${channelId}`);
}

function setOwner(guildId, channelId, userId) {
  db.set(`vm_owner_${guildId}_${channelId}`, userId);
}

function isVmChannel(guildId, channelId) {
  return db.get(`vm_owner_${guildId}_${channelId}`) !== null;
}

function isChannelOwner(guildId, channelId, userId) {
  return getOwner(guildId, channelId) === userId;
}

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit()) return;

  // Route ticket interactions
  const isTicketBtn = interaction.isButton() && (
    interaction.customId.startsWith('tix_') ||
    interaction.customId.startsWith('tpanel_') ||
    interaction.customId.startsWith('tpbehav_') ||
    interaction.customId.startsWith('topt_') ||
    interaction.customId.startsWith('tobehav_') ||
    interaction.customId.startsWith('toperm_') ||
    interaction.customId.startsWith('tomsg_') ||
    interaction.customId.startsWith('tresend_') ||
    interaction.customId.startsWith('tprofile_') ||
    interaction.customId.startsWith('tform_') ||
    interaction.customId.startsWith('ttrainee_')
  );
  const isTicketSelect = interaction.isStringSelectMenu() && (
    interaction.customId === 'topt_select' ||
    interaction.customId.startsWith('tix_dropdown_') ||
    interaction.customId.startsWith('tix_move_select_') ||
    interaction.customId.startsWith('tresend_select_')
  );
  const isTicketModal = interaction.isModalSubmit() && (
    interaction.customId.startsWith('tpdisplay_') ||
    interaction.customId.startsWith('tomodal_') ||
    interaction.customId.startsWith('tprofile_modal_') ||
    interaction.customId.startsWith('tform_fieldmodal_')
  );

  if (isTicketBtn || isTicketSelect) {
    return handleTicketInteraction(interaction, client).catch(console.error);
  }

  if (isTicketModal) {
    return handleTicketModal(interaction, interaction.guild.id).catch(console.error);
  }

  if (interaction.isModalSubmit()) return;
  if (interaction.isStringSelectMenu()) return;

  // Auto Setup button from guildCreate welcome message
  if (interaction.isButton() && interaction.customId === 'bored_auto_setup') {
    if (!interaction.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ embeds: [errEmbed(`${interaction.user}: Only administrators can run automatic setup.`)], ephemeral: true });
    }
    await interaction.reply({ embeds: [okEmbed(`${interaction.user}: Running automatic setup, please wait...`)], ephemeral: true });

    const sink = { messages: [] };
    const fakeChannel = {
      ...interaction.channel,
      send: async (opts) => {
        sink.messages.push(opts);
        return { id: 'fake', delete: async () => {}, edit: async () => {} };
      },
    };
    const fakeMessage = {
      author: interaction.user,
      member: interaction.member,
      guild: interaction.guild,
      channel: fakeChannel,
      mentions: { users: new Map(), roles: new Map(), channels: new Map(), members: new Map() },
      reply: async (opts) => { sink.messages.push(opts); return { id: 'fake' }; },
    };

    const steps = [
      { label: 'Base setup (jail + logs)', cmd: 'setup', args: [] },
      { label: 'VoiceMaster', cmd: 'voicemaster', args: ['setup'] },
      { label: 'Antinuke', cmd: 'antinuke', args: ['enable'] },
    ];

    const summary = [];
    for (const step of steps) {
      const cmd = client.commands.get(step.cmd);
      if (!cmd) { summary.push(`• ${step.label} — not available`); continue; }
      try {
        await cmd.run(client, fakeMessage, step.args);
        summary.push(`• ${step.label} — done`);
      } catch (e) {
        console.error(`auto_setup ${step.cmd} error:`, e);
        summary.push(`• ${step.label} — failed (${e.message})`);
      }
    }

    try {
      await interaction.followUp({ embeds: [okEmbed(`${interaction.user}: Automatic setup complete.\n${summary.join('\n')}`)], ephemeral: true });
    } catch {}
    return;
  }

  // Handle button roles
  if (interaction.isButton() && interaction.customId.startsWith('brole_')) {
    await interaction.deferReply({ ephemeral: true });
    const roleId = interaction.customId.replace('brole_', '');
    const member = interaction.member;
    if (!member) return interaction.editReply({ content: 'Could not find your member data.' });
    try {
      if (member.roles.cache.has(roleId)) {
        await member.roles.remove(roleId);
        return interaction.editReply({ content: `Removed role <@&${roleId}>.` });
      } else {
        await member.roles.add(roleId);
        return interaction.editReply({ content: `Added role <@&${roleId}>.` });
      }
    } catch (e) {
      return interaction.editReply({ content: `Failed to toggle role: ${e.message}` });
    }
  }

  if (interaction.customId === 'giveaway_enter') {
    await interaction.deferReply({ ephemeral: true });
    const messageId = interaction.message.id;
    const userId = interaction.user.id;
    const g = db.get(`giveaway_${messageId}`);

    if (!g) return interaction.editReply({ content: '❌ Giveaway not found.' });
    if (g.ended || g.cancelled || g.endTime < Date.now()) return interaction.editReply({ content: '❌ This giveaway has already ended.' });

    if (g.requiredRoles && g.requiredRoles.length) {
      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      const hasRole = g.requiredRoles.some(r => member?.roles.cache.has(r));
      if (!hasRole) return interaction.editReply({ content: `❌ You need one of these roles to enter: ${g.requiredRoles.map(r => `<@&${r}>`).join(', ')}` });
    }

    if (g.minAccountAgeDays) {
      const ageDays = (Date.now() - interaction.user.createdTimestamp) / 86400000;
      if (ageDays < g.minAccountAgeDays) return interaction.editReply({ content: `❌ Your account must be at least **${g.minAccountAgeDays} days** old to enter.` });
    }

    if (g.minServerStayDays) {
      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      if (member?.joinedTimestamp) {
        const stayDays = (Date.now() - member.joinedTimestamp) / 86400000;
        if (stayDays < g.minServerStayDays) return interaction.editReply({ content: `❌ You must have been in the server for at least **${g.minServerStayDays} days** to enter.` });
      }
    }

    const entries = g.entries || [];
    const idx = entries.indexOf(userId);
    if (idx !== -1) {
      entries.splice(idx, 1);
      g.entries = entries;
      db.set(`giveaway_${messageId}`, g);
      try { await interaction.message.edit({ components: [new (require('discord.js').ActionRowBuilder)().addComponents(new (require('discord.js').ButtonBuilder)().setCustomId('giveaway_enter').setLabel(`🎉 Enter (${entries.length})`).setStyle(require('discord.js').ButtonStyle.Primary))] }); } catch {}
      return interaction.editReply({ content: '👋 You have left the giveaway.' });
    } else {
      entries.push(userId);
      g.entries = entries;
      db.set(`giveaway_${messageId}`, g);
      try { await interaction.message.edit({ components: [new (require('discord.js').ActionRowBuilder)().addComponents(new (require('discord.js').ButtonBuilder)().setCustomId('giveaway_enter').setLabel(`🎉 Enter (${entries.length})`).setStyle(require('discord.js').ButtonStyle.Primary))] }); } catch {}
      return interaction.editReply({ content: '🎉 You have entered the giveaway! Good luck!' });
    }
  }

  const vmButtons = ['vm_lock', 'vm_unlock', 'vm_ghost', 'vm_reveal', 'vm_claim', 'vm_disconnect', 'vm_activity', 'vm_info', 'vm_increase', 'vm_decrease'];
  if (vmButtons.includes(interaction.customId)) {
    await interaction.deferReply({ ephemeral: true });

    const member = interaction.member;
    const guild = interaction.guild;
    const vc = member.voice.channel;

    if (!vc) {
      return interaction.editReply({ embeds: [errEmbed(`${interaction.user}: You must be in a **voice channel** to use these buttons`)] });
    }

    if (!isVmChannel(guild.id, vc.id)) {
      return interaction.editReply({ embeds: [errEmbed(`${interaction.user}: You must be in a **VoiceMaster** channel to use these buttons`)] });
    }

    const owned = isChannelOwner(guild.id, vc.id, interaction.user.id);

    if (interaction.customId === 'vm_claim') {
      const currentOwner = getOwner(guild.id, vc.id);
      if (currentOwner === interaction.user.id) {
        return interaction.editReply({ embeds: [errEmbed(`${interaction.user}: You already **own** this channel`)] });
      }
      const ownerInChannel = vc.members.has(currentOwner);
      if (ownerInChannel) {
        return interaction.editReply({ embeds: [errEmbed(`${interaction.user}: The channel owner is still **in the channel**`)] });
      }
      setOwner(guild.id, vc.id, interaction.user.id);
      return interaction.editReply({ embeds: [okEmbed(`${interaction.user}: You have **claimed** this voice channel`)] });
    }

    if (interaction.customId === 'vm_info') {
      const ownerId = getOwner(guild.id, vc.id);
      const owner = ownerId ? await guild.members.fetch(ownerId).catch(() => null) : null;
      const perms = vc.permissionOverwrites.cache.get(guild.id);
      const locked = perms?.deny.has(PermissionFlagsBits.Connect) || false;
      const hidden = perms?.deny.has(PermissionFlagsBits.ViewChannel) || false;

      const infoEmbed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${vc.name}`)
        .addFields(
          { name: 'Owner', value: owner ? `${owner}` : 'Unclaimed', inline: true },
          { name: 'Members', value: `${vc.members.size}${vc.userLimit ? `/${vc.userLimit}` : ''}`, inline: true },
          { name: 'Bitrate', value: `${vc.bitrate / 1000}kbps`, inline: true },
          { name: 'Region', value: vc.rtcRegion || 'Automatic', inline: true },
          { name: 'Locked', value: locked ? 'Yes' : 'No', inline: true },
          { name: 'Hidden', value: hidden ? 'Yes' : 'No', inline: true }
        );
      return interaction.editReply({ embeds: [infoEmbed] });
    }

    if (!owned) {
      return interaction.editReply({ embeds: [errEmbed(`${interaction.user}: You are not the **owner** of this channel`)] });
    }

    if (interaction.customId === 'vm_lock') {
      await vc.permissionOverwrites.edit(guild.id, { Connect: false }).catch(() => {});
      return interaction.editReply({ embeds: [okEmbed(`${interaction.user}: Your voice channel has been **locked**`)] });
    }

    if (interaction.customId === 'vm_unlock') {
      await vc.permissionOverwrites.edit(guild.id, { Connect: true }).catch(() => {});
      return interaction.editReply({ embeds: [okEmbed(`${interaction.user}: Your voice channel has been **unlocked**`)] });
    }

    if (interaction.customId === 'vm_ghost') {
      await vc.permissionOverwrites.edit(guild.id, { ViewChannel: false }).catch(() => {});
      return interaction.editReply({ embeds: [okEmbed(`${interaction.user}: Your voice channel has been **hidden**`)] });
    }

    if (interaction.customId === 'vm_reveal') {
      await vc.permissionOverwrites.edit(guild.id, { ViewChannel: true }).catch(() => {});
      return interaction.editReply({ embeds: [okEmbed(`${interaction.user}: Your voice channel has been **revealed**`)] });
    }

    if (interaction.customId === 'vm_disconnect') {
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${interaction.user}: To disconnect a member, use \`,voicemaster reject @user\``)] });
    }

    if (interaction.customId === 'vm_activity') {
      return interaction.editReply({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${interaction.user}: To start an activity, right-click your voice channel and select **Start Activity**`)] });
    }

    if (interaction.customId === 'vm_increase') {
      const newLimit = Math.min((vc.userLimit || 0) + 1, 99);
      await vc.setUserLimit(newLimit).catch(() => {});
      return interaction.editReply({ embeds: [okEmbed(`${interaction.user}: User limit increased to **${newLimit}**`)] });
    }

    if (interaction.customId === 'vm_decrease') {
      const newLimit = Math.max((vc.userLimit || 0) - 1, 0);
      await vc.setUserLimit(newLimit).catch(() => {});
      return interaction.editReply({ embeds: [okEmbed(`${interaction.user}: User limit ${newLimit === 0 ? 'set to **unlimited**' : `decreased to **${newLimit}**`}`)] });
    }
  }

  // ── BUY PANEL BUTTONS ────────────────────────────────────────────────────
  if (interaction.isButton() && ['buy_purchase', 'buy_transfer', 'buy_other'].includes(interaction.customId)) {
    await interaction.deferReply({ ephemeral: true });

    const user = interaction.user;
    const member = interaction.member;
    const guild = interaction.guild;
    if (!member || !guild) return;

    let type = 'Other';
    if (interaction.customId === 'buy_purchase') type = 'Purchase';
    else if (interaction.customId === 'buy_transfer') type = 'Transfer';

    const ticketName = `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

    const existing = guild.channels.cache.find(
      c => c.name === ticketName && c.type === ChannelType.GuildText
    );
    if (existing) {
      return interaction.editReply({ content: `You already have an open ticket: ${existing}` });
    }

    const overwrites = [
      { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
      { id: member.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
    ];

    guild.roles.cache
      .filter(r => r.permissions.has(PermissionFlagsBits.Administrator))
      .forEach(r => overwrites.push({
        id: r.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
      }));

    const category = await buyGetOrCreateCategory(guild, type, overwrites);

    const ticketChannel = await guild.channels.create({
      name: ticketName,
      type: ChannelType.GuildText,
      parent: category || undefined,
      permissionOverwrites: overwrites,
      topic: `Ticket for ${user.tag} — Type: ${type}`
    }).catch(() => null);

    if (!ticketChannel) return interaction.editReply({ content: 'Failed to create ticket channel.' });

    const ticketEmbed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ forceStatic: false }) })
      .setTitle(`${type} Ticket`)
      .setDescription(
        `Hey ${member}, thanks for opening a ticket!\n\n` +
        `**Type:** ${type}\n` +
        `Please describe what you need and someone will be with you shortly.\n\n` +
        `To close this ticket, have an admin delete this channel.`
      )
      .setTimestamp();

    ticketChannel.send({ content: `${member}` }).catch(() => {});
    ticketChannel.send({ embeds: [ticketEmbed] }).catch(() => {});

    return interaction.editReply({ content: `Your ticket has been created: ${ticketChannel}` });
  }
});
