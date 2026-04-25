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
  name: 'customise',
  category: 'configuration',
  usage: 'customise',
  help: [
    { name: 'customise', description: 'Customise the bots looks, such as pfp, banner, and nickname.', aliases: 'n/a', parameters: '', information: 'n/a', usage: 'customise', example: 'customise' },
    { name: 'customise color', description: 'Update the bot s color.', aliases: 'n/a', parameters: '<colors>', information: 'n/a', usage: 'customise color <colors>', example: 'customise color' },
    { name: 'customise reset', description: 'Reset upset s profile to default.', aliases: 'n/a', parameters: '', information: 'n/a', usage: 'customise reset', example: 'customise reset' },
    { name: 'customise avatar', description: 'Update the bots avatar.', aliases: 'n/a', parameters: '', information: 'n/a', usage: 'customise avatar', example: 'customise avatar' },
    { name: 'customise name', description: 'Changes the bot s Guild Nickname.', aliases: 'n/a', parameters: '<name>', information: 'n/a', usage: 'customise name <name>', example: 'customise name' },
    { name: 'customise font', description: 'Update the bot s font.', aliases: 'n/a', parameters: '', information: 'n/a', usage: 'customise font', example: 'customise font' },
    { name: 'customise banner', description: 'Update the bots banner.', aliases: 'n/a', parameters: '', information: 'n/a', usage: 'customise banner', example: 'customise banner' },
    { name: 'customise effect', description: 'Update the bot s effect.', aliases: 'n/a', parameters: '', information: 'n/a', usage: 'customise effect', example: 'customise effect' },
    { name: 'customise bio', description: 'Update the bots bio.', aliases: 'n/a', parameters: '<bio>', information: 'n/a', usage: 'customise bio <bio>', example: 'customise bio' }
  ],

  run: async (client, message, args) => {
  if ((args[0]||'').toLowerCase() === 'color') {
    const subArgs = args.slice(1);
      if (!needPerm(message, 'Administrator', 'administrator')) return;
      return info(message, `customise color`, `Update the bot s color. (params: colors)`);
  }
  if ((args[0]||'').toLowerCase() === 'reset') {
    const subArgs = args.slice(1);
      if (!needPerm(message, 'Administrator', 'administrator')) return;
      db.delete(`customise_${message.guild.id}`);
      return ok(message, `Reset \`customise\` configuration.`);
  }
  if ((args[0]||'').toLowerCase() === 'avatar') {
    const subArgs = args.slice(1);
      if (!needPerm(message, 'Administrator', 'administrator')) return;
      return info(message, `customise avatar`, `Update the bots avatar.`);
  }
  if ((args[0]||'').toLowerCase() === 'name') {
    const subArgs = args.slice(1);
      if (!needPerm(message, 'Administrator', 'administrator')) return;
      return info(message, `customise name`, `Changes the bot s Guild Nickname. (params: name)`);
  }
  if ((args[0]||'').toLowerCase() === 'font') {
    const subArgs = args.slice(1);
      if (!needPerm(message, 'Administrator', 'administrator')) return;
      return info(message, `customise font`, `Update the bot s font.`);
  }
  if ((args[0]||'').toLowerCase() === 'banner') {
    const subArgs = args.slice(1);
      if (!needPerm(message, 'Administrator', 'administrator')) return;
      return info(message, `customise banner`, `Update the bots banner.`);
  }
  if ((args[0]||'').toLowerCase() === 'effect') {
    const subArgs = args.slice(1);
      if (!needPerm(message, 'Administrator', 'administrator')) return;
      return info(message, `customise effect`, `Update the bot s effect.`);
  }
  if ((args[0]||'').toLowerCase() === 'bio') {
    const subArgs = args.slice(1);
      if (!needPerm(message, 'Administrator', 'administrator')) return;
      return info(message, `customise bio`, `Update the bots bio. (params: bio)`);
  }
    if (!needPerm(message, 'Administrator', 'administrator')) return;
    return info(message, `customise`, `Customise the bots looks, such as pfp, banner, and nickname.`);
  }
};
