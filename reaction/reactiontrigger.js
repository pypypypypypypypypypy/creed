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

function parseEmoji(s) {
  const m = (s || '').match(/^<a?:(\w+):(\d+)>$/);
  return m ? `<:${m[1]}:${m[2]}>` : s;
}

module.exports = {
  name: 'reactiontrigger',
  category: 'reaction',
  usage: 'reactiontrigger <add|remove|list> [trigger] [emoji]',
  help: [
    { name: 'reactiontrigger add', description: 'Auto-react with an emoji whenever a trigger word appears', aliases: 'n/a', parameters: '<trigger> <emoji>', information: 'MANAGE_GUILD', usage: 'reactiontrigger add <trigger> <emoji>', example: 'reactiontrigger add hello 👋' },
    { name: 'reactiontrigger remove', description: 'Remove a trigger', aliases: 'n/a', parameters: '<trigger>', information: 'MANAGE_GUILD', usage: 'reactiontrigger remove <trigger>', example: 'reactiontrigger remove hello' },
    { name: 'reactiontrigger list', description: 'List all triggers', aliases: 'n/a', parameters: 'n/a', information: 'MANAGE_GUILD', usage: 'reactiontrigger list', example: 'reactiontrigger list' }
  ],
  run: async (client, message, args) => {
    if (!needPerm(message, 'ManageGuild', 'manage_guild')) return;
    const sub = (args.shift() || 'list').toLowerCase();
    const key = `reactiontrigger_${message.guild.id}`;
    const list = db.get(key) || [];
    if (sub === 'add') {
      const emoji = parseEmoji(args.pop());
      const trigger = args.join(' ').toLowerCase();
      if (!trigger || !emoji) return warn(message, 'Usage: `reactiontrigger add <trigger> <emoji>`');
      list.push({ trigger, emoji });
      db.set(key, list);
      return ok(message, `Added trigger **${trigger}** → ${emoji}`);
    }
    if (sub === 'remove') {
      const trigger = args.join(' ').toLowerCase();
      const next = list.filter(t => t.trigger !== trigger);
      if (next.length === list.length) return warn(message, 'Trigger not found.');
      db.set(key, next);
      return ok(message, `Removed trigger **${trigger}**`);
    }
    if (sub === 'list') {
      if (!list.length) return info(message, 'reactiontrigger', 'No triggers set.');
      return info(message, 'Reaction triggers', list.map(t => `• **${t.trigger}** → ${t.emoji}`).join('\n').slice(0, 4000));
    }
    return warn(message, 'Use `reactiontrigger add|remove|list`.');
  }
};
