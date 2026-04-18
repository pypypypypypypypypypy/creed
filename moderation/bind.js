const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn, deny, approve } = require('../emojis.json');

module.exports = {
  category: 'moderation',
  help: [
    {
        name: 'bind',
        description: 'Bind commands to a specific channel',
        aliases: 'n/a',
        parameters: '(channel)',
        information: 'MANAGE_GUILD',
        usage: 'bind (channel)',
        example: 'bind channel'
    },
    {
        name: 'bind add',
        description: 'Bind a command to a channel',
        aliases: 'n/a',
        parameters: '(command) (channel)',
        information: 'MANAGE_GUILD',
        usage: 'bind add (command) (channel)',
        example: 'bind add command'
    },
    {
        name: 'bind remove',
        description: 'Remove a command binding',
        aliases: 'n/a',
        parameters: '(command)',
        information: 'MANAGE_GUILD',
        usage: 'bind remove (command)',
        example: 'bind remove command'
    },
    {
        name: 'bind list',
        description: 'List all command bindings',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'bind list',
        example: 'bind list'
    },
    {
        name: 'bind reset',
        description: 'Reset all command bindings',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'MANAGE_GUILD',
        usage: 'bind reset',
        example: 'bind reset'
    }
],

    name: 'bind',
  aliases: ['staffbind'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.permissions.has(PermissionFlagsBits.Administrator))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`administrator\``)] });

    const sub = (args[0] || '').toLowerCase();

    if (sub === 'staff') {
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
      if (!role)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Usage: \`${prefix}bind staff <@role>\``)] });

      const staffRoles = db.get(`staff_roles_${message.guild.id}`) || [];

      if (staffRoles.includes(role.id))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: ${role} is already bound as a **staff** role.`)] });

      staffRoles.push(role.id);
      db.set(`staff_roles_${message.guild.id}`, staffRoles);

      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: ${role} has been bound as a **staff** role.`)] });
    }

    if (sub === 'list') {
      const staffRoles = db.get(`staff_roles_${message.guild.id}`) || [];
      if (staffRoles.length === 0)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: No staff roles are bound.`)] });

      const roleList = staffRoles.map(id => `<@&${id}>`).join('\n');
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('Staff Roles').setDescription(roleList)] });
    }

    if (sub === 'remove') {
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
      if (!role)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Usage: \`${prefix}bind remove <@role>\``)] });

      let staffRoles = db.get(`staff_roles_${message.guild.id}`) || [];
      staffRoles = staffRoles.filter(id => id !== role.id);
      db.set(`staff_roles_${message.guild.id}`, staffRoles);

      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: ${role} has been **removed** from staff roles.`)] });
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('Command: bind')
      .setDescription('Bind roles as staff for moderation identification.')
      .addFields(
        { name: 'Usage', value: `\`\`\`\n${prefix}bind staff <@role>\n${prefix}bind remove <@role>\n${prefix}bind list\n\`\`\``, inline: false }
      )
      .setFooter({ text: 'Module: moderation' })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
