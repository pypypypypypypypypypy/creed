const { EmbedBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const db = require('../db');
const fetch = require('node-fetch');
function getEmojis(){try{delete require.cache[require.resolve('../emojis.json')];return require('../emojis.json');}catch{return{};}}
function ok(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#a3eb7b').setDescription(`${e.approve||'✅'} ${message.author}: ${text}`)]});}
function deny(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#fe6464').setDescription(`${e.deny||'❌'} ${message.author}: ${text}`)]});}
function warn(message,text){const e=getEmojis();return message.channel.send({embeds:[new EmbedBuilder().setColor('#efa23a').setDescription(`${e.warn||'⚠️'} ${message.author}: ${text}`)]});}
function info(message,title,desc,fields){const em=new EmbedBuilder().setColor('#3498db').setTimestamp();if(title)em.setTitle(title);if(desc)em.setDescription(desc);if(fields&&fields.length)em.addFields(fields);return message.channel.send({embeds:[em]});}
function needPerm(message,flag,label){if(!flag)return true;if(message.member.permissions.has(PermissionFlagsBits[flag])||message.member.permissions.has(PermissionFlagsBits.Administrator))return true;warn(message,`You're missing permission: \`${label}\``);return false;}
function getChannel(message,args){return message.mentions.channels.first()||message.guild.channels.cache.get(args[0])||null;}
function getMember(message,args){return message.mentions.members.first()||message.guild.members.cache.get(args[0])||null;}

module.exports = {
  name: 'select',
  category: 'utility',
  usage: 'select <question> | <opt1> | <opt2> | ...',
  help: [{ name: 'select', description: 'Create a select-menu poll. Separate question and options with |', aliases: 'poll', parameters: '<question> | <opt1> | <opt2> | ...', information: 'n/a', usage: 'select <question> | <opt1> | <opt2>', example: 'select Lunch? | pizza | sushi | tacos' }],
  aliases: ['poll'],
  run: async (client, message, args) => {
    const text = args.join(' ');
    const parts = text.split('|').map(s => s.trim()).filter(Boolean);
    if (parts.length < 3) return warn(message, 'Usage: `select <question> | <opt1> | <opt2> | ...` (min 2 options).');
    const [question, ...options] = parts;
    if (options.length > 25) return warn(message, 'Max 25 options.');
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`select_${message.id}`)
      .setPlaceholder('Choose…')
      .addOptions(options.slice(0, 25).map((label, i) => ({ label: label.slice(0, 100), value: `opt_${i}` })));
    const row = new ActionRowBuilder().addComponents(menu);
    return message.channel.send({
      embeds: [new EmbedBuilder().setColor('#3498db').setTitle('Selection').setDescription(`**${question}**\nAsked by ${message.author}`)],
      components: [row]
    });
  }
};
