const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const { default_prefix } = require('../config.json');

module.exports = {
  category: 'automod',
  help: [
    {
        name: 'automod',
        description: 'Manage the automod configuration',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'automod',
        example: 'automod'
    },
    {
        name: 'automod enable',
        description: 'Enable automod',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'automod enable',
        example: 'automod enable'
    },
    {
        name: 'automod disable',
        description: 'Disable automod',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'automod disable',
        example: 'automod disable'
    },
    {
        name: 'automod config',
        description: 'View automod settings',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'automod config',
        example: 'automod config'
    }
],

    name: 'automod',

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;
    const sub = args[0]?.toLowerCase();

    if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_guild\``)] });
    }

    const guildId = message.guild.id;

    const helpEmbed = new EmbedBuilder()
      .setColor(color)
      .setTitle('Command: automod')
      .setDescription('Configure automod settings for the server.')
      .addFields(
        { name: 'Subcommands', value: '`enable` `disable` `settings`', inline: false },
        { name: 'Usage', value: `\`\`\`${prefix}automod enable\n${prefix}automod disable\n${prefix}automod settings\`\`\`` }
      )
      .setFooter({ text: 'Module: automod' })
      .setTimestamp();

    if (!sub || !['enable', 'disable', 'settings'].includes(sub)) {
      return message.channel.send({ embeds: [helpEmbed] });
    }

    if (sub === 'enable') {
      db.set(`automod.${guildId}.enabled`, true);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Automod has been **enabled**.`)] });
    }

    if (sub === 'disable') {
      db.set(`automod.${guildId}.enabled`, false);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Automod has been **disabled**.`)] });
    }

    if (sub === 'settings') {
      const enabled = db.get(`automod.${guildId}.enabled`) ?? false;
      const antilink = db.get(`automod.${guildId}.antilink`) ?? false;
      const antispam = db.get(`automod.${guildId}.antispam`) ?? false;
      const antiinvite = db.get(`automod.${guildId}.antiinvite`) ?? false;

      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`Automod Settings — ${message.guild.name}`)
        .addFields(
          { name: 'Automod', value: enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'Anti-Link', value: antilink ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'Anti-Spam', value: antispam ? '✅ Enabled' : '❌ Disabled', inline: true },
          { name: 'Anti-Invite', value: antiinvite ? '✅ Enabled' : '❌ Disabled', inline: true }
        )
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    }
  }
};
