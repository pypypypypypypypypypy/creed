const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { isOwner } = require('../utils/owners');

module.exports = {
  category: 'owner',
  help: [
    {
        name: 'ownercommands',
        description: 'List all owner-only commands',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'BOT_OWNER',
        usage: 'ownercommands',
        example: 'ownercommands'
    }
],

    name: 'ownercommands',
  aliases: ['oc'],
  category: 'owner',

  run: async (client, message, args) => {
    if (!isOwner(message.author.id)) return;

    const ownerCmds = [...client.commands.values()].filter(c => c.category === 'owner');

    const commandNames = ownerCmds.map(c => `\`${c.name}\``).join(', ');

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${message.guild.name} — Owner Command List`)
      .setDescription(`**${ownerCmds.length}** total owner commands`)
      .addFields({ name: 'Owner Commands', value: commandNames || 'None', inline: false })
      .setFooter({ text: 'Module: owner' })
      .setTimestamp();

    message.channel.send({ embeds: [embed] });
  }
};
