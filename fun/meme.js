const { EmbedBuilder } = require('discord.js');
const got = require('got');
const { color } = require('../config.json');

async function fetchMeme(hexColor) {
  const response = await got('https://www.reddit.com/r/memes/random/.json');
  const [list] = JSON.parse(response.body);
  const [post] = list.data.children;
  return new EmbedBuilder()
    .setTitle(post.data.title)
    .setURL(`https://reddit.com${post.data.permalink}`)
    .setColor(hexColor || color)
    .setImage(post.data.url)
    .setFooter({ text: `👍 ${post.data.ups}  •  r/memes` });
}

module.exports = {
  category: 'fun',
  name: 'meme',
  help: [{ name: 'meme', description: 'Get a random meme from r/memes', aliases: 'n/a', parameters: 'n/a', information: 'n/a', usage: 'meme', example: 'meme' }],

  slashData: {
    name: 'meme',
    description: 'Get a random meme from r/memes',
    dm_permission: true,
    options: [],
  },
  runSlash: async (client, interaction) => {
    await interaction.deferReply();
    try {
      const embed = await fetchMeme(color);
      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      await interaction.editReply({ content: 'Could not fetch a meme right now.' });
    }
  },

  run: async (client, message, args) => {
    const hexColor = (message.guild ? message.member?.displayHexColor : null) || color;
    try {
      const embed = await fetchMeme(hexColor);
      message.channel.send({ embeds: [embed] });
    } catch (e) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor('#fe6464').setDescription('Could not fetch a meme right now.')] });
    }
  }
};
