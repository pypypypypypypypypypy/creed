const { EmbedBuilder, ChannelType } = require('discord.js');
const { color } = require('../config.json');
const { warn, approve } = require('../emojis.json');
const voice24 = require('../music/voice24');
const { canRunOwnerCmd } = require('../utils/owners');

const VOICE_TYPES = new Set([ChannelType.GuildVoice, ChannelType.GuildStageVoice]);

async function resolveChannel(message, arg) {
  if (!message.guild) return null;
  if (!arg) {
    const m = await message.guild.members.fetch(message.author.id).catch(() => null);
    return m?.voice?.channel || null;
  }

  const mentioned = message.mentions.channels.first();
  if (mentioned && VOICE_TYPES.has(mentioned.type)) return mentioned;

  const id = arg.replace(/[<#>]/g, '').trim();
  if (/^\d{17,20}$/.test(id)) {
    const cached = message.guild.channels.cache.get(id);
    if (cached) return cached;
    const fetched = await message.guild.channels.fetch(id).catch(() => null);
    if (fetched) return fetched;
  }

  const lower = arg.toLowerCase();
  return (
    message.guild.channels.cache.find(c => VOICE_TYPES.has(c.type) && c.name.toLowerCase() === lower) ||
    message.guild.channels.cache.find(c => VOICE_TYPES.has(c.type) && c.name.toLowerCase().includes(lower)) ||
    null
  );
}

module.exports = {
  category: 'owner',
  help: [
    {
      name: 'vc',
      description: 'Owner only: join a voice channel forever and play 24/7 music',
      aliases: 'n/a',
      parameters: '(channel)',
      information: 'BOT_OWNER',
      usage: 'vc (channel id, mention, or name) — defaults to your current voice channel',
      example: 'vc #general',
    },
  ],

  name: 'vc',
  aliases: [],
  category: 'owner',

  run: async (client, message, args) => {
    if (!canRunOwnerCmd(message.author.id, 'vc')) return;
    if (!message.guild) return;

    const arg = args[0];

    if (arg && (arg.toLowerCase() === 'stop' || arg.toLowerCase() === 'leave')) {
      voice24.stop(message.guild.id);
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Stopped the 24/7 voice session.`)],
      });
    }

    const channel = await resolveChannel(message, arg);
    if (!channel) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Could not find that channel. Pass a voice-channel ID, mention, or name — or join a voice channel and run \`,vc\` with no arguments.`)],
      });
    }
    if (!VOICE_TYPES.has(channel.type)) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: <#${channel.id}> is type \`${channel.type}\` — not a voice channel.`)],
      });
    }

    const me = message.guild.members.me || await message.guild.members.fetchMe().catch(() => null);
    const perms = me ? channel.permissionsFor(me) : null;
    if (perms && (!perms.has('Connect') || !perms.has('Speak'))) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Missing **Connect** or **Speak** permission in ${channel}.`)],
      });
    }

    let ok = false;
    let errMsg = '';
    try {
      ok = voice24.start(client, message.guild.id, channel.id);
    } catch (e) {
      errMsg = e?.message || String(e);
    }
    if (!ok) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Failed to join ${channel}${errMsg ? ` — \`${errMsg}\`` : ''}.`)],
      });
    }

    return message.channel.send({
      embeds: [new EmbedBuilder().setColor('#a3eb7b').setDescription(`${approve} ${message.author}: Joined ${channel} and started 24/7 playback. Bot will rejoin automatically if disconnected or restarted.`)],
    });
  },
};
