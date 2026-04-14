const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'rules',
        description: 'View server rules',
        aliases: 'rule, serverrules',
        parameters: '[number]',
        information: 'n/a',
        usage: 'rules [number]',
        example: 'rules number'
    }
],

    name: 'rules',
  aliases: ['rule', 'serverrules'],
  category: 'utility',

  run: async (client, message, args) => {
    const cmdCount = Math.floor(client.commands.size / 10) * 10;

    const rulesEmbed = new EmbedBuilder()
      .setColor(color)
      .setDescription(
        `- Don't be rude to anyone in this community. Unnecessarily being rude is not going to be tolerated.\n` +
        `- Please discuss topics in their proper channels (e.g, general for chatting, support for help).\n` +
        `- Don't rush our team when waiting for a reply. We do our best to try and reply quickly to you.\n` +
        `- Stay away from unnecessary drama or controversial topics, and don't join in if you see one happening. This server is about drown, not about debates.\n` +
        `- By joining this server, you agree to follow both [Discord's Community Guidelines](https://discord.com/guidelines) and [drown's Terms of Service.](https://discord.com/terms)`
      );

    const infoEmbed = new EmbedBuilder()
      .setColor(color)
      .setDescription(
        `**drown** is a multipurpose app that provides over ${cmdCount} commands for free, with no strings attached\n\n` +
        `- **Moderation** – Fast, powerful moderation tools for your use\n` +
        `- **Dashboard** – With so many features, it may be easier to edit everyone on the [dashboard](https://discord.com)\n` +
        `- **VoiceMaster** – drown has the popular voice master system, providing a simple VC solution for your server.\n` +
        `- **Giveaways** – An easy system to give stuff to your community\n` +
        `- **Levels** – A way to get your server excited about chatting and climb the leaderboard`
      );

    await message.channel.send({ embeds: [rulesEmbed] });
    await message.channel.send({ embeds: [infoEmbed] });
  }
};
