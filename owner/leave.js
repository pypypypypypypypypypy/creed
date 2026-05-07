const { EmbedBuilder } = require('discord.js');
const { canRunOwnerCmd } = require('../utils/owners');

function getEmojis() {
  delete require.cache[require.resolve('../emojis.json')];
  return require('../emojis.json');
}

module.exports = {
  name: 'leave',
  category: 'owner',
  help: [
    {
      name: 'leave',
      description: 'Make the bot leave a guild',
      aliases: 'n/a',
      parameters: '(guild id)',
      information: 'BOT_OWNER',
      usage: 'leave (guild id)',
      example: 'leave 123456789012345678'
    }
  ],

  run: async (client, message, args) => {
    if (!canRunOwnerCmd(message.author.id, 'leave')) return;

    const e = getEmojis();
    const guildId = args[0];

    if (!guildId) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(
          `${e.warn} ${message.author}: Provide a guild ID.\n\`\`\`\nSyntax: leave <guild id>\n\`\`\``
        )]
      });
    }

    const guild = client.guilds.cache.get(guildId) || await client.guilds.fetch(guildId).catch(() => null);

    if (!guild) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(
          `${e.deny} ${message.author}: Guild \`${guildId}\` not found — the bot may not be in that server.`
        )]
      });
    }

    const guildName = guild.name;
    const leavingCurrent = guild.id === message.guild.id;

    // If leaving the current guild, send the confirmation first
    if (leavingCurrent) {
      await message.channel.send({
        embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(
          `${e.approve} ${message.author}: Leaving **${guildName}** now.`
        )]
      }).catch(() => {});
    }

    await guild.leave().catch(err => {
      if (!leavingCurrent) {
        message.channel.send({
          embeds: [new EmbedBuilder().setColor('#fe6464').setDescription(
            `${e.deny} ${message.author}: Failed to leave **${guildName}** — \`${err.message}\``
          )]
        }).catch(() => {});
      }
      return;
    });

    if (!leavingCurrent) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(
          `${e.approve} ${message.author}: Successfully left **${guildName}**.`
        )]
      });
    }
  }
};
