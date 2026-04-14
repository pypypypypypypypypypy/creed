const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const { color } = require('../config.json');

const ALLOWED_IDS = ['370268185410404353'];

async function getOrCreateCategory(guild, name, overwrites) {
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

module.exports = {
  category: 'utility',
  help: [
    {
      name: 'buy',
      description: 'Post the purchase panel',
      aliases: 'n/a',
      parameters: 'n/a',
      information: 'Bot owner only',
      usage: 'buy',
      example: 'buy'
    }
  ],

  name: 'buy',
  category: 'utility',

  run: async (client, message, args) => {
    if (!ALLOWED_IDS.includes(message.author.id)) return;

    const embed = new EmbedBuilder()
      .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
      .setColor(color)
      .setTitle('Purchase $12 one-time or $4 monthly')
      .setDescription(
        `If you're interested in purchasing a subscription for a **Discord server** of your choice, please open a ticket below to buy or transfer a subscription.\n\n` +
        `**Prices and the available payment methods are listed [here](https://discord.com).**\n` +
        `Please do not ask to pay with Discord Nitro, or to negotiate the price. You will be either banned or just ignored.`
      )
      .setFooter({ text: 'Click a button below to open a ticket' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('buy_purchase')
        .setLabel('🛒 Purchase')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('buy_transfer')
        .setLabel('🔄 Transfer')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('buy_other')
        .setLabel('🔗 Other')
        .setStyle(ButtonStyle.Secondary)
    );

    await message.channel.send({ embeds: [embed], components: [row] });
  }
};
