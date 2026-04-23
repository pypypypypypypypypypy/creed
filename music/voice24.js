const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  NoSubscriberBehavior,
  StreamType,
} = require('@discordjs/voice');
const ffmpegPath = require('ffmpeg-static');
const { spawn } = require('child_process');
const db = require('../db');

const DEFAULT_STREAM = 'http://ice1.somafm.com/groovesalad-128-mp3';
const DB_KEY = '__vc24_sessions';
const sessions = new Map();

function getSaved() {
  return db.get(DB_KEY) || {};
}
function saveSession(guildId, data) {
  const all = getSaved();
  all[guildId] = data;
  db.set(DB_KEY, all);
}
function removeSession(guildId) {
  const all = getSaved();
  delete all[guildId];
  db.set(DB_KEY, all);
}

function makeResource(streamUrl) {
  const ff = spawn(ffmpegPath, [
    '-reconnect', '1',
    '-reconnect_streamed', '1',
    '-reconnect_delay_max', '5',
    '-i', streamUrl,
    '-analyzeduration', '0',
    '-loglevel', '0',
    '-f', 's16le',
    '-ar', '48000',
    '-ac', '2',
    'pipe:1',
  ], { stdio: ['ignore', 'pipe', 'ignore'] });

  ff.on('error', () => {});
  return { resource: createAudioResource(ff.stdout, { inputType: StreamType.Raw }), proc: ff };
}

function start(client, guildId, channelId, streamUrl = DEFAULT_STREAM) {
  stop(guildId);

  const guild = client.guilds.cache.get(guildId);
  if (!guild) return false;
  const channel = guild.channels.cache.get(channelId);
  if (!channel || (channel.type !== 2 && channel.type !== 13)) return false;

  const connection = joinVoiceChannel({
    channelId,
    guildId,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: true,
    selfMute: false,
  });

  const player = createAudioPlayer({
    behaviors: { noSubscriber: NoSubscriberBehavior.Play },
  });

  const session = { connection, player, channelId, streamUrl, proc: null, destroyed: false };
  sessions.set(guildId, session);

  const playStream = () => {
    if (session.destroyed) return;
    if (session.proc) { try { session.proc.kill('SIGKILL'); } catch {} }
    const { resource, proc } = makeResource(streamUrl);
    session.proc = proc;
    player.play(resource);
  };

  player.on(AudioPlayerStatus.Idle, () => {
    if (!session.destroyed) setTimeout(playStream, 1000);
  });
  player.on('error', () => {
    if (!session.destroyed) setTimeout(playStream, 2000);
  });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    if (session.destroyed) return;
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5000),
      ]);
    } catch {
      try { connection.destroy(); } catch {}
      setTimeout(() => {
        if (!session.destroyed) start(client, guildId, channelId, streamUrl);
      }, 3000);
    }
  });

  connection.subscribe(player);
  playStream();

  saveSession(guildId, { channelId, streamUrl });
  return true;
}

function stop(guildId) {
  const s = sessions.get(guildId);
  if (s) {
    s.destroyed = true;
    try { s.player.stop(true); } catch {}
    try { if (s.proc) s.proc.kill('SIGKILL'); } catch {}
    try { s.connection.destroy(); } catch {}
    sessions.delete(guildId);
  }
  removeSession(guildId);
}

async function restoreAll(client) {
  const all = getSaved();
  let restored = 0;
  for (const [guildId, data] of Object.entries(all)) {
    try {
      if (start(client, guildId, data.channelId, data.streamUrl || DEFAULT_STREAM)) restored++;
    } catch {}
  }
  if (restored) console.log(`Restored ${restored} 24/7 voice session(s).`);
}

module.exports = { start, stop, restoreAll, DEFAULT_STREAM };
