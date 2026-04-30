const { paginate } = require('../utils/paginate');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelType,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');

function getEmojis() {
  try { return require('../emojis.json'); } catch { return {}; }
}

function warnEmbed(msg) {
  const e = getEmojis();
  return new EmbedBuilder().setColor('#efa23a').setDescription(`${e.warn || '⚠️'} ${msg}`);
}
function okEmbed(msg) {
  const e = getEmojis();
  return new EmbedBuilder().setColor('#a3eb7b').setDescription(`${e.approve || '✅'} ${msg}`);
}
function infoEmbed(msg) {
  return new EmbedBuilder().setColor(color).setDescription(msg);
}

function isAdmin(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator);
}

function getPrefix(guildId) {
  const p = db.get(`prefix_${guildId}`);
  return p || default_prefix;
}

// DB helpers
function getPanels(guildId) { return db.get(`tix_panels_${guildId}`) || []; }
function savePanels(guildId, panels) { db.set(`tix_panels_${guildId}`, panels); }
function getOptions(guildId) { return db.get(`tix_options_${guildId}`) || []; }
function saveOptions(guildId, opts) { db.set(`tix_options_${guildId}`, opts); }
function getForms(guildId) { return db.get(`tix_forms_${guildId}`) || []; }
function saveForms(guildId, forms) { db.set(`tix_forms_${guildId}`, forms); }
function getTickets(guildId) { return db.get(`tix_tickets_${guildId}`) || {}; }
function saveTickets(guildId, tickets) { db.set(`tix_tickets_${guildId}`, tickets); }
function getBlacklist(guildId) { return db.get(`tix_blacklist_${guildId}`) || []; }
function saveBlacklist(guildId, bl) { db.set(`tix_blacklist_${guildId}`, bl); }
function getProfiles(guildId) { return db.get(`tix_profiles_${guildId}`) || {}; }
function saveProfiles(guildId, p) { db.set(`tix_profiles_${guildId}`, p); }
function getConfig(guildId) { return db.get(`tix_config_${guildId}`) || {}; }
function saveConfig(guildId, c) { db.set(`tix_config_${guildId}`, c); }

function getOption(guildId, optionId) {
  return getOptions(guildId).find(o => o.id === optionId) || null;
}

function getPanel(guildId, panelId) {
  return getPanels(guildId).find(p => p.id === panelId) || null;
}

function getTicket(guildId, channelId) {
  const tickets = getTickets(guildId);
  return tickets[channelId] || null;
}

function hasStaffAccess(member, guildId, optionId) {
  if (isAdmin(member)) return true;
  const cfg = getConfig(guildId);
  if (cfg.staffRoles && cfg.staffRoles.some(r => member.roles.cache.has(r))) return true;
  if (optionId) {
    const opt = getOption(guildId, optionId);
    if (opt) {
      if (opt.supportRoles && opt.supportRoles.some(r => member.roles.cache.has(r))) return true;
      if (opt.traineeRoles && opt.traineeRoles.some(r => member.roles.cache.has(r))) return true;
    }
  }
  return false;
}

function hasTicketAccess(member, ticket, guildId, strict) {
  if (!strict) strict = false;
  if (isAdmin(member)) return true;
  if (ticket.claimerId === member.id) return true;
  if (ticket.claimerId) return false;
  const cfg = getConfig(guildId);
  if (cfg.staffRoles && cfg.staffRoles.some(r => member.roles.cache.has(r))) return true;
  const opt = ticket.optionId ? getOption(guildId, ticket.optionId) : null;
  if (opt) {
    if (opt.supportRoles && opt.supportRoles.some(r => member.roles.cache.has(r))) return true;
    if (!strict && opt.traineeRoles && opt.traineeRoles.some(r => member.roles.cache.has(r))) return true;
  }
  return false;
}

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function caseNumber(guildId) {
  const n = (db.get(`tix_case_${guildId}`) || 0) + 1;
  db.set(`tix_case_${guildId}`, n);
  return n;
}

async function buildPanelMessage(guild, panel, options) {
  const embed = new EmbedBuilder()
    .setColor(panel.color || color)
    .setTitle(panel.title || `${guild.name} Support`)
    .setDescription(panel.description || 'Click below to open a ticket.');

  if (panel.imageUrl) embed.setImage(panel.imageUrl);
  if (panel.thumbnailUrl) embed.setThumbnail(panel.thumbnailUrl);

  const panelOptions = options.filter(o => o.panelId === panel.id && o.active !== false);

  if (panelOptions.length === 0) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tix_open_default_${panel.id}`)
        .setLabel('Open Ticket')
        .setEmoji('🎟️')
        .setStyle(ButtonStyle.Primary)
    );
    return { embeds: [embed], components: [row] };
  }

  if (panel.type === 'dropdown') {
    const select = new StringSelectMenuBuilder()
      .setCustomId(`tix_dropdown_${panel.id}`)
      .setPlaceholder(panel.placeholder || 'Select a ticket type...')
      .setMinValues(1)
      .setMaxValues(1);

    panelOptions.forEach(opt => {
      const option = new StringSelectMenuOptionBuilder()
        .setLabel(opt.label || 'Ticket')
        .setValue(opt.id);
      if (opt.description) option.setDescription(opt.description);
      if (opt.emoji) option.setEmoji(opt.emoji);
      select.addOptions(option);
    });

    return { embeds: [embed], components: [new ActionRowBuilder().addComponents(select)] };
  }

  // Button panel
  const rows = [];
  let currentRow = new ActionRowBuilder();
  let count = 0;
  for (const opt of panelOptions.slice(0, 25)) {
    if (count > 0 && count % 5 === 0) {
      rows.push(currentRow);
      currentRow = new ActionRowBuilder();
    }
    const btn = new ButtonBuilder()
      .setCustomId(`tix_open_${opt.id}`)
      .setLabel(opt.label || 'Ticket')
      .setStyle(opt.buttonStyle || ButtonStyle.Primary);
    if (opt.emoji) btn.setEmoji(opt.emoji);
    currentRow.addComponents(btn);
    count++;
  }
  if (count > 0) rows.push(currentRow);

  return { embeds: [embed], components: rows };
}

async function openTicket(interaction, guild, member, optionId) {
  const guildId = guild.id;
  const user = member.user;

  // Blacklist check
  const bl = getBlacklist(guildId);
  const memberRoles = member.roles.cache.map(r => r.id);
  if (bl.some(entry => entry === user.id || memberRoles.includes(entry))) {
    return interaction.reply({ content: '❌ You are blacklisted from opening tickets.', ephemeral: true });
  }

  const opt = optionId ? getOption(guildId, optionId) : null;
  const panel = opt ? getPanel(guildId, opt.panelId) : null;

  // Max open tickets check
  const tickets = getTickets(guildId);
  const userTickets = Object.values(tickets).filter(t => t.authorId === user.id && !t.closed);
  const maxOpen = (opt && opt.maxOpen) ? opt.maxOpen : ((panel && panel.maxOpen) ? panel.maxOpen : 1);
  if (userTickets.length >= maxOpen) {
    const existingChannel = guild.channels.cache.get(userTickets[0] && userTickets[0].channelId);
    return interaction.reply({
      content: `❌ You already have an open ticket${existingChannel ? `: ${existingChannel}` : '.'}`,
      ephemeral: true
    });
  }

  // Required roles check
  if (opt && opt.requiredRoles && opt.requiredRoles.length > 0) {
    const mode = opt.requiredRolesMode || 'any';
    const hasRequired = mode === 'all'
      ? opt.requiredRoles.every(r => member.roles.cache.has(r))
      : opt.requiredRoles.some(r => member.roles.cache.has(r));
    if (!hasRequired) {
      const roleMentions = opt.requiredRoles.map(r => `<@&${r}>`).join(', ');
      return interaction.reply({
        content: `❌ You need ${mode === 'all' ? 'all' : 'one'} of these roles: ${roleMentions}`,
        ephemeral: true
      });
    }
  }

  await interaction.deferReply({ ephemeral: true });

  const caseNum = caseNumber(guildId);
  const namingTemplate = (opt && opt.namingTemplate) ? opt.namingTemplate : 'ticket-{case}';
  let channelName = namingTemplate
    .replace('{name}', user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) || 'ticket')
    .replace('{case}', String(caseNum).padStart(4, '0'))
    .replace('{displayname}', ((member.displayName || user.username).toLowerCase().replace(/[^a-z0-9]/g, '') || 'ticket').slice(0, 20))
    .slice(0, 100);

  if (!channelName) channelName = `ticket-${caseNum}`;

  const overwrites = [
    { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: member.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    },
    {
      id: guild.client.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory]
    }
  ];

  const supportRoles = (opt && opt.supportRoles) ? opt.supportRoles : [];
  const cfg = getConfig(guildId);
  const staffRoles = cfg.staffRoles || [];
  [...supportRoles, ...staffRoles].forEach(roleId => {
    overwrites.push({
      id: roleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    });
  });

  let parentId = (opt && opt.openCategoryId) ? opt.openCategoryId : ((panel && panel.categoryId) ? panel.categoryId : null);
  if (!parentId) {
    let cat = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === 'tickets');
    if (!cat) {
      cat = await guild.channels.create({
        name: 'Tickets',
        type: ChannelType.GuildCategory,
        permissionOverwrites: [{ id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }]
      }).catch(() => null);
    }
    if (cat) parentId = cat.id;
  }

  const ticketChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: parentId || undefined,
    permissionOverwrites: overwrites,
    topic: `Ticket #${caseNum} | ${user.username} | Option: ${(opt && opt.label) ? opt.label : 'General'}`
  }).catch(() => null);

  if (!ticketChannel) {
    return interaction.editReply({ content: '❌ Failed to create your ticket. Make sure I have **Manage Channels** permission.' });
  }

  const ticketData = {
    id: generateId(),
    caseId: caseNum,
    channelId: ticketChannel.id,
    guildId,
    authorId: user.id,
    optionId: optionId || null,
    panelId: (panel && panel.id) ? panel.id : null,
    claimerId: null,
    closed: false,
    createdAt: Date.now(),
    reasons: {}
  };

  const allTickets = getTickets(guildId);
  allTickets[ticketChannel.id] = ticketData;
  saveTickets(guildId, allTickets);

  const greetingMsg = opt && opt.greetingMessage;
  const greetEmbed = new EmbedBuilder()
    .setColor((opt && opt.embedColor) ? opt.embedColor : color)
    .setTitle(greetingMsg ? undefined : `Ticket #${caseNum}`)
    .setDescription(
      greetingMsg
        ? resolveVars(greetingMsg, { ticket: ticketData, member, guild, opt })
        : `Hey ${member}, your ticket has been created!\n\nPlease describe your issue and a staff member will assist you shortly.\n\n> Do not ping staff members.`
    )
    .setTimestamp()
    .setFooter({ text: `Case #${String(caseNum).padStart(4, '0')}` });

  if (user.displayAvatarURL) greetEmbed.setThumbnail(user.displayAvatarURL({ forceStatic: false }));

  const controlRow = buildTicketControlRow(ticketData, opt);

  await ticketChannel.send({ content: `${member}`, embeds: [greetEmbed], components: controlRow ? [controlRow] : [] });

  await logTicketEvent(guild, guildId, opt, panel, 'open', ticketData, member);

  return interaction.editReply({ content: `✅ Your ticket has been created: ${ticketChannel}` });
}

function buildTicketControlRow(ticketData, opt) {
  const showClaim = !opt || opt.claimEnabled !== false;
  const claimBtnStyle = styleFromColor(opt && opt.claimButtonColor) || ButtonStyle.Secondary;
  const closeBtnStyle = styleFromColor(opt && opt.closeButtonColor) || ButtonStyle.Secondary;
  const deleteBtnStyle = styleFromColor(opt && opt.deleteButtonColor) || ButtonStyle.Danger;
  const reopenBtnStyle = styleFromColor(opt && opt.reopenButtonColor) || ButtonStyle.Success;

  const buttons = [];

  if (showClaim) {
    const claimBtn = new ButtonBuilder()
      .setCustomId(`tix_claim_${ticketData.channelId}`)
      .setLabel((opt && opt.claimButtonLabel) ? opt.claimButtonLabel : 'Claim')
      .setStyle(claimBtnStyle);
    const claimEmoji = opt && opt.claimButtonEmoji;
    if (claimEmoji !== 'none') claimBtn.setEmoji(claimEmoji || '📥');
    buttons.push(claimBtn);
  }

  const closeBtn = new ButtonBuilder()
    .setCustomId(`tix_close_${ticketData.channelId}`)
    .setLabel((opt && opt.closeButtonLabel) ? opt.closeButtonLabel : 'Close')
    .setStyle(closeBtnStyle);
  const closeEmoji = opt && opt.closeButtonEmoji;
  if (closeEmoji !== 'none') closeBtn.setEmoji(closeEmoji || '🔒');
  buttons.push(closeBtn);

  const delBtn = new ButtonBuilder()
    .setCustomId(`tix_delete_${ticketData.channelId}`)
    .setLabel((opt && opt.deleteButtonLabel) ? opt.deleteButtonLabel : 'Delete')
    .setStyle(deleteBtnStyle);
  const delEmoji = opt && opt.deleteButtonEmoji;
  if (delEmoji !== 'none') delBtn.setEmoji(delEmoji || '🚫');
  buttons.push(delBtn);

  const reopenBtn = new ButtonBuilder()
    .setCustomId(`tix_reopen_${ticketData.channelId}`)
    .setLabel((opt && opt.reopenButtonLabel) ? opt.reopenButtonLabel : 'Reopen')
    .setStyle(reopenBtnStyle);
  const reopenEmoji = opt && opt.reopenButtonEmoji;
  if (reopenEmoji !== 'none') reopenBtn.setEmoji(reopenEmoji || '🔓');
  buttons.push(reopenBtn);

  if (buttons.length === 0) return null;
  return new ActionRowBuilder().addComponents(buttons.slice(0, 5));
}

function styleFromColor(colorStr) {
  if (!colorStr) return null;
  const map = { blue: ButtonStyle.Primary, gray: ButtonStyle.Secondary, grey: ButtonStyle.Secondary, green: ButtonStyle.Success, red: ButtonStyle.Danger };
  return map[colorStr.toLowerCase()] || null;
}

function resolveVars(template, ctx) {
  if (!template) return '';
  const { ticket, member, guild, opt } = ctx;
  return template
    .replace(/\{ticket\.case\}/g, String(ticket.caseId).padStart(4, '0'))
    .replace(/\{ticket\.author\.mention\}/g, `<@${ticket.authorId}>`)
    .replace(/\{ticket\.author\.tag\}/g, (member && member.user && member.user.tag) ? member.user.tag : '')
    .replace(/\{ticket\.author\.name\}/g, (member && member.user && member.user.username) ? member.user.username : '')
    .replace(/\{ticket\.claimer\.mention\}/g, ticket.claimerId ? `<@${ticket.claimerId}>` : 'Unclaimed')
    .replace(/\{guild\.name\}/g, (guild && guild.name) ? guild.name : '')
    .replace(/\{option\.name\}/g, (opt && opt.label) ? opt.label : '');
}

async function logTicketEvent(guild, guildId, opt, panel, event, ticketData, actorMember) {
  const cfg = getConfig(guildId);
  const logChannelId = (opt && opt.logChannelId) || (panel && panel.logChannelId) || cfg.logChannelId;
  if (!logChannelId) return;
  const logChannel = guild.channels.cache.get(logChannelId);
  if (!logChannel) return;

  const eventColors = { open: '#57F287', close: '#ED4245', delete: '#ED4245', reopen: '#FEE75C', claim: '#5865F2' };
  const eventLabels = { open: 'Ticket Opened', close: 'Ticket Closed', delete: 'Ticket Deleted', reopen: 'Ticket Reopened', claim: 'Ticket Claimed' };

  const embed = new EmbedBuilder()
    .setColor(eventColors[event] || color)
    .setTitle(eventLabels[event] || event)
    .addFields(
      { name: 'Case', value: `#${String(ticketData.caseId).padStart(4, '0')}`, inline: true },
      { name: 'Author', value: `<@${ticketData.authorId}>`, inline: true },
      { name: 'Actor', value: actorMember ? `${actorMember}` : 'System', inline: true }
    )
    .setTimestamp();

  await logChannel.send({ embeds: [embed] }).catch(() => {});
}

async function handlePanelManagement(message, args, guildId) {
  const panels = getPanels(guildId);
  const panelName = args.slice(1).join(' ');

  if (!panelName) {
    if (panels.length === 0) {
      return message.channel.send({
        embeds: [infoEmbed(`No panels yet. Use \`${getPrefix(guildId)}tix panels <name>\` to create one.`)]
      });
    }
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`Ticket Panels — ${message.guild.name}`)
      .setDescription(panels.map((p, i) => `**${i + 1}.** ${p.name} \`${p.id}\``).join('\n'));
    return message.channel.send({ embeds: [embed] });
  }

  let panel = panels.find(p => p.name.toLowerCase() === panelName.toLowerCase());
  if (!panel) {
    panel = {
      id: generateId(),
      name: panelName,
      title: `${message.guild.name} Support`,
      description: 'Click below to open a ticket.',
      type: 'button',
      color: color,
      categoryId: null,
      logChannelId: null,
      channelId: null,
      maxOpen: 1,
      deleteDelay: '5s'
    };
    panels.push(panel);
    savePanels(guildId, panels);

    const opts = getOptions(guildId);
    opts.push({
      id: generateId(),
      panelId: panel.id,
      label: 'General Support',
      emoji: '🎟️',
      description: '',
      active: true,
      claimEnabled: true,
      maxOpen: 1,
      namingTemplate: 'ticket-{case}',
      supportRoles: [],
      traineeRoles: [],
      requiredRoles: [],
      buttonStyle: ButtonStyle.Primary,
      claimButtonColor: 'gray',
      closeButtonColor: 'gray',
      deleteButtonColor: 'red',
      reopenButtonColor: 'green',
      ticketCreatorCanClose: true,
      keepStaffVisibleOnClaim: false,
    });
    saveOptions(guildId, opts);

    await message.channel.send({ embeds: [okEmbed(`Created panel **${panelName}**. Configuring...`)] });
  }

  return showPanelMenu(message, panel, guildId);
}

async function showPanelMenu(message, panel, guildId) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`Panel: ${panel.name}`)
    .setDescription('Choose a section to configure:');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`tpanel_behavior_${panel.id}`).setLabel('Behavior').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`tpanel_categories_${panel.id}`).setLabel('Categories').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`tpanel_display_${panel.id}`).setLabel('Display').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`tpanel_messages_${panel.id}`).setLabel('Messages').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`tpanel_resend_${panel.id}`).setLabel('Resend').setStyle(ButtonStyle.Secondary)
  );

  return message.channel.send({ embeds: [embed], components: [row] });
}

async function handleOptionsManagement(message, args, guildId) {
  const opts = getOptions(guildId);
  const panels = getPanels(guildId);

  if (opts.length === 0) {
    return message.channel.send({ embeds: [warnEmbed(`No options yet. Create a panel first with \`${getPrefix(guildId)}tix panels\`.`)] });
  }

  const selectOptions = opts.slice(0, 25).map(o => {
    const panel = panels.find(p => p.id === o.panelId);
    return new StringSelectMenuOptionBuilder()
      .setLabel(o.label || 'Unnamed Option')
      .setValue(o.id)
      .setDescription(panel ? `Panel: ${panel.name}` : 'No panel');
  });

  const select = new StringSelectMenuBuilder()
    .setCustomId('topt_select')
    .setPlaceholder('Select an option to manage...')
    .addOptions(selectOptions);

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle('Ticket Options')
    .setDescription('Select an option to configure:');

  return message.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(select)] });
}

async function showOptionMenu(interaction, opt, guildId) {
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`Option: ${opt.label}`)
    .setDescription('Choose a section to configure:');

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`topt_behavior_${opt.id}`).setLabel('Behavior').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`topt_categories_${opt.id}`).setLabel('Categories').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`topt_naming_${opt.id}`).setLabel('Naming').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`topt_permissions_${opt.id}`).setLabel('Permissions').setStyle(ButtonStyle.Primary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`topt_buttonux_${opt.id}`).setLabel('Button UX').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`topt_messages_${opt.id}`).setLabel('Messages').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`topt_remove_${opt.id}`).setLabel('Remove').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`topt_back_${opt.id}`).setLabel('Back').setStyle(ButtonStyle.Secondary)
  );

  try {
    await interaction.update({ embeds: [embed], components: [row1, row2] });
  } catch {
    await interaction.reply({ embeds: [embed], components: [row1, row2] });
  }
}

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'ticket',
        description: 'Manage the ticket system',
        aliases: 'tickets, tix, tc',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'ticket',
        example: 'ticket'
    },
    {
        name: 'ticket setup',
        description: 'Set up the ticket system',
        aliases: 'n/a',
        parameters: '(channel)',
        information: 'MANAGE_GUILD',
        usage: 'ticket setup (channel)',
        example: 'ticket setup channel'
    },
    {
        name: 'ticket add',
        description: 'Add a user to a ticket',
        aliases: 'n/a',
        parameters: '(user)',
        information: 'MANAGE_GUILD',
        usage: 'ticket add (user)',
        example: 'ticket add user'
    },
    {
        name: 'ticket remove',
        description: 'Remove a user from a ticket',
        aliases: 'n/a',
        parameters: '(user)',
        information: 'MANAGE_GUILD',
        usage: 'ticket remove (user)',
        example: 'ticket remove user'
    },
    {
        name: 'ticket close',
        description: 'Close the current ticket',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'ticket close',
        example: 'ticket close'
    },
    {
        name: 'ticket reset',
        description: 'Reset the ticket system',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'ticket reset',
        example: 'ticket reset'
    }
],

    name: 'ticket',
  aliases: ['tickets', 'tix', 'tc'],

  run: async (client, message, args) => {
    const guildId = message.guild.id;
    const member = message.member;
    const prefix = getPrefix(guildId);

    if (!args[0]) {
      return paginate(message, [
        {
          name: 'ticket',
          description: 'Manage the ticket system — create panels, options, forms, and handle ticket actions',
          aliases: 'tickets, tix, tc',
          parameters: 'n/a',
          information: 'n/a',
          usage: `${prefix}tix`,
          example: `${prefix}tix`,
        },
        {
          name: 'ticket panels',
          description: 'Create and manage ticket panels — give a name to view/edit it',
          aliases: 'panel, p',
          parameters: '(name)',
          information: 'ADMINISTRATOR',
          usage: `${prefix}tix panels (name)`,
          example: `${prefix}tix panels support`,
        },
        {
          name: 'ticket options',
          description: 'Manage dropdown options for a ticket panel',
          aliases: 'option, o',
          parameters: 'n/a',
          information: 'ADMINISTRATOR',
          usage: `${prefix}tix options`,
          example: `${prefix}tix options`,
        },
        {
          name: 'ticket forms',
          description: 'Create and manage reusable modal forms for tickets',
          aliases: 'form, f',
          parameters: '(name)',
          information: 'ADMINISTRATOR',
          usage: `${prefix}tix forms (name)`,
          example: `${prefix}tix forms general`,
        },
        {
          name: 'ticket resend',
          description: 'Resend an existing panel message to a channel',
          aliases: 'n/a',
          parameters: '(#channel)',
          information: 'ADMINISTRATOR',
          usage: `${prefix}tix resend (#channel)`,
          example: `${prefix}tix resend #support`,
        },
        {
          name: 'ticket blacklist',
          description: 'Prevent a user or role from opening tickets',
          aliases: 'n/a',
          parameters: '(@user|@role)',
          information: 'ADMINISTRATOR',
          usage: `${prefix}tix blacklist (@user|@role)`,
          example: `${prefix}tix blacklist @user`,
        },
        {
          name: 'ticket profiles',
          description: 'Manage staff ticket claim profiles (admin)',
          aliases: 'n/a',
          parameters: 'n/a',
          information: 'ADMINISTRATOR',
          usage: `${prefix}tix profiles`,
          example: `${prefix}tix profiles`,
        },
        {
          name: 'ticket profile',
          description: 'View and edit your personal ticket claim profile',
          aliases: 'n/a',
          parameters: 'n/a',
          information: 'n/a',
          usage: `${prefix}tix profile`,
          example: `${prefix}tix profile`,
        },
        {
          name: 'ticket stats',
          description: 'Show ticket statistics for yourself or a target user',
          aliases: 'n/a',
          parameters: '(target)',
          information: 'Staff',
          usage: `${prefix}tix stats (target)`,
          example: `${prefix}tix stats @user`,
        },
        {
          name: 'ticket list',
          description: 'List all currently open tickets in the server',
          aliases: 'n/a',
          parameters: 'n/a',
          information: 'Staff',
          usage: `${prefix}tix list`,
          example: `${prefix}tix list`,
        },
        {
          name: 'ticket claim',
          description: 'Claim a ticket and assign it to yourself',
          aliases: 'n/a',
          parameters: '(#channel) (reason)',
          information: 'Staff',
          usage: `${prefix}tix claim (#channel) (reason)`,
          example: `${prefix}tix claim #ticket-0001 helping now`,
        },
        {
          name: 'ticket close',
          description: 'Close an open ticket channel',
          aliases: 'n/a',
          parameters: '(#channel) (reason)',
          information: 'Staff',
          usage: `${prefix}tix close (#channel) (reason)`,
          example: `${prefix}tix close #ticket-0001 resolved`,
        },
        {
          name: 'ticket delete',
          description: 'Permanently delete a ticket channel',
          aliases: 'n/a',
          parameters: '(#channel) (reason)',
          information: 'Staff',
          usage: `${prefix}tix delete (#channel) (reason)`,
          example: `${prefix}tix delete #ticket-0001`,
        },
        {
          name: 'ticket reopen',
          description: 'Reopen a previously closed ticket',
          aliases: 'n/a',
          parameters: '(#channel) (reason)',
          information: 'Staff',
          usage: `${prefix}tix reopen (#channel) (reason)`,
          example: `${prefix}tix reopen #ticket-0001`,
        },
        {
          name: 'ticket allow',
          description: 'Allow a user or role to view the current ticket',
          aliases: 'n/a',
          parameters: '(@user|@role)',
          information: 'Staff',
          usage: `${prefix}tix allow (@user|@role)`,
          example: `${prefix}tix allow @user`,
        },
        {
          name: 'ticket deny',
          description: 'Remove a user or role from the current ticket',
          aliases: 'n/a',
          parameters: '(@user|@role)',
          information: 'Staff',
          usage: `${prefix}tix deny (@user|@role)`,
          example: `${prefix}tix deny @user`,
        },
        {
          name: 'ticket rename',
          description: 'Rename the current ticket channel',
          aliases: 'n/a',
          parameters: '(new-name)',
          information: 'Staff',
          usage: `${prefix}tix rename (new-name)`,
          example: `${prefix}tix rename billing-issue`,
        },
        {
          name: 'ticket transcript',
          description: 'Generate a text transcript for a ticket channel or case',
          aliases: 'n/a',
          parameters: '(#channel|case)',
          information: 'Staff',
          usage: `${prefix}tix transcript (#channel|case)`,
          example: `${prefix}tix transcript #ticket-0001`,
        },
        {
          name: 'ticket move',
          description: 'Move a ticket to a different panel option',
          aliases: 'n/a',
          parameters: '(#channel) (reason)',
          information: 'Staff',
          usage: `${prefix}tix move (#channel) (reason)`,
          example: `${prefix}tix move #ticket-0001 wrong category`,
        },
        {
          name: 'ticket unclaim',
          description: 'Remove the claimer from a ticket',
          aliases: 'n/a',
          parameters: '(#channel)',
          information: 'Staff',
          usage: `${prefix}tix unclaim (#channel)`,
          example: `${prefix}tix unclaim #ticket-0001`,
        },
        {
          name: 'ticket trainee',
          description: 'Grant or revoke trainee permissions for a user',
          aliases: 'n/a',
          parameters: '(grant|revoke|list) (@target)',
          information: 'Staff',
          usage: `${prefix}tix trainee (grant|revoke|list) (@target)`,
          example: `${prefix}tix trainee grant @user`,
        },
        {
          name: 'ticket reason',
          description: 'Update the reason for a ticket action',
          aliases: 'n/a',
          parameters: '(claim|close|reopen|delete) (reason)',
          information: 'Staff',
          usage: `${prefix}tix reason (claim|close|reopen|delete) (reason)`,
          example: `${prefix}tix reason close user resolved`,
        },
      ], 'utility');
    }

    const sub = args[0].toLowerCase();

    if (sub === 'panels' || sub === 'panel' || sub === 'p') {
      if (!isAdmin(member)) return message.channel.send({ embeds: [warnEmbed(`${message.author}: You need **Administrator** to manage panels.`)] });
      return handlePanelManagement(message, args, guildId);
    }

    if (sub === 'options' || sub === 'option' || sub === 'o') {
      if (!isAdmin(member)) return message.channel.send({ embeds: [warnEmbed(`${message.author}: You need **Administrator** to manage options.`)] });
      return handleOptionsManagement(message, args, guildId);
    }

    if (sub === 'forms' || sub === 'form' || sub === 'f') {
      if (!isAdmin(member)) return message.channel.send({ embeds: [warnEmbed(`${message.author}: You need **Administrator** to manage forms.`)] });
      return handleFormsManagement(message, args, guildId);
    }

    if (sub === 'resend') {
      if (!isAdmin(member)) return message.channel.send({ embeds: [warnEmbed(`${message.author}: You need **Administrator** to resend panels.`)] });
      return handleResend(message, args, guildId);
    }

    if (sub === 'blacklist') {
      if (!isAdmin(member)) return message.channel.send({ embeds: [warnEmbed(`${message.author}: You need **Administrator** to manage the blacklist.`)] });
      return handleBlacklist(message, args, guildId);
    }

    if (sub === 'list') {
      if (!hasStaffAccess(member, guildId, null)) return message.channel.send({ embeds: [warnEmbed(`${message.author}: You don't have permission to list tickets.`)] });
      return handleList(message, guildId);
    }

    if (sub === 'stats') {
      if (!hasStaffAccess(member, guildId, null)) return message.channel.send({ embeds: [warnEmbed(`${message.author}: You don't have permission to view stats.`)] });
      return handleStats(message, args, guildId);
    }

    if (sub === 'profile') {
      return handleProfile(message, guildId, member, false);
    }

    if (sub === 'profiles') {
      if (!isAdmin(member)) return message.channel.send({ embeds: [warnEmbed(`${message.author}: You need **Administrator** to manage profiles.`)] });
      return handleProfile(message, guildId, member, true);
    }

    if (sub === 'claim') {
      const ch = resolveChannel(message, args[1]) || message.channel;
      const hasChArg = !!resolveChannel(message, args[1]);
      const reason = args.slice(hasChArg ? 2 : 1).join(' ');
      return handleClaim(message, ch, reason, guildId, member);
    }

    if (sub === 'close') {
      const ch = resolveChannel(message, args[1]) || message.channel;
      const hasChArg = !!resolveChannel(message, args[1]);
      const reason = args.slice(hasChArg ? 2 : 1).join(' ');
      return handleClose(message, ch, reason, guildId, member, client);
    }

    if (sub === 'delete') {
      const ch = resolveChannel(message, args[1]) || message.channel;
      const hasChArg = !!resolveChannel(message, args[1]);
      const reason = args.slice(hasChArg ? 2 : 1).join(' ');
      return handleDelete(message, ch, reason, guildId, member, client);
    }

    if (sub === 'reopen') {
      const ch = resolveChannel(message, args[1]) || message.channel;
      const hasChArg = !!resolveChannel(message, args[1]);
      const reason = args.slice(hasChArg ? 2 : 1).join(' ');
      return handleReopen(message, ch, reason, guildId, member, client);
    }

    if (sub === 'allow') {
      if (args[1] === 'list') return handleAllowList(message, guildId, member);
      return handleAllow(message, args, guildId, member);
    }

    if (sub === 'deny') {
      return handleDeny(message, args, guildId, member);
    }

    if (sub === 'rename') {
      return handleRename(message, args, guildId, member);
    }

    if (sub === 'transcript') {
      const ch = resolveChannel(message, args[1]) || message.channel;
      return handleTranscript(message, ch, guildId, member);
    }

    if (sub === 'move') {
      const ch = resolveChannel(message, args[1]) || message.channel;
      const hasChArg = !!resolveChannel(message, args[1]);
      const reason = args.slice(hasChArg ? 2 : 1).join(' ');
      return handleMove(message, ch, reason, guildId, member);
    }

    if (sub === 'unclaim') {
      const ch = resolveChannel(message, args[1]) || message.channel;
      return handleUnclaim(message, ch, guildId, member);
    }

    if (sub === 'trainee') {
      return handleTrainee(message, args, guildId, member);
    }

    if (sub === 'reason') {
      return handleReason(message, args, guildId, member);
    }

    return message.channel.send({ embeds: [warnEmbed(`${message.author}: Unknown subcommand. Use \`${prefix}tix\` to see all commands.`)] });
  }
};

function resolveChannel(message, arg) {
  if (!arg) return null;
  const match = arg.match(/^<#(\d+)>$/) || arg.match(/^(\d{17,19})$/);
  if (match) return message.guild.channels.cache.get(match[1]) || null;
  return null;
}

async function handleClaim(message, channel, reason, guildId, member) {
  const ticket = getTicket(guildId, channel.id);
  if (!ticket) return message.channel.send({ embeds: [warnEmbed(`${message.author}: That channel is not a ticket.`)] });
  if (ticket.closed) return message.channel.send({ embeds: [warnEmbed(`${message.author}: That ticket is closed.`)] });
  if (ticket.claimerId) return message.channel.send({ embeds: [warnEmbed(`${message.author}: That ticket is already claimed by <@${ticket.claimerId}>.`)] });
  if (ticket.authorId === member.id) return message.channel.send({ embeds: [warnEmbed(`${message.author}: You cannot claim your own ticket.`)] });
  if (!hasStaffAccess(member, guildId, ticket.optionId)) return message.channel.send({ embeds: [warnEmbed(`${message.author}: You don't have permission to claim this ticket.`)] });

  const opt = ticket.optionId ? getOption(guildId, ticket.optionId) : null;
  if (opt && opt.claimEnabled === false) return message.channel.send({ embeds: [warnEmbed(`${message.author}: Claiming is disabled for this option.`)] });

  ticket.claimerId = member.id;
  ticket.reasons.claim = reason || null;
  const allTickets = getTickets(guildId);
  allTickets[channel.id] = ticket;
  saveTickets(guildId, allTickets);

  if (opt && !opt.keepStaffVisibleOnClaim && opt.supportRoles) {
    for (const roleId of opt.supportRoles) {
      await channel.permissionOverwrites.edit(roleId, { ViewChannel: false }).catch(() => {});
    }
    await channel.permissionOverwrites.edit(member.id, {
      ViewChannel: true, SendMessages: true, ReadMessageHistory: true
    }).catch(() => {});
  }

  const claimMsg = opt && opt.claimMessage;
  const embed = claimMsg
    ? new EmbedBuilder().setColor(color).setDescription(resolveVars(claimMsg, { ticket, member, guild: message.guild, opt }))
    : new EmbedBuilder().setColor(color).setDescription(`📥 ${member} has **claimed** this ticket.${reason ? ` Reason: ${reason}` : ''}`);

  await channel.send({ embeds: [embed] });
  if (channel.id !== message.channel.id) await message.channel.send({ embeds: [okEmbed(`${message.author}: Claimed ticket ${channel}.`)] });
  await logTicketEvent(message.guild, guildId, opt, null, 'claim', ticket, member);
}

async function handleClose(message, channel, reason, guildId, member, client) {
  const ticket = getTicket(guildId, channel.id);
  if (!ticket) return message.channel.send({ embeds: [warnEmbed(`${message.author}: That channel is not a ticket.`)] });
  if (ticket.closed) return message.channel.send({ embeds: [warnEmbed(`${message.author}: That ticket is already closed.`)] });

  const opt = ticket.optionId ? getOption(guildId, ticket.optionId) : null;
  const canClose = isAdmin(member) ||
    ticket.claimerId === member.id ||
    (ticket.authorId === member.id && (!opt || opt.ticketCreatorCanClose !== false)) ||
    hasStaffAccess(member, guildId, ticket.optionId);
  if (!canClose) return message.channel.send({ embeds: [warnEmbed(`${message.author}: You don't have permission to close this ticket.`)] });

  ticket.closed = true;
  ticket.closedAt = Date.now();
  ticket.closedById = member.id;
  ticket.reasons.close = reason || null;
  const allTickets = getTickets(guildId);
  allTickets[channel.id] = ticket;
  saveTickets(guildId, allTickets);

  await channel.permissionOverwrites.edit(ticket.authorId, { ViewChannel: false }).catch(() => {});

  if (opt && opt.closeCategoryId) {
    await channel.setParent(opt.closeCategoryId, { lockPermissions: false }).catch(() => {});
  }

  const closeMsg = opt && opt.closeMessage;
  const embed = closeMsg
    ? new EmbedBuilder().setColor('#FFFFFF').setDescription(resolveVars(closeMsg, { ticket, member, guild: message.guild, opt }))
    : new EmbedBuilder().setColor('#FFFFFF').setDescription(`🔒 Ticket closed by ${member}.${reason ? ` Reason: ${reason}` : ''}`);

  const reopenRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`tix_reopen_${channel.id}`).setLabel('Reopen').setStyle(ButtonStyle.Success).setEmoji('🔓'),
    new ButtonBuilder().setCustomId(`tix_delete_${channel.id}`).setLabel('Delete').setStyle(ButtonStyle.Danger).setEmoji('🚫')
  );

  await channel.send({ embeds: [embed], components: [reopenRow] });
  if (channel.id !== message.channel.id) await message.channel.send({ embeds: [okEmbed(`${message.author}: Closed ticket ${channel}.`)] });
  await logTicketEvent(message.guild, guildId, opt, null, 'close', ticket, member);

  if (opt && opt.autoDeleteAfterClose) {
    const delay = parseMs(opt.autoDeleteAfterClose) || 0;
    if (delay > 0) setTimeout(() => { channel.delete().catch(() => {}); }, delay);
  }
}

async function handleDelete(message, channel, reason, guildId, member, client) {
  const ticket = getTicket(guildId, channel.id);
  if (!ticket) return message.channel.send({ embeds: [warnEmbed(`${message.author}: That channel is not a ticket.`)] });
  if (!hasTicketAccess(member, ticket, guildId, true)) return message.channel.send({ embeds: [warnEmbed(`${message.author}: You don't have permission to delete this ticket.`)] });

  const opt = ticket.optionId ? getOption(guildId, ticket.optionId) : null;
  const panel = ticket.panelId ? getPanel(guildId, ticket.panelId) : null;
  const delay = parseMs((opt && opt.deleteDelay) || (panel && panel.deleteDelay) || '5s') || 5000;

  ticket.deletedAt = Date.now();
  ticket.reasons.delete = reason || null;
  const allTickets = getTickets(guildId);
  allTickets[channel.id] = ticket;
  saveTickets(guildId, allTickets);

  const embed = new EmbedBuilder().setColor('#FFFFFF').setDescription(`🚫 This ticket will be **deleted** in ${delay / 1000}s.${reason ? ` Reason: ${reason}` : ''}`);
  await channel.send({ embeds: [embed] });
  if (channel.id !== message.channel.id) await message.channel.send({ embeds: [okEmbed(`${message.author}: Deleting ticket ${channel} in ${delay / 1000}s.`)] });
  await logTicketEvent(message.guild, guildId, opt, panel, 'delete', ticket, member);

  setTimeout(() => {
    const latest = getTickets(guildId);
    delete latest[channel.id];
    saveTickets(guildId, latest);
    channel.delete().catch(() => {});
  }, delay);
}

async function handleReopen(message, channel, reason, guildId, member, client) {
  const ticket = getTicket(guildId, channel.id);
  if (!ticket) return message.channel.send({ embeds: [warnEmbed(`${message.author}: That channel is not a ticket.`)] });
  if (!ticket.closed) return message.channel.send({ embeds: [warnEmbed(`${message.author}: That ticket is not closed.`)] });

  const openCheck = Object.assign({}, ticket, { claimerId: null });
  if (!hasTicketAccess(member, openCheck, guildId)) return message.channel.send({ embeds: [warnEmbed(`${message.author}: You don't have permission to reopen this ticket.`)] });

  const opt = ticket.optionId ? getOption(guildId, ticket.optionId) : null;
  ticket.closed = false;
  ticket.claimerId = null;
  ticket.reasons.reopen = reason || null;
  const allTickets = getTickets(guildId);
  allTickets[channel.id] = ticket;
  saveTickets(guildId, allTickets);

  await channel.permissionOverwrites.edit(ticket.authorId, {
    ViewChannel: true, SendMessages: true, ReadMessageHistory: true
  }).catch(() => {});

  if (opt && opt.openCategoryId) {
    await channel.setParent(opt.openCategoryId, { lockPermissions: false }).catch(() => {});
  }

  const reopenMsg = opt && opt.reopenMessage;
  const embed = reopenMsg
    ? new EmbedBuilder().setColor('#FFFFFF').setDescription(resolveVars(reopenMsg, { ticket, member, guild: message.guild, opt }))
    : new EmbedBuilder().setColor('#FFFFFF').setDescription(`🔓 Ticket reopened by ${member}.${reason ? ` Reason: ${reason}` : ''}`);

  const controlRow = buildTicketControlRow(ticket, opt);
  await channel.send({ embeds: [embed], components: controlRow ? [controlRow] : [] });
  if (channel.id !== message.channel.id) await message.channel.send({ embeds: [okEmbed(`${message.author}: Reopened ticket ${channel}.`)] });
  await logTicketEvent(message.guild, guildId, opt, null, 'reopen', ticket, member);
}

async function handleAllow(message, args, guildId, member) {
  const ticket = getTicket(guildId, message.channel.id);
  if (!ticket) return message.channel.send({ embeds: [warnEmbed(`${message.author}: This is not a ticket channel.`)] });
  if (!hasTicketAccess(member, ticket, guildId)) return message.channel.send({ embeds: [warnEmbed(`${message.author}: You don't have permission to modify this ticket.`)] });

  const target = message.mentions.members.first() || message.mentions.roles.first();
  if (!target) return message.channel.send({ embeds: [warnEmbed(`${message.author}: Please mention a **user or role** to allow.`)] });

  await message.channel.permissionOverwrites.edit(target, {
    ViewChannel: true, SendMessages: true, ReadMessageHistory: true
  });
  return message.channel.send({ embeds: [okEmbed(`${message.author}: Allowed ${target} to see this ticket.`)] });
}

async function handleAllowList(message, guildId, member) {
  const ticket = getTicket(guildId, message.channel.id);
  if (!ticket) return message.channel.send({ embeds: [warnEmbed(`${message.author}: This is not a ticket channel.`)] });

  const overwrites = message.channel.permissionOverwrites.cache.filter(o =>
    o.allow.has(PermissionFlagsBits.ViewChannel) && o.id !== message.guild.id
  );

  if (overwrites.size === 0) return message.channel.send({ embeds: [infoEmbed('No users or roles are explicitly allowed in this ticket.')] });

  const list = [...overwrites.values()].map(o => `<@${o.type === 0 ? '&' : ''}${o.id}>`).join('\n');
  return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Allowed in this ticket').setDescription(list)] });
}

async function handleDeny(message, args, guildId, member) {
  const ticket = getTicket(guildId, message.channel.id);
  if (!ticket) return message.channel.send({ embeds: [warnEmbed(`${message.author}: This is not a ticket channel.`)] });
  if (!hasTicketAccess(member, ticket, guildId)) return message.channel.send({ embeds: [warnEmbed(`${message.author}: You don't have permission to modify this ticket.`)] });

  const target = message.mentions.members.first() || message.mentions.roles.first();
  if (!target) return message.channel.send({ embeds: [warnEmbed(`${message.author}: Please mention a **user or role** to deny.`)] });

  await message.channel.permissionOverwrites.edit(target, { ViewChannel: false }).catch(() => {});
  return message.channel.send({ embeds: [okEmbed(`${message.author}: Removed ${target} from this ticket.`)] });
}

async function handleRename(message, args, guildId, member) {
  const ticket = getTicket(guildId, message.channel.id);
  if (ticket) {
    if (!hasTicketAccess(member, ticket, guildId)) return message.channel.send({ embeds: [warnEmbed(`${message.author}: You don't have permission to rename this ticket.`)] });
  } else {
    if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.channel.send({ embeds: [warnEmbed(`${message.author}: You need **Manage Channels** to rename this channel.`)] });
  }

  const newName = args.slice(1).join('-').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 100);
  if (!newName) return message.channel.send({ embeds: [warnEmbed(`${message.author}: Please provide a new name.`)] });

  await message.channel.setName(newName).catch(() => {});
  return message.channel.send({ embeds: [okEmbed(`${message.author}: Renamed channel to \`${newName}\`.`)] });
}

async function handleTranscript(message, channel, guildId, member) {
  const ticket = getTicket(guildId, channel.id);
  if (ticket && !hasTicketAccess(member, ticket, guildId)) return message.channel.send({ embeds: [warnEmbed(`${message.author}: You don't have permission to access this ticket.`)] });

  await message.channel.send({ embeds: [infoEmbed('Generating transcript...')] });

  try {
    const fetched = await channel.messages.fetch({ limit: 100 });
    const sorted = [...fetched.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    const lines = sorted.map(m => {
      const time = new Date(m.createdTimestamp).toISOString();
      const content = m.content || (m.embeds.length ? '[embed]' : '[attachment]');
      return `[${time}] ${m.author.tag}: ${content}`;
    });

    const transcriptText = lines.join('\n');
    const buffer = Buffer.from(transcriptText, 'utf8');

    await message.channel.send({
      embeds: [okEmbed(`${message.author}: Transcript for ${channel} (${sorted.length} messages)`)],
      files: [{ attachment: buffer, name: `transcript-${channel.name}.txt` }]
    });
  } catch (e) {
    await message.channel.send({ embeds: [warnEmbed(`${message.author}: Failed to generate transcript.`)] });
  }
}

async function handleMove(message, channel, reason, guildId, member) {
  const ticket = getTicket(guildId, channel.id);
  if (!ticket) {
    if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) return message.channel.send({ embeds: [warnEmbed(`${message.author}: You need **Manage Channels** to move this channel.`)] });
    return message.channel.send({ embeds: [warnEmbed(`${message.author}: That channel is not a ticket. Use \`${getPrefix(guildId)}tix move #channel reason\` for ticket channels.`)] });
  }

  if (!hasTicketAccess(member, ticket, guildId)) return message.channel.send({ embeds: [warnEmbed(`${message.author}: You don't have permission to move this ticket.`)] });

  const opts = getOptions(guildId).filter(o => o.id !== ticket.optionId && o.active !== false);
  if (opts.length === 0) return message.channel.send({ embeds: [warnEmbed(`${message.author}: No other options available to move to.`)] });

  const selectOpts = opts.slice(0, 25).map(o =>
    new StringSelectMenuOptionBuilder().setLabel(o.label || 'Option').setValue(o.id)
  );

  const select = new StringSelectMenuBuilder()
    .setCustomId(`tix_move_select_${channel.id}_${member.id}`)
    .setPlaceholder('Select target option...')
    .addOptions(selectOpts);

  return message.channel.send({
    embeds: [infoEmbed('Select the option to move this ticket to:')],
    components: [new ActionRowBuilder().addComponents(select)]
  });
}

async function handleUnclaim(message, channel, guildId, member) {
  const ticket = getTicket(guildId, channel.id);
  if (!ticket) return message.channel.send({ embeds: [warnEmbed(`${message.author}: That channel is not a ticket.`)] });
  if (!ticket.claimerId) return message.channel.send({ embeds: [warnEmbed(`${message.author}: That ticket is not claimed.`)] });
  if (!hasTicketAccess(member, ticket, guildId) && ticket.claimerId !== member.id) return message.channel.send({ embeds: [warnEmbed(`${message.author}: You don't have permission.`)] });

  const prevClaimerId = ticket.claimerId;
  ticket.claimerId = null;
  const allTickets = getTickets(guildId);
  allTickets[channel.id] = ticket;
  saveTickets(guildId, allTickets);

  await channel.send({ embeds: [infoEmbed(`🔓 <@${prevClaimerId}> has been removed as claimer.`)] });
  if (channel.id !== message.channel.id) await message.channel.send({ embeds: [okEmbed(`${message.author}: Unclaimed ticket ${channel}.`)] });
}

async function handleBlacklist(message, args, guildId) {
  const bl = getBlacklist(guildId);
  const target = message.mentions.members.first() || message.mentions.roles.first();

  if (!target) {
    if (bl.length === 0) return message.channel.send({ embeds: [infoEmbed('Blacklist is empty.')] });
    const list = bl.map(id => `<@${id}> | <@&${id}>`).join('\n');
    return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Ticket Blacklist').setDescription(list)] });
  }

  const targetId = target.id;
  const idx = bl.indexOf(targetId);
  if (idx !== -1) {
    bl.splice(idx, 1);
    saveBlacklist(guildId, bl);
    return message.channel.send({ embeds: [okEmbed(`${message.author}: Removed ${target} from the blacklist.`)] });
  } else {
    bl.push(targetId);
    saveBlacklist(guildId, bl);
    return message.channel.send({ embeds: [okEmbed(`${message.author}: Added ${target} to the blacklist.`)] });
  }
}

async function handleList(message, guildId) {
  const tickets = getTickets(guildId);
  const open = Object.values(tickets).filter(t => !t.closed);

  if (open.length === 0) return message.channel.send({ embeds: [infoEmbed('No open tickets.')] });

  const list = open.slice(0, 20).map(t => {
    const ch = message.guild.channels.cache.get(t.channelId);
    const opt = t.optionId ? getOption(guildId, t.optionId) : null;
    return `• ${ch ? ch : `#${t.channelId}`} — Case #${String(t.caseId).padStart(4, '0')} — <@${t.authorId}>${t.claimerId ? ` — Claimed by <@${t.claimerId}>` : ''}${opt ? ` — ${opt.label}` : ''}`;
  });

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`Open Tickets — ${message.guild.name}`)
    .setDescription(list.join('\n'))
    .setFooter({ text: `${open.length} open ticket(s)` });

  return message.channel.send({ embeds: [embed] });
}

async function handleStats(message, args, guildId) {
  const tickets = getTickets(guildId);
  const allTickets = Object.values(tickets);
  const targetMember = message.mentions.members.first();
  const embed = new EmbedBuilder().setColor(color);

  if (targetMember) {
    const claimed = allTickets.filter(t => t.claimerId === targetMember.id).length;
    const closedBy = allTickets.filter(t => t.closedById === targetMember.id).length;
    embed.setTitle(`Ticket Stats — ${targetMember.displayName}`)
      .addFields(
        { name: 'Tickets Claimed', value: String(claimed), inline: true },
        { name: 'Tickets Closed', value: String(closedBy), inline: true }
      );
  } else {
    const total = allTickets.length;
    const open = allTickets.filter(t => !t.closed).length;
    const closed = allTickets.filter(t => t.closed).length;
    embed.setTitle(`Ticket Stats — ${message.guild.name}`)
      .addFields(
        { name: 'Total', value: String(total), inline: true },
        { name: 'Open', value: String(open), inline: true },
        { name: 'Closed', value: String(closed), inline: true }
      );
  }

  return message.channel.send({ embeds: [embed] });
}

async function handleProfile(message, guildId, member, admin) {
  const profiles = getProfiles(guildId);
  const profile = profiles[member.id] || {};

  if (admin) {
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('Ticket Profiles')
      .setDescription('Staff claim profiles. Members set these themselves with `tix profile`.');

    const profilesArr = Object.entries(profiles);
    if (profilesArr.length > 0) {
      embed.addFields(profilesArr.slice(0, 10).map(([id, p]) => ({
        name: `<@${id}>`,
        value: p.bio || 'No bio set',
        inline: false
      })));
    } else {
      embed.setDescription('No profiles configured yet.');
    }

    return message.channel.send({ embeds: [embed] });
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle('Your Ticket Profile')
    .setDescription('Your profile is shown when you claim a ticket.')
    .addFields(
      { name: 'Bio', value: profile.bio || 'Not set', inline: false },
      { name: 'Pronouns', value: profile.pronouns || 'Not set', inline: true },
      { name: 'Timezone', value: profile.timezone || 'Not set', inline: true }
    )
    .setFooter({ text: 'Use the buttons below to update your profile.' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`tprofile_bio_${member.id}`).setLabel('Set Bio').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`tprofile_pronouns_${member.id}`).setLabel('Set Pronouns').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`tprofile_timezone_${member.id}`).setLabel('Set Timezone').setStyle(ButtonStyle.Primary)
  );

  return message.channel.send({ embeds: [embed], components: [row] });
}

async function handleResend(message, args, guildId) {
  const targetChannel = resolveChannel(message, args[1]) || message.channel;
  const panels = getPanels(guildId);

  if (panels.length === 0) return message.channel.send({ embeds: [warnEmbed(`${message.author}: No panels configured yet.`)] });

  if (panels.length === 1) {
    const panel = panels[0];
    const opts = getOptions(guildId);
    const msgPayload = await buildPanelMessage(message.guild, panel, opts);
    await targetChannel.send(msgPayload);
    return message.channel.send({ embeds: [okEmbed(`${message.author}: Panel resent to ${targetChannel}.`)] });
  }

  const selectOpts = panels.map(p => new StringSelectMenuOptionBuilder().setLabel(p.name).setValue(p.id));
  const select = new StringSelectMenuBuilder()
    .setCustomId(`tresend_select_${targetChannel.id}_${message.author.id}`)
    .setPlaceholder('Select a panel to resend...')
    .addOptions(selectOpts);

  return message.channel.send({
    embeds: [infoEmbed('Select the panel to resend:')],
    components: [new ActionRowBuilder().addComponents(select)]
  });
}

async function handleTrainee(message, args, guildId, member) {
  const ticket = getTicket(guildId, message.channel.id);
  if (!ticket) return message.channel.send({ embeds: [warnEmbed(`${message.author}: This is not a ticket channel.`)] });
  if (!hasTicketAccess(member, ticket, guildId)) return message.channel.send({ embeds: [warnEmbed(`${message.author}: You don't have permission.`)] });

  const sub = args[1] && args[1].toLowerCase();

  if (sub === 'grant') {
    const target = message.mentions.members.first() || message.mentions.roles.first();
    if (!target) return message.channel.send({ embeds: [warnEmbed(`Mention a user or role to grant trainee access.`)] });
    await message.channel.permissionOverwrites.edit(target, {
      ViewChannel: true, SendMessages: true, ReadMessageHistory: true
    });
    return message.channel.send({ embeds: [okEmbed(`${message.author}: Granted trainee access to ${target}.`)] });
  }

  if (sub === 'revoke') {
    const target = message.mentions.members.first() || message.mentions.roles.first();
    if (!target) return message.channel.send({ embeds: [warnEmbed(`Mention a user or role to revoke trainee access.`)] });
    await message.channel.permissionOverwrites.delete(target).catch(() => {});
    return message.channel.send({ embeds: [okEmbed(`${message.author}: Revoked trainee access from ${target}.`)] });
  }

  if (sub === 'list') {
    const overwrites = message.channel.permissionOverwrites.cache.filter(o =>
      o.allow.has(PermissionFlagsBits.ViewChannel) && o.id !== message.guild.id
    );
    if (overwrites.size === 0) return message.channel.send({ embeds: [infoEmbed('No trainee overrides.')] });
    const list = [...overwrites.values()].map(o => `<@${o.type === 0 ? '&' : ''}${o.id}>`).join('\n');
    return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Trainee Overrides').setDescription(list)] });
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ttrainee_grant_${message.channel.id}`).setLabel('Grant').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`ttrainee_revoke_${message.channel.id}`).setLabel('Revoke').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`ttrainee_list_${message.channel.id}`).setLabel('List').setStyle(ButtonStyle.Secondary)
  );

  return message.channel.send({
    embeds: [infoEmbed('Manage trainee permissions for this ticket:')],
    components: [row]
  });
}

async function handleReason(message, args, guildId, member) {
  const action = args[1] && args[1].toLowerCase();
  if (!['claim', 'close', 'reopen', 'delete'].includes(action)) {
    return message.channel.send({ embeds: [warnEmbed(`${message.author}: Action must be one of: \`claim\`, \`close\`, \`reopen\`, \`delete\`.`)] });
  }

  const ticket = getTicket(guildId, message.channel.id);
  if (!ticket) return message.channel.send({ embeds: [warnEmbed(`${message.author}: This is not a ticket channel.`)] });

  const newReason = args.slice(2).join(' ');
  if (!newReason) return message.channel.send({ embeds: [warnEmbed(`${message.author}: Provide a reason.`)] });

  const canEdit = isAdmin(member) || ticket.claimerId === member.id || hasStaffAccess(member, guildId, ticket.optionId);
  if (!canEdit) return message.channel.send({ embeds: [warnEmbed(`${message.author}: You don't have permission to update reasons.`)] });

  ticket.reasons = ticket.reasons || {};
  ticket.reasons[action] = newReason;
  const allTickets = getTickets(guildId);
  allTickets[message.channel.id] = ticket;
  saveTickets(guildId, allTickets);

  return message.channel.send({ embeds: [okEmbed(`${message.author}: Updated **${action}** reason.`)] });
}

async function handleFormsManagement(message, args, guildId) {
  const forms = getForms(guildId);
  const formName = args.slice(1).join(' ');

  if (!formName) {
    if (forms.length === 0) return message.channel.send({ embeds: [infoEmbed(`No forms yet. Use \`${getPrefix(guildId)}tix forms <name>\` to create one.`)] });
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('Ticket Forms')
      .setDescription(forms.map((f, i) => `**${i + 1}.** ${f.name} (${(f.fields && f.fields.length) || 0} fields)`).join('\n'));
    return message.channel.send({ embeds: [embed] });
  }

  let form = forms.find(f => f.name.toLowerCase() === formName.toLowerCase());
  if (!form) {
    form = { id: generateId(), name: formName, fields: [] };
    forms.push(form);
    saveForms(guildId, forms);
    await message.channel.send({ embeds: [okEmbed(`Created form **${formName}**`)] });
  }

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`Form: ${form.name}`)
    .setDescription(`Fields: ${(form.fields && form.fields.length) || 0}\n\nUse the buttons below to manage this form.`);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`tform_addfield_${form.id}`).setLabel('Add Field').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`tform_viewfields_${form.id}`).setLabel('View Fields').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`tform_delete_${form.id}`).setLabel('Delete Form').setStyle(ButtonStyle.Danger)
  );

  return message.channel.send({ embeds: [embed], components: [row] });
}

function parseMs(str) {
  if (!str) return 0;
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  let total = 0;
  const matches = str.matchAll(/(\d+)([smhdw])/g);
  for (const m of matches) {
    total += parseInt(m[1]) * (units[m[2]] || 0);
  }
  return total;
}

module.exports.handleTicketInteraction = async function(interaction, client) {
  const customId = interaction.customId;
  const guild = interaction.guild;
  const member = interaction.member;
  const guildId = guild.id;

  if (customId.startsWith('tix_open_')) {
    const isDefault = customId.startsWith('tix_open_default_');
    const optionId = isDefault ? null : customId.replace('tix_open_', '');
    return openTicket(interaction, guild, member, optionId);
  }

  if (customId.startsWith('tix_dropdown_')) {
    const optionId = interaction.values && interaction.values[0];
    return openTicket(interaction, guild, member, optionId);
  }

  if (customId.startsWith('tix_claim_')) {
    const channelId = customId.replace('tix_claim_', '');
    const channel = guild.channels.cache.get(channelId);
    if (!channel) return interaction.reply({ content: '❌ Channel not found.', ephemeral: true });
    await interaction.deferReply({ ephemeral: true });

    const ticket = getTicket(guildId, channelId);
    if (!ticket) return interaction.editReply({ content: '❌ Not a ticket.' });
    if (ticket.closed) return interaction.editReply({ content: '❌ Ticket is closed.' });
    if (ticket.claimerId) return interaction.editReply({ content: `❌ Already claimed by <@${ticket.claimerId}>.` });
    if (ticket.authorId === interaction.user.id) return interaction.editReply({ content: '❌ You cannot claim your own ticket.' });
    if (!hasStaffAccess(member, guildId, ticket.optionId)) return interaction.editReply({ content: '❌ No permission.' });

    const opt = ticket.optionId ? getOption(guildId, ticket.optionId) : null;
    ticket.claimerId = interaction.user.id;
    const allTickets = getTickets(guildId);
    allTickets[channelId] = ticket;
    saveTickets(guildId, allTickets);

    if (opt && !opt.keepStaffVisibleOnClaim && opt.supportRoles) {
      for (const roleId of opt.supportRoles) {
        await channel.permissionOverwrites.edit(roleId, { ViewChannel: false }).catch(() => {});
      }
    }

    const embed = new EmbedBuilder().setColor(color).setDescription(`📥 ${interaction.user} has **claimed** this ticket.`);
    await channel.send({ embeds: [embed] });
    await logTicketEvent(guild, guildId, opt, null, 'claim', ticket, member);
    return interaction.editReply({ content: '✅ Ticket claimed.' });
  }

  if (customId.startsWith('tix_close_')) {
    const channelId = customId.replace('tix_close_', '');
    const channel = guild.channels.cache.get(channelId) || interaction.channel;
    await interaction.deferReply({ ephemeral: true });

    const ticket = getTicket(guildId, channelId);
    if (!ticket) return interaction.editReply({ content: '❌ Not a ticket.' });
    if (ticket.closed) return interaction.editReply({ content: '❌ Already closed.' });

    const opt = ticket.optionId ? getOption(guildId, ticket.optionId) : null;
    const canClose = isAdmin(member) ||
      ticket.claimerId === interaction.user.id ||
      (ticket.authorId === interaction.user.id && (!opt || opt.ticketCreatorCanClose !== false)) ||
      hasStaffAccess(member, guildId, ticket.optionId);
    if (!canClose) return interaction.editReply({ content: '❌ No permission.' });

    ticket.closed = true;
    ticket.closedAt = Date.now();
    ticket.closedById = interaction.user.id;
    const allTickets = getTickets(guildId);
    allTickets[channelId] = ticket;
    saveTickets(guildId, allTickets);

    await channel.permissionOverwrites.edit(ticket.authorId, { ViewChannel: false }).catch(() => {});

    const embed = new EmbedBuilder().setColor('#FFFFFF').setDescription(`🔒 Ticket closed by ${interaction.user}.`);
    const reopenRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`tix_reopen_${channelId}`).setLabel('Reopen').setStyle(ButtonStyle.Success).setEmoji('🔓'),
      new ButtonBuilder().setCustomId(`tix_delete_${channelId}`).setLabel('Delete').setStyle(ButtonStyle.Danger).setEmoji('🚫')
    );
    await channel.send({ embeds: [embed], components: [reopenRow] });
    await logTicketEvent(guild, guildId, opt, null, 'close', ticket, member);

    if (opt && opt.autoDeleteAfterClose) {
      const delay = parseMs(opt.autoDeleteAfterClose) || 0;
      if (delay > 0) setTimeout(() => { channel.delete().catch(() => {}); }, delay);
    }

    return interaction.editReply({ content: '✅ Ticket closed.' });
  }

  if (customId.startsWith('tix_delete_')) {
    const channelId = customId.replace('tix_delete_', '');
    const channel = guild.channels.cache.get(channelId) || interaction.channel;
    await interaction.deferReply({ ephemeral: true });

    const ticket = getTicket(guildId, channelId);
    if (!ticket) return interaction.editReply({ content: '❌ Not a ticket.' });
    if (!hasTicketAccess(member, ticket, guildId, true)) return interaction.editReply({ content: '❌ No permission.' });

    const opt = ticket.optionId ? getOption(guildId, ticket.optionId) : null;
    const panel = ticket.panelId ? getPanel(guildId, ticket.panelId) : null;
    const delay = parseMs((opt && opt.deleteDelay) || (panel && panel.deleteDelay) || '5s') || 5000;

    const embed = new EmbedBuilder().setColor('#FFFFFF').setDescription(`🚫 This ticket will be deleted in **${delay / 1000}s**.`);
    await channel.send({ embeds: [embed] });
    await logTicketEvent(guild, guildId, opt, panel, 'delete', ticket, member);
    await interaction.editReply({ content: '✅ Deleting ticket...' });

    setTimeout(() => {
      const latest = getTickets(guildId);
      delete latest[channelId];
      saveTickets(guildId, latest);
      channel.delete().catch(() => {});
    }, delay);
    return;
  }

  if (customId.startsWith('tix_reopen_')) {
    const channelId = customId.replace('tix_reopen_', '');
    const channel = guild.channels.cache.get(channelId) || interaction.channel;
    await interaction.deferReply({ ephemeral: true });

    const ticket = getTicket(guildId, channelId);
    if (!ticket) return interaction.editReply({ content: '❌ Not a ticket.' });
    if (!ticket.closed) return interaction.editReply({ content: '❌ Not closed.' });

    const openCheck = Object.assign({}, ticket, { claimerId: null });
    if (!hasTicketAccess(member, openCheck, guildId)) return interaction.editReply({ content: '❌ No permission.' });

    const opt = ticket.optionId ? getOption(guildId, ticket.optionId) : null;
    ticket.closed = false;
    ticket.claimerId = null;
    const allTickets = getTickets(guildId);
    allTickets[channelId] = ticket;
    saveTickets(guildId, allTickets);

    await channel.permissionOverwrites.edit(ticket.authorId, {
      ViewChannel: true, SendMessages: true, ReadMessageHistory: true
    }).catch(() => {});

    const embed = new EmbedBuilder().setColor('#FFFFFF').setDescription(`🔓 Ticket reopened by ${interaction.user}.`);
    const controlRow = buildTicketControlRow(ticket, opt);
    await channel.send({ embeds: [embed], components: controlRow ? [controlRow] : [] });
    await logTicketEvent(guild, guildId, opt, null, 'reopen', ticket, member);
    return interaction.editReply({ content: '✅ Ticket reopened.' });
  }

  if (customId.startsWith('tpanel_')) {
    if (!isAdmin(member)) return interaction.reply({ content: '❌ Administrator required.', ephemeral: true });
    return handlePanelButton(interaction, customId, guildId);
  }

  if (customId === 'topt_select') {
    if (!isAdmin(member)) return interaction.reply({ content: '❌ Administrator required.', ephemeral: true });
    const optId = interaction.values && interaction.values[0];
    const opt = getOption(guildId, optId);
    if (!opt) return interaction.reply({ content: '❌ Option not found.', ephemeral: true });
    return showOptionMenu(interaction, opt, guildId);
  }

  if (customId.startsWith('topt_') || customId.startsWith('tobehav_') || customId.startsWith('toperm_') || customId.startsWith('tomsg_')) {
    if (!isAdmin(member)) return interaction.reply({ content: '❌ Administrator required.', ephemeral: true });
    return handleOptionButton(interaction, customId, guildId);
  }

  if (customId.startsWith('tix_move_select_')) {
    const parts = customId.split('_');
    const channelId = parts[3];
    const requesterId = parts[4];
    if (interaction.user.id !== requesterId) return interaction.reply({ content: '❌ Not your menu.', ephemeral: true });

    const newOptId = interaction.values && interaction.values[0];
    const channel = guild.channels.cache.get(channelId);
    if (!channel) return interaction.reply({ content: '❌ Channel not found.', ephemeral: true });

    const ticket = getTicket(guildId, channelId);
    const newOpt = getOption(guildId, newOptId);
    if (!ticket || !newOpt) return interaction.reply({ content: '❌ Not found.', ephemeral: true });

    ticket.optionId = newOptId;
    const allTickets = getTickets(guildId);
    allTickets[channelId] = ticket;
    saveTickets(guildId, allTickets);

    if (newOpt.openCategoryId) await channel.setParent(newOpt.openCategoryId, { lockPermissions: false }).catch(() => {});

    const embed = new EmbedBuilder().setColor(color).setDescription(`📦 Ticket moved to option **${newOpt.label}** by ${interaction.user}.`);
    await channel.send({ embeds: [embed] });
    return interaction.update({ content: '✅ Ticket moved.', components: [], embeds: [] });
  }

  if (customId.startsWith('tresend_select_')) {
    const parts = customId.split('_');
    const targetChannelId = parts[2];
    const requesterId = parts[3];
    if (interaction.user.id !== requesterId) return interaction.reply({ content: '❌ Not your menu.', ephemeral: true });

    const panelId = interaction.values && interaction.values[0];
    const panel = getPanel(guildId, panelId);
    if (!panel) return interaction.reply({ content: '❌ Panel not found.', ephemeral: true });

    const targetChannel = guild.channels.cache.get(targetChannelId) || interaction.channel;
    const opts = getOptions(guildId);
    const msgPayload = await buildPanelMessage(guild, panel, opts);
    await targetChannel.send(msgPayload);

    return interaction.update({ content: `✅ Panel resent to ${targetChannel}.`, components: [], embeds: [] });
  }

  if (customId.startsWith('tprofile_')) {
    return handleProfileButton(interaction, customId, guildId);
  }

  if (customId.startsWith('tform_')) {
    if (!isAdmin(member)) return interaction.reply({ content: '❌ Administrator required.', ephemeral: true });
    return handleFormButton(interaction, customId, guildId);
  }

  if (customId.startsWith('ttrainee_')) {
    const parts = customId.split('_');
    const action = parts[1];
    const channelId = parts[2];
    const channel = guild.channels.cache.get(channelId) || interaction.channel;
    const ticket = getTicket(guildId, channelId);
    if (!ticket) return interaction.reply({ content: '❌ Not a ticket.', ephemeral: true });
    if (!hasTicketAccess(member, ticket, guildId)) return interaction.reply({ content: '❌ No permission.', ephemeral: true });

    if (action === 'list') {
      const overwrites = channel.permissionOverwrites.cache.filter(o =>
        o.allow.has(PermissionFlagsBits.ViewChannel) && o.id !== guild.id
      );
      if (overwrites.size === 0) return interaction.reply({ content: 'No trainee overrides.', ephemeral: true });
      const list = [...overwrites.values()].map(o => `<@${o.type === 0 ? '&' : ''}${o.id}>`).join('\n');
      return interaction.reply({ content: `**Trainee Overrides:**\n${list}`, ephemeral: true });
    }

    return interaction.reply({ content: `Use \`${getPrefix(guildId)}tix trainee ${action} @mention\` to ${action} trainee access.`, ephemeral: true });
  }
};

module.exports.handleTicketModal = async function(interaction, guildId) {
  const customId = interaction.customId;

  if (customId.startsWith('tpdisplay_modal_')) {
    const panelId = customId.replace('tpdisplay_modal_', '');
    const panels = getPanels(guildId);
    const idx = panels.findIndex(p => p.id === panelId);
    if (idx === -1) return interaction.reply({ content: '❌ Panel not found.', ephemeral: true });
    const titleVal = interaction.fields.getTextInputValue('title');
    const descVal = interaction.fields.getTextInputValue('description');
    const colorVal = interaction.fields.getTextInputValue('color');
    if (titleVal) panels[idx].title = titleVal;
    if (descVal) panels[idx].description = descVal;
    if (colorVal) panels[idx].color = colorVal;
    savePanels(guildId, panels);
    return interaction.reply({ content: '✅ Panel display updated.', ephemeral: true });
  }

  if (customId.startsWith('tomodal_naming_')) {
    const optId = customId.replace('tomodal_naming_', '');
    const opts = getOptions(guildId);
    const idx = opts.findIndex(o => o.id === optId);
    if (idx === -1) return interaction.reply({ content: '❌ Option not found.', ephemeral: true });
    const labelVal = interaction.fields.getTextInputValue('label');
    const tplVal = interaction.fields.getTextInputValue('namingTemplate');
    if (labelVal) opts[idx].label = labelVal;
    if (tplVal) opts[idx].namingTemplate = tplVal;
    saveOptions(guildId, opts);
    return interaction.reply({ content: '✅ Naming updated.', ephemeral: true });
  }

  if (customId.startsWith('tomodal_buttonux_')) {
    const optId = customId.replace('tomodal_buttonux_', '');
    const opts = getOptions(guildId);
    const idx = opts.findIndex(o => o.id === optId);
    if (idx === -1) return interaction.reply({ content: '❌ Option not found.', ephemeral: true });
    const label = interaction.fields.getTextInputValue('claimButtonLabel');
    const emoji = interaction.fields.getTextInputValue('claimButtonEmoji');
    const colorStr = interaction.fields.getTextInputValue('claimButtonColor');
    if (label) opts[idx].claimButtonLabel = label;
    if (emoji) opts[idx].claimButtonEmoji = emoji;
    if (colorStr) opts[idx].claimButtonColor = colorStr.toLowerCase();
    saveOptions(guildId, opts);
    return interaction.reply({ content: '✅ Button UX updated.', ephemeral: true });
  }

  if (customId.startsWith('tomodal_greeting_')) {
    const optId = customId.replace('tomodal_greeting_', '');
    const opts = getOptions(guildId);
    const idx = opts.findIndex(o => o.id === optId);
    if (idx === -1) return interaction.reply({ content: '❌ Option not found.', ephemeral: true });
    const msg = interaction.fields.getTextInputValue('message');
    opts[idx].greetingMessage = msg || null;
    saveOptions(guildId, opts);
    return interaction.reply({ content: '✅ Greeting message updated.', ephemeral: true });
  }

  if (customId.startsWith('tomodal_autoclose_')) {
    const optId = customId.replace('tomodal_autoclose_', '');
    const opts = getOptions(guildId);
    const idx = opts.findIndex(o => o.id === optId);
    if (idx === -1) return interaction.reply({ content: '❌ Option not found.', ephemeral: true });
    const timeVal = interaction.fields.getTextInputValue('time');
    const msgVal = interaction.fields.getTextInputValue('message');
    opts[idx].autoCloseTime = timeVal || null;
    opts[idx].autoCloseMessage = msgVal || null;
    opts[idx].autoCloseEnabled = !!timeVal;
    saveOptions(guildId, opts);
    return interaction.reply({ content: '✅ Auto-Close configured.', ephemeral: true });
  }

  if (customId.startsWith('tprofile_modal_')) {
    const parts = customId.split('_');
    const field = parts[2];
    const userId = parts[3];
    const profiles = getProfiles(guildId);
    if (!profiles[userId]) profiles[userId] = {};
    profiles[userId][field] = interaction.fields.getTextInputValue('value');
    saveProfiles(guildId, profiles);
    return interaction.reply({ content: `✅ Profile **${field}** updated.`, ephemeral: true });
  }

  if (customId.startsWith('tform_fieldmodal_')) {
    const formId = customId.replace('tform_fieldmodal_', '');
    const forms = getForms(guildId);
    const idx = forms.findIndex(f => f.id === formId);
    if (idx === -1) return interaction.reply({ content: '❌ Form not found.', ephemeral: true });
    const label = interaction.fields.getTextInputValue('label');
    const placeholder = interaction.fields.getTextInputValue('placeholder');
    if (!forms[idx].fields) forms[idx].fields = [];
    forms[idx].fields.push({ id: generateId(), label, placeholder, required: true });
    saveForms(guildId, forms);
    return interaction.reply({ content: `✅ Field **${label}** added.`, ephemeral: true });
  }
};

async function handlePanelButton(interaction, customId, guildId) {
  const parts = customId.split('_');
  const action = parts[1];
  const panelId = parts[2];
  const panel = getPanel(guildId, panelId);
  if (!panel) return interaction.reply({ content: '❌ Panel not found.', ephemeral: true });

  if (action === 'behavior') {
    const embed = new EmbedBuilder().setColor(color).setTitle(`Behavior: ${panel.name}`)
      .addFields(
        { name: 'Panel Type', value: panel.type || 'button', inline: true },
        { name: 'Max Open Tickets', value: String(panel.maxOpen || 1), inline: true },
        { name: 'Delete Delay', value: panel.deleteDelay || '5s', inline: true }
      );
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`tpbehav_type_${panelId}`).setLabel('Toggle Type (button/dropdown)').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`tpbehav_maxopen_${panelId}`).setLabel('Max Open Tickets').setStyle(ButtonStyle.Secondary)
    );
    return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  if (action === 'categories') {
    const embed = new EmbedBuilder().setColor(color).setTitle(`Categories: ${panel.name}`)
      .addFields(
        { name: 'Default Category', value: panel.categoryId ? `<#${panel.categoryId}>` : 'None', inline: true },
        { name: 'Log Channel', value: panel.logChannelId ? `<#${panel.logChannelId}>` : 'None', inline: true }
      );
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (action === 'display') {
    const modal = new ModalBuilder()
      .setCustomId(`tpdisplay_modal_${panelId}`)
      .setTitle(`Edit Panel Display`)
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('title').setLabel('Panel Title').setStyle(TextInputStyle.Short).setValue(panel.title || '').setRequired(false)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('description').setLabel('Panel Description').setStyle(TextInputStyle.Paragraph).setValue(panel.description || '').setRequired(false)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('color').setLabel('Embed Color (hex, e.g. #5865F2)').setStyle(TextInputStyle.Short).setValue(panel.color || color).setRequired(false)
        )
      );
    return interaction.showModal(modal);
  }

  if (action === 'messages') {
    const embed = new EmbedBuilder().setColor(color).setTitle(`Messages: ${panel.name}`)
      .setDescription('Set the log channel for this panel via Categories. Per-option messages are configured in Options.')
      .addFields({ name: 'Log Channel', value: panel.logChannelId ? `<#${panel.logChannelId}>` : 'None set', inline: true });
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (action === 'resend') {
    const opts = getOptions(guildId);
    const msgPayload = await buildPanelMessage(interaction.guild, panel, opts);
    await interaction.channel.send(msgPayload);
    return interaction.reply({ content: `✅ Panel **${panel.name}** resent in this channel.`, ephemeral: true });
  }

  if (action === 'behav') {
    // Sub-actions for behavior
    const subAction = parts[2];
    const pid = parts[3];
    const p = getPanel(guildId, pid);
    if (!p) return interaction.reply({ content: '❌ Panel not found.', ephemeral: true });
    if (subAction === 'type') {
      const panels = getPanels(guildId);
      const idx = panels.findIndex(x => x.id === pid);
      panels[idx].type = panels[idx].type === 'dropdown' ? 'button' : 'dropdown';
      savePanels(guildId, panels);
      return interaction.reply({ content: `✅ Panel type set to **${panels[idx].type}**.`, ephemeral: true });
    }
  }

  return interaction.reply({ content: '❌ Unknown action.', ephemeral: true });
}

async function handleOptionButton(interaction, customId, guildId) {
  const parts = customId.split('_');
  const prefix2 = parts[0];
  const action = parts[1];
  const optId = parts[2];
  const opt = getOption(guildId, optId);
  if (!opt) return interaction.reply({ content: '❌ Option not found.', ephemeral: true });

  if (action === 'behavior') {
    const embed = new EmbedBuilder().setColor(color).setTitle(`Behavior: ${opt.label}`)
      .addFields(
        { name: 'Claiming Enabled', value: opt.claimEnabled !== false ? '✅ Yes' : '❌ No', inline: true },
        { name: 'Max Open', value: String(opt.maxOpen || 1), inline: true },
        { name: 'Creator Can Close', value: opt.ticketCreatorCanClose !== false ? '✅ Yes' : '❌ No', inline: true },
        { name: 'Keep Staff Visible On Claim', value: opt.keepStaffVisibleOnClaim ? '✅ Yes' : '❌ No', inline: true }
      );
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`topt_naming_${optId}`).setLabel('Naming').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`topt_categories_${optId}`).setLabel('Categories').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`topt_permissions_${optId}`).setLabel('Permissions').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`topt_buttonux_${optId}`).setLabel('Button UX').setStyle(ButtonStyle.Primary)
    );
    return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  if (action === 'naming') {
    const modal = new ModalBuilder()
      .setCustomId(`tomodal_naming_${optId}`)
      .setTitle(`Naming: ${opt.label}`)
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('label').setLabel('Option Label').setStyle(TextInputStyle.Short).setValue(opt.label || '').setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('namingTemplate').setLabel('Channel Name Template').setStyle(TextInputStyle.Short).setValue(opt.namingTemplate || 'ticket-{case}').setRequired(false).setPlaceholder('{name}-{case}, ticket-{case}, etc.')
        )
      );
    return interaction.showModal(modal);
  }

  if (action === 'categories') {
    const embed = new EmbedBuilder().setColor(color).setTitle(`Categories: ${opt.label}`)
      .addFields(
        { name: 'Open Category', value: opt.openCategoryId ? `<#${opt.openCategoryId}>` : 'None (default)', inline: true },
        { name: 'Close Category', value: opt.closeCategoryId ? `<#${opt.closeCategoryId}>` : 'None', inline: true },
        { name: 'Claim Category', value: opt.claimCategoryId ? `<#${opt.claimCategoryId}>` : 'None', inline: true }
      )
      .setDescription('To set categories, use the bot\'s config commands or contact your bot admin.');
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (action === 'permissions') {
    const supportRoles = (opt.supportRoles || []).map(r => `<@&${r}>`).join(', ') || 'None';
    const traineeRoles = (opt.traineeRoles || []).map(r => `<@&${r}>`).join(', ') || 'None';
    const embed = new EmbedBuilder().setColor(color).setTitle(`Permissions: ${opt.label}`)
      .addFields(
        { name: 'Support Roles', value: supportRoles, inline: false },
        { name: 'Ticket Opener Can Close', value: opt.ticketCreatorCanClose !== false ? '✅ Yes' : '❌ No', inline: true },
        { name: 'Keep Staff Visible On Claim', value: opt.keepStaffVisibleOnClaim ? '✅ Yes' : '❌ No', inline: true },
        { name: 'Trainee Roles', value: traineeRoles, inline: false }
      );
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`toperm_toggleclose_${optId}`).setLabel('Toggle Creator Can Close').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`toperm_togglestaffvis_${optId}`).setLabel('Toggle Staff Visible On Claim').setStyle(ButtonStyle.Secondary)
    );
    return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  if (action === 'buttonux') {
    const modal = new ModalBuilder()
      .setCustomId(`tomodal_buttonux_${optId}`)
      .setTitle(`Claim Button UX: ${opt.label}`)
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('claimButtonLabel').setLabel('Button Label').setStyle(TextInputStyle.Short).setValue(opt.claimButtonLabel || '').setRequired(false).setPlaceholder('Leave blank to use default: Claim')
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('claimButtonEmoji').setLabel('Button Emoji').setStyle(TextInputStyle.Short).setValue(opt.claimButtonEmoji || '').setRequired(false).setPlaceholder("Leave blank for default (📥), or type 'none'")
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('claimButtonColor').setLabel('Button Color (blue/gray/green/red)').setStyle(TextInputStyle.Short).setValue(opt.claimButtonColor || 'gray').setRequired(false)
        )
      );
    return interaction.showModal(modal);
  }

  if (action === 'messages') {
    const embed = new EmbedBuilder().setColor(color).setTitle(`Messages: ${opt.label}`)
      .addFields(
        { name: 'Greeting', value: opt.greetingMessage ? '✅ Set' : '❌ Not set', inline: true },
        { name: 'Close', value: opt.closeMessage ? '✅ Set' : '❌ Not set', inline: true },
        { name: 'Reopen', value: opt.reopenMessage ? '✅ Set' : '❌ Not set', inline: true },
        { name: 'Auto-Close', value: opt.autoCloseEnabled ? `✅ ${opt.autoCloseTime}` : '❌ Disabled', inline: true }
      );
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`tomsg_greeting_${optId}`).setLabel('Greeting').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`tomsg_autoclose_${optId}`).setLabel('Auto-Close').setStyle(ButtonStyle.Secondary)
    );
    return interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  if (action === 'remove') {
    const optLabel = opt.label;
    const opts = getOptions(guildId).filter(o => o.id !== optId);
    saveOptions(guildId, opts);
    return interaction.update({ content: `✅ Option **${optLabel}** removed.`, embeds: [], components: [] });
  }

  if (action === 'back') {
    const opts = getOptions(guildId);
    const panels = getPanels(guildId);
    if (opts.length === 0) return interaction.update({ content: 'No options left.', embeds: [], components: [] });
    const selectOptions = opts.slice(0, 25).map(o => {
      const panel = panels.find(p => p.id === o.panelId);
      return new StringSelectMenuOptionBuilder()
        .setLabel(o.label || 'Unnamed Option')
        .setValue(o.id)
        .setDescription(panel ? `Panel: ${panel.name}` : 'No panel');
    });
    const select = new StringSelectMenuBuilder().setCustomId('topt_select').setPlaceholder('Select an option...').addOptions(selectOptions);
    const embed = new EmbedBuilder().setColor(color).setTitle('Ticket Options').setDescription('Select an option to configure:');
    return interaction.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(select)] });
  }

  // Message sub-actions
  if (action === 'greeting') {
    const modal = new ModalBuilder()
      .setCustomId(`tomodal_greeting_${optId}`)
      .setTitle(`Greeting: ${opt.label}`)
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('message').setLabel('Greeting Message').setStyle(TextInputStyle.Paragraph).setValue(opt.greetingMessage || '').setRequired(false).setPlaceholder('Leave blank for default. Supports {ticket.case}, {ticket.author.mention}')
        )
      );
    return interaction.showModal(modal);
  }

  if (action === 'autoclose') {
    const modal = new ModalBuilder()
      .setCustomId(`tomodal_autoclose_${optId}`)
      .setTitle(`Auto-Close: ${opt.label}`)
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('time').setLabel('Time until Auto-Close').setStyle(TextInputStyle.Short).setValue(opt.autoCloseTime || '').setRequired(false).setPlaceholder('e.g. 1m, 2h, 30d. Leave blank to disable.')
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('message').setLabel('Auto-Close Message').setStyle(TextInputStyle.Paragraph).setValue(opt.autoCloseMessage || '').setRequired(false)
        )
      );
    return interaction.showModal(modal);
  }

  if (action === 'toggleclose') {
    const opts = getOptions(guildId);
    const idx = opts.findIndex(o => o.id === optId);
    if (idx !== -1) { opts[idx].ticketCreatorCanClose = !opts[idx].ticketCreatorCanClose; saveOptions(guildId, opts); }
    return interaction.reply({ content: `✅ Ticket Opener Can Close: **${opts[idx] && opts[idx].ticketCreatorCanClose ? 'Enabled' : 'Disabled'}**`, ephemeral: true });
  }

  if (action === 'togglestaffvis') {
    const opts = getOptions(guildId);
    const idx = opts.findIndex(o => o.id === optId);
    if (idx !== -1) { opts[idx].keepStaffVisibleOnClaim = !opts[idx].keepStaffVisibleOnClaim; saveOptions(guildId, opts); }
    return interaction.reply({ content: `✅ Keep Staff Visible On Claim: **${opts[idx] && opts[idx].keepStaffVisibleOnClaim ? 'Enabled' : 'Disabled'}**`, ephemeral: true });
  }

  return interaction.reply({ content: '❌ Unknown option action.', ephemeral: true });
}

async function handleProfileButton(interaction, customId, guildId) {
  const parts = customId.split('_');
  const field = parts[1];
  const userId = parts[2];

  if (interaction.user.id !== userId) return interaction.reply({ content: '❌ Not your profile.', ephemeral: true });

  const fieldLabels = { bio: 'Bio', pronouns: 'Pronouns', timezone: 'Timezone' };
  const modal = new ModalBuilder()
    .setCustomId(`tprofile_modal_${field}_${userId}`)
    .setTitle(`Update ${fieldLabels[field] || field}`)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('value').setLabel(fieldLabels[field] || field).setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(100)
      )
    );
  return interaction.showModal(modal);
}

async function handleFormButton(interaction, customId, guildId) {
  const parts = customId.split('_');
  const action = parts[1];
  const formId = parts[2];
  const forms = getForms(guildId);
  const form = forms.find(f => f.id === formId);
  if (!form) return interaction.reply({ content: '❌ Form not found.', ephemeral: true });

  if (action === 'addfield') {
    const modal = new ModalBuilder()
      .setCustomId(`tform_fieldmodal_${formId}`)
      .setTitle(`Add Field: ${form.name}`)
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('label').setLabel('Field Label').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(45)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('placeholder').setLabel('Placeholder').setStyle(TextInputStyle.Short).setRequired(false)
        )
      );
    return interaction.showModal(modal);
  }

  if (action === 'viewfields') {
    if (!form.fields || form.fields.length === 0) return interaction.reply({ content: 'No fields yet.', ephemeral: true });
    const list = form.fields.map((f, i) => `**${i + 1}.** ${f.label}${f.required ? ' *(required)*' : ''}`).join('\n');
    return interaction.reply({ content: `**Fields in ${form.name}:**\n${list}`, ephemeral: true });
  }

  if (action === 'delete') {
    const newForms = forms.filter(f => f.id !== formId);
    saveForms(guildId, newForms);
    return interaction.update({ content: `✅ Form **${form.name}** deleted.`, embeds: [], components: [] });
  }
}
