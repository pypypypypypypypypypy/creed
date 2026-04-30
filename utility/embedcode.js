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
  name: 'embedcode', category: 'utility', usage: 'embedcode (reply to a message with embed)',
  help: [{ name: 'embedcode', description: 'Show the JSON of an embed in a replied-to message', aliases: 'n/a', parameters: 'n/a', information: 'n/a', usage: 'embedcode', example: 'reply to a bot embed and run embedcode' }],
  run: async (client, message, args) => {
    const ref = message.reference?.messageId ? await message.channel.messages.fetch(message.reference.messageId).catch(() => null) : null;
    if (!ref) return warn(message, 'Reply to a message with an embed.');
    const e = ref.embeds[0];
    if (!e) return warn(message, 'No embed in that message.');
    const json = JSON.stringify(e.toJSON ? e.toJSON() : e.data, null, 2);
    return message.channel.send(`\`\`\`json\n${json.slice(0, 1900)}\n\`\`\``);
  }
};
