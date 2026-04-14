const { EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');
const config = require('../config.json');
const { color } = require('../config.json');

module.exports = {
  category: 'utility',
  help: [
    {
        name: 'userbanner',
        description: "View a user's banner image",
        aliases: 'ub',
        parameters: '[user]',
        information: 'n/a',
        usage: 'userbanner [user]',
        example: 'userbanner user'
    }
],

    name: 'userbanner',
  aliases: ['ub'],

  run: async (client, message, args) => {
    message.channel.sendTyping();

    let mentionedMember = message.mentions.members.first()
      || message.guild.members.cache.get(args[0])
      || message.guild.members.cache.find(r => r.user.username.toLowerCase() === args.join(' ').toLowerCase())
      || message.guild.members.cache.find(r => r.displayName.toLowerCase() === args.join(' ').toLowerCase())
      || message.member;

    const user = await client.users.fetch(mentionedMember.id, { force: true }).catch(() => null) || message.author;
    const uid = user.id;

    let banner = 'https://cdn.discordapp.com/attachments/829722741288337428/834016013678673950/banner_invisible.gif';

    try {
      const res = await fetch(`https://discord.com/api/v10/users/${uid}`, {
        headers: { Authorization: `Bot ${config.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.banner) {
          const ext = data.banner.startsWith('a_') ? 'gif' : 'png';
          banner = `https://cdn.discordapp.com/banners/${uid}/${data.banner}.${ext}?size=1024`;
        }
      }
    } catch {}

    const embed = new EmbedBuilder()
      .setColor(mentionedMember.displayHexColor || color)
      .setImage(banner)
      .setURL(banner)
      .setAuthor({ name: message.author.username, iconURL: message.author.avatarURL() })
      .setTitle(`${user.username}'s banner`);

    message.channel.send({ embeds: [embed] });
  }
};
