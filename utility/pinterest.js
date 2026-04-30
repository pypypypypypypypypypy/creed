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
  name: 'pinterest',
  category: 'utility',
  usage: 'pinterest <query>',
  help: [{ name: 'pinterest', description: 'Search Pinterest for an image', aliases: 'pin', parameters: '<query>', information: 'n/a', usage: 'pinterest <query>', example: 'pinterest sunset' }],
  aliases: ['pin'],
  run: async (client, message, args) => {
    const q = args.join(' ').trim();
    if (!q) return warn(message, 'Usage: `pinterest <query>`');
    try {
      const res = await fetch(`https://www.pinterest.com/resource/BaseSearchResource/get/?source_url=/search/pins/?q=${encodeURIComponent(q)}&data=${encodeURIComponent(JSON.stringify({options:{query:q,scope:'pins'}}))}`, { headers: { 'User-Agent':'Mozilla/5.0', 'X-Requested-With':'XMLHttpRequest' } });
      if (!res.ok) return deny(message, `Pinterest returned ${res.status}. Try the search URL: https://www.pinterest.com/search/pins/?q=${encodeURIComponent(q)}`);
      const json = await res.json();
      const results = json.resource_response?.data?.results || [];
      const imgs = results.map(r => r.images?.orig?.url).filter(Boolean);
      if (!imgs.length) return warn(message, `No results. Try: <https://www.pinterest.com/search/pins/?q=${encodeURIComponent(q)}>`);
      const pick = imgs[Math.floor(Math.random()*imgs.length)];
      const e = new EmbedBuilder().setColor('#FFFFFF').setTitle(`Pinterest: ${q}`).setURL(`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(q)}`).setImage(pick).setTimestamp();
      return message.channel.send({ embeds: [e] });
    } catch (err) { return deny(message, `Failed: ${err.message}. Try https://www.pinterest.com/search/pins/?q=${encodeURIComponent(q)}`); }
  }
};
