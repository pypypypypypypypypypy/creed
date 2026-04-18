const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require('../config.json');
const { warn, deny, approve } = require('../emojis.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'boosterrole',
        description: 'Manage your custom booster role',
        aliases: 'br',
        parameters: 'n/a',
        information: 'NITRO_BOOSTER',
        usage: 'boosterrole',
        example: 'boosterrole'
    },
    {
        name: 'boosterrole create',
        description: 'Create your custom booster role',
        aliases: 'n/a',
        parameters: '(name)',
        information: 'NITRO_BOOSTER',
        usage: 'boosterrole create (name)',
        example: 'boosterrole create name'
    },
    {
        name: 'boosterrole color',
        description: 'Set the color of your booster role',
        aliases: 'n/a',
        parameters: '(hex color)',
        information: 'NITRO_BOOSTER',
        usage: 'boosterrole color (hex color)',
        example: 'boosterrole color hex'
    },
    {
        name: 'boosterrole icon',
        description: 'Set an icon for your booster role',
        aliases: 'n/a',
        parameters: '(emoji)',
        information: 'NITRO_BOOSTER',
        usage: 'boosterrole icon (emoji)',
        example: 'boosterrole icon emoji'
    },
    {
        name: 'boosterrole delete',
        description: 'Delete your booster role',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'NITRO_BOOSTER',
        usage: 'boosterrole delete',
        example: 'boosterrole delete'
    }
],

    name: 'boosterrole',
  aliases: ['br', 'boostercolor'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (!message.member.premiumSince)
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: You must be a **server booster** to use this command.`)] });

    const sub = (args[0] || '').toLowerCase();

    if (sub === 'create') {
      const existingRoleId = db.get(`boosterrole_${message.guild.id}_${message.author.id}`);
      if (existingRoleId && message.guild.roles.cache.has(existingRoleId))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: You already have a booster role.`)] });

      const name = args.slice(1).join(' ') || `${message.author.username}'s role`;

      try {
        const role = await message.guild.roles.create({
          name,
          permissions: [],
          reason: `Booster role for ${message.author.tag}`
        });

        const botRole = message.guild.members.me.roles.highest;
        await role.setPosition(botRole.position - 1).catch(() => {});
        await message.member.roles.add(role);
        db.set(`boosterrole_${message.guild.id}_${message.author.id}`, role.id);

        message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Created your booster role: ${role}`)] });
      } catch (err) {
        message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: Failed to create role: ${err.message}`)] });
      }
      return;
    }

    if (sub === 'color' || sub === 'colour') {
      const roleId = db.get(`boosterrole_${message.guild.id}_${message.author.id}`);
      const role = roleId ? message.guild.roles.cache.get(roleId) : null;
      if (!role)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: You don't have a booster role. Use \`${prefix}boosterrole create\` first.`)] });

      const hex = args[1];
      if (!hex || !/^#?[0-9a-fA-F]{6}$/.test(hex))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Usage: \`${prefix}boosterrole color <hex>\``)] });

      const colorVal = hex.startsWith('#') ? hex : `#${hex}`;
      await role.setColor(colorVal);
      message.channel.send({ embeds: [new EmbedBuilder().setColor(colorVal).setDescription(`${approve} ${message.author}: Updated your booster role color to **${colorVal}**`)] });
      return;
    }

    if (sub === 'rename') {
      const roleId = db.get(`boosterrole_${message.guild.id}_${message.author.id}`);
      const role = roleId ? message.guild.roles.cache.get(roleId) : null;
      if (!role)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: You don't have a booster role.`)] });

      const name = args.slice(1).join(' ');
      if (!name)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Usage: \`${prefix}boosterrole rename <name>\``)] });

      await role.setName(name);
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Renamed your booster role to **${name}**`)] });
      return;
    }

    if (sub === 'icon') {
      const roleId = db.get(`boosterrole_${message.guild.id}_${message.author.id}`);
      const role = roleId ? message.guild.roles.cache.get(roleId) : null;
      if (!role)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: You don't have a booster role.`)] });

      const icon = message.attachments.first()?.url || args[1];
      if (!icon)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Provide an emoji or attachment for the role icon.`)] });

      try {
        await role.setIcon(icon);
        message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Updated your booster role icon.`)] });
      } catch (err) {
        message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: Failed to set icon. The server may need more boosts.`)] });
      }
      return;
    }

    if (sub === 'remove' || sub === 'delete') {
      const roleId = db.get(`boosterrole_${message.guild.id}_${message.author.id}`);
      const role = roleId ? message.guild.roles.cache.get(roleId) : null;
      if (!role)
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(`${deny} ${message.author}: You don't have a booster role.`)] });

      await role.delete('Booster role removed');
      db.delete(`boosterrole_${message.guild.id}_${message.author.id}`);
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Removed your booster role.`)] });
      return;
    }

    if (sub === 'cleanup') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: You're **missing** permission: \`manage_roles\``)] });

      let cleaned = 0;
      const keys = Object.keys(require('../db_data.json') || {}).filter(k => k.startsWith(`boosterrole_${message.guild.id}_`));
      for (const key of keys) {
        const roleId = db.get(key);
        const userId = key.split('_').pop();
        const member = await message.guild.members.fetch(userId).catch(() => null);
        if (!member || !member.premiumSince) {
          const role = message.guild.roles.cache.get(roleId);
          if (role) await role.delete('Booster role cleanup').catch(() => {});
          db.delete(key);
          cleaned++;
        }
      }

      message.channel.send({ embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Cleaned up **${cleaned}** orphaned booster role(s).`)] });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('Command: boosterrole')
      .setDescription('Create and manage your custom booster role.')
      .addFields(
        { name: 'Usage', value: `\`\`\`\n${prefix}boosterrole create [name]\n${prefix}boosterrole color <hex>\n${prefix}boosterrole rename <name>\n${prefix}boosterrole icon <emoji/attachment>\n${prefix}boosterrole remove\n${prefix}boosterrole cleanup\n\`\`\``, inline: false }
      )
      .setFooter({ text: 'Module: utility' })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
