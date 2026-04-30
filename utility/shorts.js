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
  name: 'shorts',
  category: 'utility',
  usage: 'shorts <query>',
  help: [{ name: 'shorts', description: 'Search YouTube Shorts for a video', aliases: 'n/a', parameters: '<query>', information: 'n/a', usage: 'shorts <query>', example: 'shorts cooking tips' }],
  run: async (client, message, args) => {
    const q = args.join(' ').trim();
    if (!q) return warn(message, 'Usage: `shorts <query>`');
    try {
      const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgIYAQ%253D%253D`, { headers: { 'User-Agent':'Mozilla/5.0' } });
      const html = await res.text();
      const ids = [...html.matchAll(/"videoId":"([\w-]{11})"/g)].map(m => m[1]);
      const uniq = [...new Set(ids)];
      if (!uniq.length) return warn(message, 'No shorts found.');
      const pick = uniq[Math.floor(Math.random()*Math.min(uniq.length, 10))];
      return message.channel.send(`https://www.youtube.com/shorts/${pick}`);
    } catch (err) { return deny(message, `Failed: ${err.message}`); }
  }
};
