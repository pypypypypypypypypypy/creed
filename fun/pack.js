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

const PACKS = [
  "{user} got more L's than the alphabet.",
  "{user} couldn't pour water out of a boot if the instructions were on the heel.",
  "{user} came in last in a race they were running alone.",
  "{user} is the human equivalent of buffering.",
  "{user} brings nothing to the table — and breaks the table getting there.",
  "{user} has the rizz of unseasoned chicken.",
  "{user} types in Comic Sans by choice.",
  "{user} is what happens when autocorrect gives up."
];

module.exports = {
  name: 'pack', category: 'fun', usage: 'pack <member>',
  help: [{ name: 'pack', description: 'Roast a member with a random pack', aliases: 'n/a', parameters: '<member>', information: 'n/a', usage: 'pack <member>', example: 'pack @user' }],
  run: async (client, message, args) => {
    const target = getMember(message, args);
    if (!target) return warn(message, 'Mention a member.');
    const line = PACKS[Math.floor(Math.random() * PACKS.length)].replace('{user}', `<@${target.id}>`);
    return message.channel.send(line);
  }
};
