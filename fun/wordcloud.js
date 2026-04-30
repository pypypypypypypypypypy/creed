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

const STOP = new Set('a an the and or but of to in on at for is are was were be been being have has had do does did i you he she it we they me him her us them my your his their our what who which how when where why this that these those not no yes if so as with from by about into out up down off over under again then than too very can will just dont don\'t i\'m it\'s you\'re they\'re we\'re lol lmao'.split(/\s+/));

module.exports = {
  name: 'wordcloud', category: 'fun', usage: 'wordcloud [member]',
  help: [
    { name: 'wordcloud', description: 'Most-used words from recent messages in this channel', aliases: 'wc', parameters: '[member]', information: 'n/a', usage: 'wordcloud [member]', example: 'wordcloud @user' },
    { name: 'wordcloud user', description: 'Most-used words by a specific member', aliases: 'n/a', parameters: '<member>', information: 'n/a', usage: 'wordcloud user <member>', example: 'wordcloud user @user' }
  ],
  aliases: ['wc'],
  run: async (client, message, args) => {
    let arr = args;
    if ((arr[0]||'').toLowerCase() === 'user') arr = arr.slice(1);
    const target = getMember(message, arr);
    const msgs = await message.channel.messages.fetch({ limit: 100 });
    const filtered = target ? msgs.filter(m => m.author.id === target.id) : msgs;
    const counts = {};
    for (const m of filtered.values()) {
      for (const w of (m.content || '').toLowerCase().split(/[^a-z']+/)) {
        if (w.length < 3 || STOP.has(w)) continue;
        counts[w] = (counts[w] || 0) + 1;
      }
    }
    const top = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 25);
    if (!top.length) return info(message, 'Wordcloud', 'No words found.');
    return info(message, target ? `Wordcloud: ${target.user.tag}` : 'Wordcloud (recent)', top.map(([w,c]) => `\`${w}\` ×${c}`).join(' '));
  }
};
