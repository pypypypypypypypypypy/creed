const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
function getEmojis(){try{delete require.cache[require.resolve('../emojis.json')];return require('../emojis.json');}catch{return{};}}
function ok(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#a3eb7b').setDescription(`${e.approve||'✅'} ${message.author}: ${text}`)]});}
function deny(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#fe6464').setDescription(`${e.deny||'❌'} ${message.author}: ${text}`)]});}
function warn(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#efa23a').setDescription(`${e.warn||'⚠️'} ${message.author}: ${text}`)]});}
function info(message,title,desc,fields){const em=new EmbedBuilder().setColor('#3498db').setTitle(title).setTimestamp();if(desc)em.setDescription(desc);if(fields&&fields.length)em.addFields(fields);return message.channel.send({embeds:[em]});}
function needPerm(message,flag,label){if(!flag)return true;if(message.member.permissions.has(PermissionFlagsBits[flag])||message.member.permissions.has(PermissionFlagsBits.Administrator))return true;warn(message,`You're missing permission: \`${label}\``);return false;}
function getChannel(message,args){return message.mentions.channels.first()||message.guild.channels.cache.get(args[0])||null;}
function getMember(message,args){return message.mentions.members.first()||message.guild.members.cache.get(args[0])||null;}

module.exports = {
  name: 'wordcloud',
  category: 'fun',
  usage: 'wordcloud',
  help: [
    { name: 'wordcloud', description: 'generate a collage of top words said by a user or in a channel/server', aliases: 'n/a', parameters: '<user> <channel>', information: 'n/a', usage: 'wordcloud <user> <channel>', example: 'wordcloud' },
    { name: 'wordcloud global', description: 'make a wordcloud of a user s global messages', aliases: 'n/a', parameters: '<user>', information: 'n/a', usage: 'wordcloud global <user>', example: 'wordcloud global' }
  ],

  run: async (client, message, args) => {
  if ((args[0]||'').toLowerCase() === 'global') {
    const subArgs = args.slice(1);
      return info(message, `wordcloud global`, `make a wordcloud of a user s global messages (params: user)`);
  }
    return info(message, `wordcloud`, `generate a collage of top words said by a user or in a channel/server (params: user, channel)`);
  }
};
