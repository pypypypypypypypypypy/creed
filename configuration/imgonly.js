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
  name: 'imgonly',
  category: 'configuration',
  usage: 'imgonly <add|remove|list> [channel]',
  help: [
    { name: 'imgonly add', description: 'Make a channel image-only (non-image messages get deleted)', aliases: 'n/a', parameters: '<channel>', information: 'MANAGE_CHANNELS', usage: 'imgonly add <channel>', example: 'imgonly add #pics' },
    { name: 'imgonly remove', description: 'Stop enforcing image-only on a channel', aliases: 'n/a', parameters: '<channel>', information: 'MANAGE_CHANNELS', usage: 'imgonly remove <channel>', example: 'imgonly remove #pics' },
    { name: 'imgonly list', description: 'List image-only channels', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_CHANNELS', usage: 'imgonly list', example: 'imgonly list' }
  ],
  run: async (client, message, args) => {
    if (!needPerm(message, 'ManageChannels', 'manage_channels')) return;
    const sub = (args.shift() || 'list').toLowerCase();
    const key = `imgonly_${message.guild.id}`;
    const list = db.get(key) || [];
    if (sub === 'add') {
      const ch = getChannel(message, args) || message.channel;
      if (list.includes(ch.id)) return warn(message, `${ch} is already image-only.`);
      list.push(ch.id); db.set(key, list);
      return ok(message, `${ch} is now **image-only**.`);
    }
    if (sub === 'remove') {
      const ch = getChannel(message, args) || message.channel;
      const idx = list.indexOf(ch.id);
      if (idx === -1) return warn(message, `${ch} is not image-only.`);
      list.splice(idx, 1); db.set(key, list);
      return ok(message, `${ch} is no longer image-only.`);
    }
    if (sub === 'list') {
      if (!list.length) return info(message, 'imgonly', 'No image-only channels set.');
      return info(message, 'Image-only channels', list.map(id => `<#${id}>`).join(', '));
    }
    return warn(message, 'Use `imgonly add`, `imgonly remove`, or `imgonly list`.');
  }
};
