module.exports = {
  category: 'owner',
  help: [
    {
        name: 'leave',
        description: 'Make the bot leave a guild',
        aliases: 'n/a',
        parameters: '(guild id)',
        information: 'BOT_OWNER',
        usage: 'leave (guild id)',
        example: 'leave guild id'
    }
],

    name: "leave",
  category: "owner",

  run: async (client, message, args) => {
    if (message.author.id === '370268185410404353') {
      const emojis = require('../emojis.json');
      client.guilds.fetch(args[0]).then(guild => guild.leave().catch(console.error).then(message.channel.send({ embeds: [new EmbedBuilder().setColor("#a3eb7b").setDescription(`${emojis.approve} ${message.author}: Successfully left **${guild.name}**`)] })))
    }
  }
}