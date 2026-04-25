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
  name: 'preset',
  category: 'music',
  usage: 'preset',
  help: [
    { name: 'preset', description: 'Use a preset for Music', aliases: 'n/a', parameters: '', information: 'n/a', usage: 'preset', example: 'preset' },
    { name: 'preset vibrato', description: 'Introduces a wavering pitch effect for dynamic tone', aliases: 'n/a', parameters: '<setting>', information: 'n/a', usage: 'preset vibrato <setting>', example: ',preset vibrato True' },
    { name: 'preset piano', description: 'Enhances mid and high tones for standout piano-based tracks', aliases: 'n/a', parameters: '<setting>', information: 'n/a', usage: 'preset piano <setting>', example: ',preset piano True' },
    { name: 'preset nightcore', description: 'Accelerates track playback for nightcore-style music', aliases: 'n/a', parameters: '<setting>', information: 'n/a', usage: 'preset nightcore <setting>', example: ',preset nightcore True' },
    { name: 'preset chipmunk', description: 'Accelerates track playback to produce a high-pitched, chipmunk-like sound', aliases: 'n/a', parameters: '<setting>', information: 'n/a', usage: 'preset chipmunk <setting>', example: ',preset chipmunk True' },
    { name: 'preset vaporwave', description: 'Slows track playback for nostalgic and vintage half-speed effect', aliases: 'n/a', parameters: '<setting>', information: 'n/a', usage: 'preset vaporwave <setting>', example: ',preset vaporwave True' },
    { name: 'preset active', description: 'List all currently applied filters', aliases: 'n/a', parameters: '', information: 'n/a', usage: 'preset active', example: 'preset active' },
    { name: 'preset boost', description: 'Enhances track with heightened bass and highs for a lively, energetic feel', aliases: 'n/a', parameters: '<setting>', information: 'n/a', usage: 'preset boost <setting>', example: ',preset boost True' },
    { name: 'preset metal', description: 'Amplifies midrange for a fuller, concert-like sound, ideal for metal track', aliases: 'n/a', parameters: '<setting>', information: 'n/a', usage: 'preset metal <setting>', example: ',preset metal True' },
    { name: 'preset karaoke', description: 'Filters out vocals from the track, leaving only the instrumental', aliases: 'n/a', parameters: '<setting>', information: 'n/a', usage: 'preset karaoke <setting>', example: ',preset karaoke True' },
    { name: 'preset soft', description: 'Cuts high and mid frequencies, allowing only low frequencies', aliases: 'n/a', parameters: '<setting>', information: 'n/a', usage: 'preset soft <setting>', example: ',preset soft True' },
    { name: 'preset 8d', description: 'Creates a stereo-like panning effect, rotating audio for immersive sound', aliases: 'n/a', parameters: '<setting>', information: 'n/a', usage: 'preset 8d <setting>', example: ',preset 8d True' },
    { name: 'preset flat', description: 'Represents a normal EQ setting with default levels across the board', aliases: 'n/a', parameters: '<setting>', information: 'n/a', usage: 'preset flat <setting>', example: ',preset flat True' }
  ],

  run: async (client, message, args) => {
  if ((args[0]||'').toLowerCase() === 'vibrato') {
    const subArgs = args.slice(1);
      return info(message, `preset vibrato`, `Introduces a wavering pitch effect for dynamic tone (params: setting)`);
  }
  if ((args[0]||'').toLowerCase() === 'piano') {
    const subArgs = args.slice(1);
      return info(message, `preset piano`, `Enhances mid and high tones for standout piano-based tracks (params: setting)`);
  }
  if ((args[0]||'').toLowerCase() === 'nightcore') {
    const subArgs = args.slice(1);
      return info(message, `preset nightcore`, `Accelerates track playback for nightcore-style music (params: setting)`);
  }
  if ((args[0]||'').toLowerCase() === 'chipmunk') {
    const subArgs = args.slice(1);
      return info(message, `preset chipmunk`, `Accelerates track playback to produce a high-pitched, chipmunk-like sound (params: setting)`);
  }
  if ((args[0]||'').toLowerCase() === 'vaporwave') {
    const subArgs = args.slice(1);
      return info(message, `preset vaporwave`, `Slows track playback for nostalgic and vintage half-speed effect (params: setting)`);
  }
  if ((args[0]||'').toLowerCase() === 'active') {
    const subArgs = args.slice(1);
      return info(message, `preset active`, `List all currently applied filters`);
  }
  if ((args[0]||'').toLowerCase() === 'boost') {
    const subArgs = args.slice(1);
      return info(message, `preset boost`, `Enhances track with heightened bass and highs for a lively, energetic feel (params: setting)`);
  }
  if ((args[0]||'').toLowerCase() === 'metal') {
    const subArgs = args.slice(1);
      return info(message, `preset metal`, `Amplifies midrange for a fuller, concert-like sound, ideal for metal track (params: setting)`);
  }
  if ((args[0]||'').toLowerCase() === 'karaoke') {
    const subArgs = args.slice(1);
      return info(message, `preset karaoke`, `Filters out vocals from the track, leaving only the instrumental (params: setting)`);
  }
  if ((args[0]||'').toLowerCase() === 'soft') {
    const subArgs = args.slice(1);
      return info(message, `preset soft`, `Cuts high and mid frequencies, allowing only low frequencies (params: setting)`);
  }
  if ((args[0]||'').toLowerCase() === '8d') {
    const subArgs = args.slice(1);
      return info(message, `preset 8d`, `Creates a stereo-like panning effect, rotating audio for immersive sound (params: setting)`);
  }
  if ((args[0]||'').toLowerCase() === 'flat') {
    const subArgs = args.slice(1);
      return info(message, `preset flat`, `Represents a normal EQ setting with default levels across the board (params: setting)`);
  }
    return info(message, `preset`, `Use a preset for Music`);
  }
};
