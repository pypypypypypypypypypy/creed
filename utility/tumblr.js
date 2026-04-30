const { EmbedBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const db = require('../db');
const fetch = require('node-fetch');
function getEmojis(){try{delete require.cache[require.resolve('../emojis.json')];return require('../emojis.json');}catch{return{};}}
function ok(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#a3eb7b').setDescription(`${e.approve||'✅'} ${message.author}: ${text}`)]});}
function deny(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#fe6464').setDescription(`${e.deny||'❌'} ${message.author}: ${text}`)]});}
function warn(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#efa23a').setDescription(`${e.warn||'⚠️'} ${message.author}: ${text}`)]});}
function info(message,title,desc,fields){const em=new EmbedBuilder().setColor('#FFFFFF').setTimestamp();if(title)em.setTitle(title);if(desc)em.setDescription(desc);if(fields&&fields.length)em.addFields(fields);return message.channel.send({embeds:[em]});}
function needPerm(message,flag,label){if(!flag)return true;if(message.member.permissions.has(PermissionFlagsBits[flag])||message.member.permissions.has(PermissionFlagsBits.Administrator))return true;warn(message,`You're missing permission: \`${label}\``);return false;}
function getChannel(message,args){return message.mentions.channels.first()||message.guild.channels.cache.get(args[0])||null;}
function getMember(message,args){return message.mentions.members.first()||message.guild.members.cache.get(args[0])||null;}

module.exports = {
  name: 'tumblr',
  category: 'utility',
  usage: 'tumblr <url>',
  help: [{ name: 'tumblr', description: 'Show a Tumblr post by URL', aliases: 'n/a', parameters: '<url>', information: 'n/a', usage: 'tumblr <url>', example: 'tumblr https://blog.tumblr.com/post/123' }],
  run: async (client, message, args) => {
    const url = args[0];
    if (!url || !/tumblr\.com/i.test(url)) return warn(message, 'Provide a valid Tumblr post URL.');
    try {
      const res = await fetch(`https://www.tumblr.com/oembed/1.0?url=${encodeURIComponent(url)}`);
      if (!res.ok) return deny(message, `Tumblr returned ${res.status}.`);
      const o = await res.json();
      const e = new EmbedBuilder().setColor('#FFFFFF').setTitle(o.title || 'Tumblr post').setURL(url).setAuthor({ name: o.author_name || 'Tumblr' }).setTimestamp();
      if (o.thumbnail_url) e.setImage(o.thumbnail_url);
      if (o.html) e.setDescription(o.html.replace(/<[^>]+>/g, '').slice(0, 2000));
      return message.channel.send({ embeds: [e] });
    } catch (err) { return deny(message, `Failed: ${err.message}`); }
  }
};
