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
  name: 'reddit',
  category: 'utility',
  usage: 'reddit <subreddit>',
  help: [{ name: 'reddit', description: 'Get a top post from a subreddit', aliases: 'r', parameters: '<subreddit>', information: 'n/a', usage: 'reddit <subreddit>', example: 'reddit memes' }],
  aliases: ['r'],
  run: async (client, message, args) => {
    const sub = (args[0] || '').replace(/^r\//, '').trim();
    if (!sub) return warn(message, 'Usage: `reddit <subreddit>`');
    try {
      const res = await fetch(`https://www.reddit.com/r/${encodeURIComponent(sub)}/top.json?limit=25&t=day`, { headers: { 'User-Agent': 'drown-xd-bot/1.0' } });
      if (!res.ok) return deny(message, `Reddit returned ${res.status}.`);
      const json = await res.json();
      const posts = (json.data?.children || []).filter(p => !p.data.over_18 || message.channel.nsfw);
      if (!posts.length) return warn(message, 'No posts found.');
      const p = posts[Math.floor(Math.random() * posts.length)].data;
      const e = new EmbedBuilder().setColor('#ff4500').setTitle(p.title.slice(0, 256)).setURL(`https://reddit.com${p.permalink}`).setAuthor({ name: `r/${p.subreddit} • u/${p.author}` }).setFooter({ text: `👍 ${p.ups} • 💬 ${p.num_comments}` }).setTimestamp();
      if (p.thumbnail && /^https?:/.test(p.thumbnail)) e.setThumbnail(p.thumbnail);
      if (p.url && /\.(png|jpe?g|gif|webp)$/i.test(p.url)) e.setImage(p.url);
      else if (p.selftext) e.setDescription(p.selftext.slice(0, 2000));
      return message.channel.send({ embeds: [e] });
    } catch (err) { return deny(message, `Failed: ${err.message}`); }
  }
};
