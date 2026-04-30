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
  name: 'itemshop', category: 'information', usage: 'itemshop',
  help: [{ name: 'itemshop', description: "Show today's Fortnite item shop image", aliases: 'shop', parameters: 'n/a', information: 'n/a', usage: 'itemshop', example: 'itemshop' }],
  aliases: ['shop'],
  run: async (client, message, args) => {
    try {
      const res = await fetch('https://fortnite-api.com/v2/shop/br?language=en');
      if (!res.ok) return deny(message, `API returned ${res.status}.`);
      const json = await res.json();
      const items = (json.data?.featured?.entries || []).slice(0, 10).map(e => `• **${e.items?.[0]?.name || 'Item'}** — ${e.finalPrice} V-Bucks`);
      return info(message, "Today's Fortnite Item Shop", items.join('\n') || 'No items today.');
    } catch (e) { return deny(message, `Failed: ${e.message}`); }
  }
};
