const { EmbedBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const db = require('../db');
const fetch = require('node-fetch');
function getEmojis(){try{delete require.cache[require.resolve('../emojis.json')];return require('../emojis.json');}catch{return{};}}
function ok(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#a3eb7b').setDescription(`${e.approve||'✅'} ${message.author}: ${text}`)]});}
function deny(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#fe6464').setDescription(`${e.deny||'❌'} ${message.author}: ${text}`)]});}
function warn(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#efa23a').setDescription(`${e.warn||'⚠️'} ${message.author}: ${text}`)]});}
function info(message,title,desc,fields){const em=new EmbedBuilder().setColor('#3498db').setTimestamp();if(title)em.setTitle(title);if(desc)em.setDescription(desc);if(fields&&fields.length)em.addFields(fields);return message.channel.send({embeds:[em]});}
function needPerm(message,flag,label){if(!flag)return true;if(message.member.permissions.has(PermissionFlagsBits[flag])||message.member.permissions.has(PermissionFlagsBits.Administrator))return true;warn(message,`You're missing permission: \`${label}\``);return false;}
function getChannel(message,args){return message.mentions.channels.first()||message.guild.channels.cache.get(args[0])||null;}
function getMember(message,args){return message.mentions.members.first()||message.guild.members.cache.get(args[0])||null;}

module.exports = {
  name: 'twtter',
  category: 'utility',
  usage: 'twtter <url>',
  help: [{ name: 'twtter', description: 'Show a Twitter/X post by URL', aliases: 'twitter, x, tweet', parameters: '<url>', information: 'n/a', usage: 'twtter <url>', example: 'twtter https://x.com/user/status/123' }],
  aliases: ['tweet'],
  run: async (client, message, args) => {
    const url = args[0];
    const m = (url || '').match(/(?:twitter|x)\.com\/([^\/]+)\/status\/(\d+)/i);
    if (!m) return warn(message, 'Provide a valid Twitter/X status URL.');
    try {
      const res = await fetch(`https://api.vxtwitter.com/${m[1]}/status/${m[2]}`);
      if (!res.ok) return deny(message, `Lookup returned ${res.status}.`);
      const t = await res.json();
      const e = new EmbedBuilder().setColor('#1DA1F2').setAuthor({ name: `${t.user_name} (@${t.user_screen_name})` }).setURL(t.tweetURL).setDescription((t.text || '').slice(0, 4000)).setTimestamp(new Date(t.date || Date.now())).setFooter({ text: `❤ ${t.likes||0} • 🔁 ${t.retweets||0} • 💬 ${t.replies||0}` });
      if (t.mediaURLs && t.mediaURLs[0]) e.setImage(t.mediaURLs[0]);
      return message.channel.send({ embeds: [e] });
    } catch (err) { return deny(message, `Failed: ${err.message}`); }
  }
};
