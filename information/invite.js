const { EmbedBuilder } = require('discord.js');
const { color } = require("../config.json");

module.exports = {
  category: 'information',
  help: [
    {
        name: 'invite',
        description: 'Get the bot invite link',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'invite',
        example: 'invite'
    }
],

    name: "invite",
  aliases: ["inv"],
  category: "information",

  run: async (client, message, args) => {
    const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot`;

    const inviteEmbed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
      .setDescription(`[\`Invite link to ${client.user.username}\`](${inviteUrl})`);

    return message.channel.send({ embeds: [inviteEmbed] });
  }
}
