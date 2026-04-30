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

const REPLIES = {
  'hi': ['hey there!', 'hello!', 'hi!', 'hey 👋'],
  'hello': ['hi!', 'hello to you too', 'hey!'],
  'how are you': ["I'm good, thanks!", 'doing fine. you?', "can't complain"],
  'who are you': ["I'm a bot.", 'just your friendly assistant.', 'a humble cleverbot stand-in.'],
  'bye': ['see ya!', 'cya!', 'goodbye!'],
  'thanks': ["you're welcome", 'no problem', 'anytime']
};
const FALLBACK = ['interesting…', 'tell me more', 'oh really?', "I'm not sure I follow", "couldn't have said it better myself", 'hmm.', 'go on…'];
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

module.exports = {
  name: 'cleverbot',
  category: 'fun',
  usage: 'cleverbot <message>',
  help: [{ name: 'cleverbot', description: 'Chat with a simple chatbot (offline canned replies)', aliases: 'cb', parameters: '<message>', information: 'n/a', usage: 'cleverbot <message>', example: 'cleverbot hi' }],
  aliases: ['cb'],
  run: async (client, message, args) => {
    const text = args.join(' ').toLowerCase().trim();
    if (!text) return warn(message, 'Usage: `cleverbot <message>`');
    const match = Object.keys(REPLIES).find(k => text.includes(k));
    const reply = match ? pick(REPLIES[match]) : pick(FALLBACK);
    return message.channel.send(reply);
  }
};
