const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const emojis = require('../emojis.json');
const { paginate } = require('../utils/paginate');

function getOwner(guildId, channelId) {
  return db.get(`vm_owner_${guildId}_${channelId}`);
}

function setOwner(guildId, channelId, userId) {
  db.set(`vm_owner_${guildId}_${channelId}`, userId);
}

function deleteOwner(guildId, channelId) {
  db.delete(`vm_owner_${guildId}_${channelId}`);
}

function getVmChannel(guildId) {
  return db.get(`vm_channel_${guildId}`);
}

function getVmCategory(guildId) {
  return db.get(`vm_category_${guildId}`);
}

function getVmTextChannel(guildId) {
  return db.get(`vm_text_${guildId}`);
}

function isVmChannel(guildId, channelId) {
  const owned = db.get(`vm_owner_${guildId}_${channelId}`);
  return owned !== null;
}

function getUserVcChannel(member) {
  return member.voice.channel;
}

function isChannelOwner(guildId, channelId, userId) {
  return getOwner(guildId, channelId) === userId;
}

function errEmbed(text) {
  return new EmbedBuilder().setColor('#efa23a').setDescription(`${emojis.warn} ${text}`);
}

function okEmbed(text) {
  return new EmbedBuilder().setColor('#a3eb7b').setDescription(`${emojis.approve} ${text}`);
}

// Parse emoji string from emojis.json into a setEmoji()-compatible value.
// Handles both <:name:id> custom emojis and plain Unicode.
function parseEmoji(str) {
  const custom = str.match(/^<a?:(\w+):(\d+)>$/);
  if (custom) return { name: custom[1], id: custom[2] };
  return str;
}

function getEmojis() {
  // Always re-read so syncemojis changes take effect without restart
  delete require.cache[require.resolve('../emojis.json')];
  return require('../emojis.json');
}

function buildInterface(client, prefix) {
  const e = getEmojis();
  const link = 'https://discord.gg/4H5aVdKhNx';

  const embed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: 'Creed', iconURL: client.user.displayAvatarURL(), url: link })
    .setThumbnail(client.user.displayAvatarURL({ size: 2048 }))
    .setTitle('VoiceMaster Interface')
    .setDescription('Click the buttons below to control your voice channel')
    .addFields({
      name: 'Button Usage',
      value: [
        `${e.vm_lock} — [\`Lock\`](${link}) the voice channel`,
        `${e.vm_unlock} — [\`Unlock\`](${link}) the voice channel`,
        `${e.vm_ghost} — [\`Ghost\`](${link}) the voice channel`,
        `${e.vm_reveal} — [\`Reveal\`](${link}) the voice channel`,
        `${e.vm_claim} — [\`Claim\`](${link}) the voice channel`,
        `${e.vm_disconnect} — [\`Disconnect\`](${link}) a member`,
        `${e.vm_activity} — [\`Start\`](${link}) an activity`,
        `${e.vm_info} — [\`View\`](${link}) channel information`,
        `${e.vm_increase} — [\`Increase\`](${link}) the user limit`,
        `${e.vm_decrease} — [\`Decrease\`](${link}) the user limit`,
      ].join('\n'),
    });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vm_lock').setEmoji(parseEmoji(e.vm_lock)).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_unlock').setEmoji(parseEmoji(e.vm_unlock)).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_ghost').setEmoji(parseEmoji(e.vm_ghost)).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_reveal').setEmoji(parseEmoji(e.vm_reveal)).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_claim').setEmoji(parseEmoji(e.vm_claim)).setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vm_disconnect').setEmoji(parseEmoji(e.vm_disconnect)).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_activity').setEmoji(parseEmoji(e.vm_activity)).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_info').setEmoji(parseEmoji(e.vm_info)).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_increase').setEmoji(parseEmoji(e.vm_increase)).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('vm_decrease').setEmoji(parseEmoji(e.vm_decrease)).setStyle(ButtonStyle.Secondary)
  );

  return { embed, rows: [row1, row2] };
}

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'voicemaster',
        description: 'Manage the voice channel creation system',
        aliases: 'vm, vc',
        parameters: 'n/a',
        information: 'MANAGE_CHANNELS',
        usage: 'voicemaster',
        example: 'voicemaster'
    },
    {
        name: 'voicemaster setup',
        description: 'Set up the voicemaster hub',
        aliases: 'n/a',
        parameters: '(channel)',
        information: 'MANAGE_CHANNELS',
        usage: 'voicemaster setup (channel)',
        example: 'voicemaster setup channel'
    },
    {
        name: 'voicemaster reset',
        description: 'Reset the voicemaster',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_CHANNELS',
        usage: 'voicemaster reset',
        example: 'voicemaster reset'
    },
    {
        name: 'voicemaster lock',
        description: 'Lock your voice channel',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_CHANNELS',
        usage: 'voicemaster lock',
        example: 'voicemaster lock'
    },
    {
        name: 'voicemaster unlock',
        description: 'Unlock your voice channel',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_CHANNELS',
        usage: 'voicemaster unlock',
        example: 'voicemaster unlock'
    },
    {
        name: 'voicemaster limit',
        description: 'Set user limit for your voice channel',
        aliases: 'n/a',
        parameters: '(number)',
        information: 'MANAGE_CHANNELS',
        usage: 'voicemaster limit (number)',
        example: 'voicemaster limit number'
    },
    {
        name: 'voicemaster rename',
        description: 'Rename your voice channel',
        aliases: 'n/a',
        parameters: '(name)',
        information: 'MANAGE_CHANNELS',
        usage: 'voicemaster rename (name)',
        example: 'voicemaster rename name'
    },
    {
        name: 'voicemaster kick',
        description: 'Kick a user from your voice channel',
        aliases: 'n/a',
        parameters: '(user)',
        information: 'MANAGE_CHANNELS',
        usage: 'voicemaster kick (user)',
        example: 'voicemaster kick user'
    }
],

    name: 'voicemaster',
  aliases: ['vm', 'vc'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`);
    if (prefix === null) prefix = default_prefix;

    const sub = args[0]?.toLowerCase();

    if (!sub) {
      return paginate(message, [
        {
          name: 'voicemaster',
          description: 'Manage the VoiceMaster system for your server',
          aliases: 'vm, vc',
          parameters: 'n/a',
          information: 'None',
          usage: `${prefix}voicemaster`,
          example: `${prefix}voicemaster`
        },
        {
          name: 'voicemaster setup',
          description: 'Setup the voicemaster interface in the current channel',
          aliases: 'n/a',
          parameters: 'n/a',
          information: 'Manage Channels, Manage Roles, Send Messages',
          usage: `${prefix}voicemaster setup`,
          example: `${prefix}voicemaster setup`
        },
        {
          name: 'voicemaster sendinterface',
          description: 'Forcefully resend the VoiceMaster interface',
          aliases: 'n/a',
          parameters: 'n/a',
          information: 'Send Messages',
          usage: `${prefix}voicemaster sendinterface`,
          example: `${prefix}voicemaster sendinterface`
        },
        {
          name: 'voicemaster lock',
          description: 'Lock your voice channel',
          aliases: 'n/a',
          parameters: 'n/a',
          information: 'Manage Channels',
          usage: `${prefix}voicemaster lock`,
          example: `${prefix}voicemaster lock`
        },
        {
          name: 'voicemaster unlock',
          description: 'Unlock your voice channel',
          aliases: 'n/a',
          parameters: 'n/a',
          information: 'Manage Channels',
          usage: `${prefix}voicemaster unlock`,
          example: `${prefix}voicemaster unlock`
        },
        {
          name: 'voicemaster hide',
          description: 'Hide your voice channel',
          aliases: 'n/a',
          parameters: 'n/a',
          information: 'Manage Channels',
          usage: `${prefix}voicemaster hide`,
          example: `${prefix}voicemaster hide`
        },
        {
          name: 'voicemaster reveal',
          description: 'Reveal your hidden voice channel',
          aliases: 'n/a',
          parameters: 'n/a',
          information: 'Manage Channels',
          usage: `${prefix}voicemaster reveal`,
          example: `${prefix}voicemaster reveal`
        },
        {
          name: 'voicemaster claim',
          description: 'Claim an unclaimed voice channel',
          aliases: 'n/a',
          parameters: 'n/a',
          information: 'Manage Channels',
          usage: `${prefix}voicemaster claim`,
          example: `${prefix}voicemaster claim`
        },
        {
          name: 'voicemaster rename',
          description: 'Rename your voice channel',
          aliases: 'n/a',
          parameters: '[name]',
          information: 'Manage Channels',
          usage: `${prefix}voicemaster rename <name>`,
          example: `${prefix}voicemaster rename chill zone`
        },
        {
          name: 'voicemaster limit',
          description: 'Set the user limit for your voice channel',
          aliases: 'n/a',
          parameters: '[limit]',
          information: 'Manage Channels',
          usage: `${prefix}voicemaster limit <number>`,
          example: `${prefix}voicemaster limit 5`
        },
        {
          name: 'voicemaster bitrate',
          description: 'Change the bitrate of your current voice channel',
          aliases: 'n/a',
          parameters: '[bitrate]',
          information: 'Manage Channels',
          usage: `${prefix}voicemaster bitrate <kbps>`,
          example: `${prefix}voicemaster bitrate 96`
        },
        {
          name: 'voicemaster region',
          description: 'Change the region of your current voice channel',
          aliases: 'n/a',
          parameters: '[region]',
          information: 'Manage Channels',
          usage: `${prefix}voicemaster region <region>`,
          example: `${prefix}voicemaster region us-west`
        },
        {
          name: 'voicemaster status',
          description: 'Set the voice status for your current voice channel',
          aliases: 'n/a',
          parameters: '[status]',
          information: 'Manage Channels',
          usage: `${prefix}voicemaster status <text>`,
          example: `${prefix}voicemaster status gaming vibes`
        },
        {
          name: 'voicemaster permit',
          description: 'Permit a user to access your voice channel',
          aliases: 'n/a',
          parameters: '[user]',
          information: 'Manage Channels',
          usage: `${prefix}voicemaster permit @user`,
          example: `${prefix}voicemaster permit @john`
        },
        {
          name: 'voicemaster reject',
          description: 'Reject a user from accessing your voice channel',
          aliases: 'n/a',
          parameters: '[user]',
          information: 'Manage Channels',
          usage: `${prefix}voicemaster reject @user`,
          example: `${prefix}voicemaster reject @john`
        },
        {
          name: 'voicemaster drag',
          description: 'Drag a user into your voice channel',
          aliases: 'n/a',
          parameters: '[user]',
          information: 'Manage Channels',
          usage: `${prefix}voicemaster drag @user`,
          example: `${prefix}voicemaster drag @john`
        },
        {
          name: 'voicemaster delete',
          description: 'Delete your voice channel',
          aliases: 'n/a',
          parameters: 'n/a',
          information: 'Manage Channels',
          usage: `${prefix}voicemaster delete`,
          example: `${prefix}voicemaster delete`
        },
        {
          name: 'voicemaster information',
          description: 'View information about your voice channel',
          aliases: 'n/a',
          parameters: 'n/a',
          information: 'None',
          usage: `${prefix}voicemaster information`,
          example: `${prefix}voicemaster information`
        },
        {
          name: 'voicemaster temporary',
          description: 'Toggle temporary voice channels that auto-delete when empty',
          aliases: 'n/a',
          parameters: 'n/a',
          information: 'None',
          usage: `${prefix}voicemaster temporary`,
          example: `${prefix}voicemaster temporary`
        },
        {
          name: 'voicemaster reset',
          description: 'Reset the voicemaster interface',
          aliases: 'n/a',
          parameters: 'n/a',
          information: 'None',
          usage: `${prefix}voicemaster reset`,
          example: `${prefix}voicemaster reset`
        },
        {
          name: 'voicemaster joinrole',
          description: 'Set a role that members get when joining any VoiceMaster channel',
          aliases: 'n/a',
          parameters: '[role]',
          information: 'Manage Roles',
          usage: `${prefix}voicemaster joinrole @role`,
          example: `${prefix}voicemaster joinrole @In Voice`
        },
        {
          name: 'voicemaster default interface',
          description: 'Configure the default VoiceMaster interface state',
          aliases: 'n/a',
          parameters: '[state]',
          information: 'None',
          usage: `${prefix}voicemaster default interface <state>`,
          example: `${prefix}voicemaster default interface enable`
        },
        {
          name: 'voicemaster default region',
          description: 'Set the default region for VoiceMaster channels',
          aliases: 'n/a',
          parameters: '[region]',
          information: 'None',
          usage: `${prefix}voicemaster default region <region>`,
          example: `${prefix}voicemaster default region us-east`
        },
        {
          name: 'voicemaster default role',
          description: 'Set the default role for VoiceMaster channels',
          aliases: 'n/a',
          parameters: '[role]',
          information: 'None',
          usage: `${prefix}voicemaster default role @role`,
          example: `${prefix}voicemaster default role @Member`
        },
        {
          name: 'voicemaster default bitrate',
          description: 'Set the default bitrate for VoiceMaster channels',
          aliases: 'n/a',
          parameters: '[bitrate]',
          information: 'None',
          usage: `${prefix}voicemaster default bitrate <kbps>`,
          example: `${prefix}voicemaster default bitrate 64`
        },
        {
          name: 'voicemaster default name',
          description: 'Set the default name template for VoiceMaster channels',
          aliases: 'n/a',
          parameters: '[template]',
          information: 'None',
          usage: `${prefix}voicemaster default name <template>`,
          example: `${prefix}voicemaster default name {user}'s channel`
        },
        {
          name: 'voicemaster add',
          description: 'Add a secondary join-to-create channel (Premium)',
          aliases: 'n/a',
          parameters: '[name]',
          information: 'Manage Channels',
          usage: `${prefix}voicemaster add <name>`,
          example: `${prefix}voicemaster add gaming`
        },
        {
          name: 'voicemaster remove',
          description: 'Remove a secondary join-to-create channel (Premium)',
          aliases: 'n/a',
          parameters: '[vc id]',
          information: 'None',
          usage: `${prefix}voicemaster remove <vc_id>`,
          example: `${prefix}voicemaster remove 123456789`
        },
        {
          name: 'voicemaster list',
          description: 'List all secondary join-to-create channels (Premium)',
          aliases: 'n/a',
          parameters: 'None',
          information: 'None',
          usage: `${prefix}voicemaster list`,
          example: `${prefix}voicemaster list`
        },
        {
          name: 'voicemaster category',
          description: 'Set the category for a secondary join-to-create channel (Premium)',
          aliases: 'n/a',
          parameters: '[vc id] [category id]',
          information: 'None',
          usage: `${prefix}voicemaster category <vc_id> <category_id>`,
          example: `${prefix}voicemaster category 123456 789012`
        },
      ], 'voicemaster');
    }

    async function requireOwnerInVc(member, guild) {
      const vc = getUserVcChannel(member);
      if (!vc) return { error: `${message.author}: You must be in a **voice channel** to use this command` };
      if (!isVmChannel(guild.id, vc.id)) return { error: `${message.author}: That channel is not a **VoiceMaster** channel` };
      if (!isChannelOwner(guild.id, vc.id, member.id)) return { error: `${message.author}: You are not the **owner** of this channel` };
      return { vc };
    }

    if (sub === 'setup') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return message.channel.send({ embeds: [errEmbed(`${message.author}: You're missing permission: [manage_channels](https://discord.com)`)] });
      }

      const category = await message.guild.channels.create({
        name: 'voicemaster',
        type: ChannelType.GuildCategory,
      }).catch(() => null);

      if (!category) {
        return message.channel.send({ embeds: [errEmbed(`${message.author}: Failed to create the **voicemaster** category`)] });
      }

      const menuChannel = await message.guild.channels.create({
        name: 'menu',
        type: ChannelType.GuildText,
        parent: category.id,
      }).catch(() => null);

      const jtcChannel = await message.guild.channels.create({
        name: 'Join to create',
        type: ChannelType.GuildVoice,
        parent: category.id,
      }).catch(() => null);

      if (!menuChannel || !jtcChannel) {
        return message.channel.send({ embeds: [errEmbed(`${message.author}: Failed to create the voicemaster channels`)] });
      }

      db.set(`vm_interface_channel_${message.guild.id}`, menuChannel.id);
      db.set(`vm_join_channel_${message.guild.id}`, jtcChannel.id);

      const { embed, rows } = buildInterface(client, prefix);
      await menuChannel.send({ embeds: [embed], components: rows });

      return message.channel.send({ embeds: [okEmbed(`${message.author}: VoiceMaster has been set up`)] });
    }

    if (sub === 'sendinterface') {
      if (!message.member.permissions.has(PermissionFlagsBits.SendMessages)) {
        return message.channel.send({ embeds: [errEmbed(`${message.author}: You're missing permission: [send_messages](https://discord.com)`)] });
      }
      const { embed, rows } = buildInterface(client, prefix);
      await message.channel.send({ embeds: [embed], components: rows });
      db.set(`vm_interface_channel_${message.guild.id}`, message.channel.id);
      return message.channel.send({ embeds: [okEmbed(`${message.author}: VoiceMaster interface has been resent`)] });
    }

    if (sub === 'lock') {
      const { vc, error } = await requireOwnerInVc(message.member, message.guild);
      if (error) return message.channel.send({ embeds: [errEmbed(error)] });
      await vc.permissionOverwrites.edit(message.guild.id, { Connect: false }).catch(() => {});
      return message.channel.send({ embeds: [okEmbed(`${message.author}: Your voice channel has been **locked**`)] });
    }

    if (sub === 'unlock') {
      const { vc, error } = await requireOwnerInVc(message.member, message.guild);
      if (error) return message.channel.send({ embeds: [errEmbed(error)] });
      await vc.permissionOverwrites.edit(message.guild.id, { Connect: true }).catch(() => {});
      return message.channel.send({ embeds: [okEmbed(`${message.author}: Your voice channel has been **unlocked**`)] });
    }

    if (sub === 'hide' || sub === 'ghost') {
      const { vc, error } = await requireOwnerInVc(message.member, message.guild);
      if (error) return message.channel.send({ embeds: [errEmbed(error)] });
      await vc.permissionOverwrites.edit(message.guild.id, { ViewChannel: false }).catch(() => {});
      return message.channel.send({ embeds: [okEmbed(`${message.author}: Your voice channel has been **hidden**`)] });
    }

    if (sub === 'reveal') {
      const { vc, error } = await requireOwnerInVc(message.member, message.guild);
      if (error) return message.channel.send({ embeds: [errEmbed(error)] });
      await vc.permissionOverwrites.edit(message.guild.id, { ViewChannel: true }).catch(() => {});
      return message.channel.send({ embeds: [okEmbed(`${message.author}: Your voice channel has been **revealed**`)] });
    }

    if (sub === 'claim') {
      const vc = getUserVcChannel(message.member);
      if (!vc) return message.channel.send({ embeds: [errEmbed(`${message.author}: You must be in a **voice channel** to use this command`)] });
      if (!isVmChannel(message.guild.id, vc.id)) return message.channel.send({ embeds: [errEmbed(`${message.author}: That channel is not a **VoiceMaster** channel`)] });
      const currentOwner = getOwner(message.guild.id, vc.id);
      if (currentOwner === message.author.id) return message.channel.send({ embeds: [errEmbed(`${message.author}: You already **own** this channel`)] });
      const ownerInChannel = vc.members.has(currentOwner);
      if (ownerInChannel) return message.channel.send({ embeds: [errEmbed(`${message.author}: The channel owner is still **in the channel**`)] });
      setOwner(message.guild.id, vc.id, message.author.id);
      return message.channel.send({ embeds: [okEmbed(`${message.author}: You have **claimed** this voice channel`)] });
    }

    if (sub === 'rename') {
      const { vc, error } = await requireOwnerInVc(message.member, message.guild);
      if (error) return message.channel.send({ embeds: [errEmbed(error)] });
      const newName = args.slice(1).join(' ');
      if (!newName) return message.channel.send({ embeds: [errEmbed(`${message.author}: Please provide a **name** for the channel`)] });
      await vc.setName(newName).catch(() => {});
      return message.channel.send({ embeds: [okEmbed(`${message.author}: Your voice channel has been renamed to **${newName}**`)] });
    }

    if (sub === 'limit') {
      const { vc, error } = await requireOwnerInVc(message.member, message.guild);
      if (error) return message.channel.send({ embeds: [errEmbed(error)] });
      const limit = parseInt(args[1]);
      if (isNaN(limit) || limit < 0 || limit > 99) return message.channel.send({ embeds: [errEmbed(`${message.author}: Please provide a valid limit **0–99**`)] });
      await vc.setUserLimit(limit).catch(() => {});
      return message.channel.send({ embeds: [okEmbed(`${message.author}: User limit set to **${limit === 0 ? 'unlimited' : limit}**`)] });
    }

    if (sub === 'bitrate') {
      const { vc, error } = await requireOwnerInVc(message.member, message.guild);
      if (error) return message.channel.send({ embeds: [errEmbed(error)] });
      const kbps = parseInt(args[1]);
      if (isNaN(kbps) || kbps < 8 || kbps > 384) return message.channel.send({ embeds: [errEmbed(`${message.author}: Please provide a valid bitrate **8–384 kbps**`)] });
      await vc.setBitrate(kbps * 1000).catch(() => {});
      return message.channel.send({ embeds: [okEmbed(`${message.author}: Bitrate set to **${kbps}kbps**`)] });
    }

    if (sub === 'region') {
      const { vc, error } = await requireOwnerInVc(message.member, message.guild);
      if (error) return message.channel.send({ embeds: [errEmbed(error)] });
      const region = args[1]?.toLowerCase() || null;
      const validRegions = ['brazil', 'europe', 'hongkong', 'india', 'japan', 'rotterdam', 'russia', 'singapore', 'southafrica', 'sydney', 'us-central', 'us-east', 'us-south', 'us-west', 'automatic'];
      if (region && region !== 'automatic' && !validRegions.includes(region)) {
        return message.channel.send({ embeds: [errEmbed(`${message.author}: Invalid region. Valid: \`${validRegions.join('`, `')}\``)] });
      }
      await vc.setRTCRegion(region === 'automatic' ? null : region).catch(() => {});
      return message.channel.send({ embeds: [okEmbed(`${message.author}: Region set to **${region || 'automatic'}**`)] });
    }

    if (sub === 'status') {
      const { vc, error } = await requireOwnerInVc(message.member, message.guild);
      if (error) return message.channel.send({ embeds: [errEmbed(error)] });
      const status = args.slice(1).join(' ');
      if (!status) return message.channel.send({ embeds: [errEmbed(`${message.author}: Please provide a **status** for the channel`)] });
      await vc.setStatus(status).catch(() => {});
      return message.channel.send({ embeds: [okEmbed(`${message.author}: Voice channel status set to **${status}**`)] });
    }

    if (sub === 'permit') {
      const { vc, error } = await requireOwnerInVc(message.member, message.guild);
      if (error) return message.channel.send({ embeds: [errEmbed(error)] });
      const target = message.mentions.members.first();
      if (!target) return message.channel.send({ embeds: [errEmbed(`${message.author}: Please mention a **user** to permit`)] });
      await vc.permissionOverwrites.edit(target.id, { Connect: true, ViewChannel: true }).catch(() => {});
      return message.channel.send({ embeds: [okEmbed(`${message.author}: ${target} has been **permitted** to join your channel`)] });
    }

    if (sub === 'reject') {
      const { vc, error } = await requireOwnerInVc(message.member, message.guild);
      if (error) return message.channel.send({ embeds: [errEmbed(error)] });
      const target = message.mentions.members.first();
      if (!target) return message.channel.send({ embeds: [errEmbed(`${message.author}: Please mention a **user** to reject`)] });
      if (target.id === message.author.id) return message.channel.send({ embeds: [errEmbed(`${message.author}: You cannot reject **yourself**`)] });
      await vc.permissionOverwrites.edit(target.id, { Connect: false, ViewChannel: false }).catch(() => {});
      if (vc.members.has(target.id)) {
        await target.voice.setChannel(null).catch(() => {});
      }
      return message.channel.send({ embeds: [okEmbed(`${message.author}: ${target} has been **rejected** from your channel`)] });
    }

    if (sub === 'drag') {
      const { vc, error } = await requireOwnerInVc(message.member, message.guild);
      if (error) return message.channel.send({ embeds: [errEmbed(error)] });
      const target = message.mentions.members.first();
      if (!target) return message.channel.send({ embeds: [errEmbed(`${message.author}: Please mention a **user** to drag`)] });
      if (!target.voice.channel) return message.channel.send({ embeds: [errEmbed(`${message.author}: That user is not in a **voice channel**`)] });
      await target.voice.setChannel(vc).catch(() => {});
      return message.channel.send({ embeds: [okEmbed(`${message.author}: ${target} has been **dragged** into your channel`)] });
    }

    if (sub === 'delete') {
      const { vc, error } = await requireOwnerInVc(message.member, message.guild);
      if (error) return message.channel.send({ embeds: [errEmbed(error)] });
      deleteOwner(message.guild.id, vc.id);
      await message.channel.send({ embeds: [okEmbed(`${message.author}: Your voice channel is being **deleted**`)] });
      await vc.delete().catch(() => {});
      return;
    }

    if (sub === 'information') {
      const vc = getUserVcChannel(message.member);
      if (!vc) return message.channel.send({ embeds: [errEmbed(`${message.author}: You must be in a **voice channel**`)] });
      const ownerId = getOwner(message.guild.id, vc.id);
      const owner = ownerId ? await message.guild.members.fetch(ownerId).catch(() => null) : null;
      const perms = vc.permissionOverwrites.cache.get(message.guild.id);
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
      return message.channel.send({ embeds: [infoEmbed] });
    }

    if (sub === 'temporary') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return message.channel.send({ embeds: [errEmbed(`${message.author}: You're missing permission: [manage_channels](https://discord.com)`)] });
      }
      const key = `vm_temporary_${message.guild.id}`;
      const current = db.get(key);
      db.set(key, !current);
      return message.channel.send({ embeds: [okEmbed(`${message.author}: Temporary voice channels are now **${!current ? 'enabled' : 'disabled'}**`)] });
    }

    if (sub === 'reset') {
      const vc = getUserVcChannel(message.member);
      if (!vc) return message.channel.send({ embeds: [errEmbed(`${message.author}: You must be in a **voice channel**`)] });
      if (!isVmChannel(message.guild.id, vc.id)) return message.channel.send({ embeds: [errEmbed(`${message.author}: That is not a **VoiceMaster** channel`)] });
      if (!isChannelOwner(message.guild.id, vc.id, message.author.id)) return message.channel.send({ embeds: [errEmbed(`${message.author}: You are not the **owner** of this channel`)] });
      await vc.permissionOverwrites.set([
        { id: message.guild.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] }
      ]).catch(() => {});
      await vc.setName(`${message.member.user.username}'s channel`).catch(() => {});
      await vc.setUserLimit(0).catch(() => {});
      return message.channel.send({ embeds: [okEmbed(`${message.author}: Your voice channel has been **reset**`)] });
    }

    if (sub === 'joinrole') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return message.channel.send({ embeds: [errEmbed(`${message.author}: You're missing permission: [manage_roles](https://discord.com)`)] });
      }
      const role = message.mentions.roles.first();
      if (!role) {
        const current = db.get(`vm_joinrole_${message.guild.id}`);
        if (current) {
          db.delete(`vm_joinrole_${message.guild.id}`);
          return message.channel.send({ embeds: [okEmbed(`${message.author}: VoiceMaster join role has been **cleared**`)] });
        }
        return message.channel.send({ embeds: [errEmbed(`${message.author}: Please mention a **role** to set as the join role`)] });
      }
      db.set(`vm_joinrole_${message.guild.id}`, role.id);
      return message.channel.send({ embeds: [okEmbed(`${message.author}: VoiceMaster join role set to ${role}`)] });
    }

    if (sub === 'default') {
      const defaultSub = args[1]?.toLowerCase();
      if (!defaultSub) return message.channel.send({ embeds: [errEmbed(`${message.author}: Please specify a **default** option: [interface](https://discord.com), [region](https://discord.com), [role](https://discord.com), [bitrate](https://discord.com), [name](https://discord.com)`)] });

      if (defaultSub === 'interface') {
        const state = args[2]?.toLowerCase();
        if (!['enable', 'disable'].includes(state)) return message.channel.send({ embeds: [errEmbed(`${message.author}: Please specify [enable](https://discord.com) or [disable](https://discord.com)`)] });
        db.set(`vm_default_interface_${message.guild.id}`, state === 'enable');
        return message.channel.send({ embeds: [okEmbed(`${message.author}: Default interface is now **${state}d**`)] });
      }

      if (defaultSub === 'region') {
        const region = args[2]?.toLowerCase() || null;
        db.set(`vm_default_region_${message.guild.id}`, region);
        return message.channel.send({ embeds: [okEmbed(`${message.author}: Default region set to **${region || 'automatic'}**`)] });
      }

      if (defaultSub === 'role') {
        const role = message.mentions.roles.first();
        if (!role) return message.channel.send({ embeds: [errEmbed(`${message.author}: Please mention a **role**`)] });
        db.set(`vm_default_role_${message.guild.id}`, role.id);
        return message.channel.send({ embeds: [okEmbed(`${message.author}: Default role set to ${role}`)] });
      }

      if (defaultSub === 'bitrate') {
        const kbps = parseInt(args[2]);
        if (isNaN(kbps) || kbps < 8 || kbps > 384) return message.channel.send({ embeds: [errEmbed(`${message.author}: Please provide a valid bitrate **8–384 kbps**`)] });
        db.set(`vm_default_bitrate_${message.guild.id}`, kbps * 1000);
        return message.channel.send({ embeds: [okEmbed(`${message.author}: Default bitrate set to **${kbps}kbps**`)] });
      }

      if (defaultSub === 'name') {
        const template = args.slice(2).join(' ');
        if (!template) return message.channel.send({ embeds: [errEmbed(`${message.author}: Please provide a **name template**`)] });
        db.set(`vm_default_name_${message.guild.id}`, template);
        return message.channel.send({ embeds: [okEmbed(`${message.author}: Default name template set to **${template}**`)] });
      }

      return message.channel.send({ embeds: [errEmbed(`${message.author}: Invalid default option. Use: [interface](https://discord.com), [region](https://discord.com), [role](https://discord.com), [bitrate](https://discord.com), [name](https://discord.com)`)] });
    }

    if (sub === 'add') {
      return message.channel.send({ embeds: [errEmbed(`${message.author}: This is a **Premium** feature`)] });
    }

    if (sub === 'remove') {
      return message.channel.send({ embeds: [errEmbed(`${message.author}: This is a **Premium** feature`)] });
    }

    if (sub === 'list') {
      return message.channel.send({ embeds: [errEmbed(`${message.author}: This is a **Premium** feature`)] });
    }

    if (sub === 'category') {
      return message.channel.send({ embeds: [errEmbed(`${message.author}: This is a **Premium** feature`)] });
    }

    return message.channel.send({ embeds: [errEmbed(`${message.author}: Unknown subcommand. Use [${prefix}voicemaster](https://discord.com) for a list of commands`)] });
  },
};

module.exports.getOwner = getOwner;
module.exports.setOwner = setOwner;
module.exports.deleteOwner = deleteOwner;
module.exports.isVmChannel = isVmChannel;
module.exports.buildInterface = buildInterface;
module.exports.errEmbed = errEmbed;
module.exports.okEmbed = okEmbed;
