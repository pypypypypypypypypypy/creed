const { EmbedBuilder } = require('discord.js');
const { canRunOwnerCmd } = require('../utils/owners');

const RESET_WORDS = new Set(['remove', 'reset', 'clear', 'none', 'off']);
const MAX_BIO_LENGTH = 400;

module.exports = {
  category: 'owner',
  help: [
    {
      name: 'bio',
      description: "Update the bot's application description (the 'About Me' bio shown on its profile).",
      aliases: 'setbio, description',
      parameters: '<text | remove>',
      information: `BOT_OWNER. Limit ${MAX_BIO_LENGTH} characters.`,
      usage: 'bio <text>',
      example: 'bio The chillest bot in the server.',
    },
  ],

  name: 'bio',
  aliases: ['setbio', 'description'],

  run: async (client, message, args) => {
    if (!canRunOwnerCmd(message.author.id, 'bio')) return;

    const raw = args.join(' ').trim();
    const wantsReset = RESET_WORDS.has(raw.toLowerCase());

    if (!raw) {
      const current = client.application?.description || '*(empty)*';
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#FFFFFF')
            .setTitle("Bot Bio")
            .setDescription(`**Current bio:**\n${current}\n\nUse \`,bio <text>\` to update or \`,bio remove\` to clear.`),
        ],
      });
    }

    if (!wantsReset && raw.length > MAX_BIO_LENGTH) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#FFFFFF')
            .setDescription(`${message.author}: Bio is too long (**${raw.length}/${MAX_BIO_LENGTH}** characters).`),
        ],
      });
    }

    try {
      if (!client.application) await client.application.fetch();
      await client.application.edit({ description: wantsReset ? '' : raw });

      const action = wantsReset ? 'Cleared' : 'Updated';
      const preview = wantsReset ? '*(empty)*' : raw;

      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#FFFFFF')
            .setTitle('Bot Bio')
            .setDescription(`${message.author}: ${action} **${client.user.username}**'s bio.\n\n${preview}`),
        ],
      });
    } catch (e) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#FFFFFF')
            .setDescription(`${message.author}: Failed to update bio — \`${(e && e.message) || 'unknown error'}\``),
        ],
      });
    }
  },
};
