const { EmbedBuilder } = require('discord.js');
const got = require('got');
const { color } = require('../config.json');

module.exports = {
  category: 'fun',
  help: [
    {
        name: 'meme',
        description: 'Get a random meme',
        aliases: 'n/a',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'meme',
        example: 'meme'
    }
],

    name: 'meme',

  run: async (client, message, args) => {
    let mentionedMember = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!mentionedMember) mentionedMember = message.member;

    got('https://www.reddit.com/r/memes/random/.json')
      .then(response => {
        const [list] = JSON.parse(response.body);
        const [post] = list.data.children;

        const embed = new EmbedBuilder()
          .setTitle(post.data.title)
          .setURL(`https://reddit.com${post.data.permalink}`)
          .setColor(mentionedMember.displayHexColor || color)
          .setImage(post.data.url);

        message.channel.send({ embeds: [embed] });
      })
      .catch(console.error);
  }
};
