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
  name: 'label',
  category: 'utility',
  usage: 'label <new name>',
  help: [{ name: 'label', description: 'Rename the current channel or thread', aliases: 'n/a', parameters: '<new name>', information: 'MANAGE_CHANNELS', usage: 'label <new name>', example: 'label general-chat' }],
  run: async (client, message, args) => {
    if (!needPerm(message, 'ManageChannels', 'manage_channels')) return;
    const name = args.join(' ').trim();
    if (!name) return warn(message, 'Provide a new name.');
    if (name.length > 100) return warn(message, 'Name must be 100 characters or fewer.');
    try {
      await message.channel.setName(name);
      return ok(message, `Renamed channel to **${name}**.`);
    } catch (e) { return deny(message, `Failed: ${e.message}`); }
  }
};
