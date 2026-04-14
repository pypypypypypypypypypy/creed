const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const db = require('../db');
const { color } = require('../config.json');
const { warn, approve, deny } = require('../emojis.json');
const { fmt, isEnabled, getWallet, setWallet, hasAccount, openAccount } = require('./utils');

module.exports = {
  category: 'economy',
  help: [
    {
        name: 'shop',
        description: 'Browse the item shop',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'shop',
        example: 'shop'
    }
],

    name: 'shop',

  run: async (client, message, args) => {
    if (!isEnabled(message.guild.id)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: The economy system is **disabled** in this server.`)] });

    const guildId = message.guild.id;
    const sub = (args[0] || '').toLowerCase();

    if (sub === 'add') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You need **Manage Server** permission.`)] });

      const name = args[1];
      const price = parseInt(args[2]);
      if (!name || isNaN(price) || price <= 0) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Usage: \`shop add <name> <price> [role] [description]\``)] });

      const roleArg = message.mentions.roles.first() || message.guild.roles.cache.get(args[3]);
      const description = args.slice(roleArg ? 4 : 3).join(' ') || null;

      const shop = db.get(`economy.${guildId}.shop`) || [];
      if (shop.find(i => i.name.toLowerCase() === name.toLowerCase())) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: An item called **${name}** already exists.`)] });

      shop.push({ name, price, roleId: roleArg ? roleArg.id : null, description });
      db.set(`economy.${guildId}.shop`, shop);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Added **${name}** to the shop for **${fmt(price)}**.`)] });
    }

    if (sub === 'remove') {
      if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: You need **Manage Server** permission.`)] });

      const name = args.slice(1).join(' ');
      if (!name) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Please provide the item name to remove.`)] });

      const shop = db.get(`economy.${guildId}.shop`) || [];
      const idx = shop.findIndex(i => i.name.toLowerCase() === name.toLowerCase());
      if (idx === -1) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: Item **${name}** not found in the shop.`)] });

      shop.splice(idx, 1);
      db.set(`economy.${guildId}.shop`, shop);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${approve} ${message.author}: Removed **${name}** from the shop.`)] });
    }

    if (sub === 'buy') {
      const userId = message.author.id;
      if (!hasAccount(guildId, userId)) openAccount(guildId, userId);

      const shop = db.get(`economy.${guildId}.shop`) || [];
      if (!shop.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} ${message.author}: The shop is currently empty.`)] });

      const options = shop.map(i => ({ label: i.name, description: i.description ? i.description.slice(0, 100) : `Price: ${fmt(i.price)}`, value: i.name }));
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('shop_buy_select').setPlaceholder('Select an item to buy…').addOptions(options)
      );

      const msg = await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setTitle('🛒 Shop — Buy').setDescription(shop.map(i => `**${i.name}** — ${fmt(i.price)}${i.description ? `\n> ${i.description}` : ''}`).join('\n\n'))], components: [row] });

      const collector = msg.createMessageComponentCollector({ componentType: ComponentType.StringSelect, filter: i => i.user.id === message.author.id, time: 30_000 });

      collector.on('collect', async interaction => {
        await interaction.deferUpdate();
        const itemName = interaction.values[0];
        const item = shop.find(i => i.name === itemName);
        if (!item) return;

        const wallet = getWallet(guildId, userId);
        if (wallet < item.price) {
          await msg.edit({ embeds: [new EmbedBuilder().setColor('#e74c3c').setDescription(`${deny} ${message.author}: You can't afford **${item.name}** (${fmt(item.price)}). You have **${fmt(wallet)}**.`)], components: [] });
          collector.stop();
          return;
        }

        setWallet(guildId, userId, wallet - item.price);
        let extra = '';
        if (item.roleId) {
          const role = message.guild.roles.cache.get(item.roleId);
          if (role) {
            await message.member.roles.add(role).catch(() => {});
            extra = ` You received the **${role.name}** role.`;
          }
        }

        await msg.edit({ embeds: [new EmbedBuilder().setColor('#2ecc71').setDescription(`${approve} ${message.author}: Purchased **${item.name}** for **${fmt(item.price)}**.${extra}`)], components: [] });
        collector.stop();
      });

      collector.on('end', (_, reason) => {
        if (reason === 'time') msg.edit({ components: [] }).catch(() => {});
      });
      return;
    }

    const shop = db.get(`economy.${guildId}.shop`) || [];
    if (!shop.length) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`${warn} The shop is empty. Admins can use \`shop add\` to add items.`)] });

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('🛒 Shop')
      .setDescription(shop.map(i => `**${i.name}** — ${fmt(i.price)}${i.description ? `\n> ${i.description}` : ''}`).join('\n\n'))
      .setFooter({ text: `Use 'shop buy' to purchase an item` })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
