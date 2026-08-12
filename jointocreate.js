const config = require("./config");
const db = require("./db");
const { ChannelType, PermissionFlagsBits } = require("discord.js");

function parseEmoji(str) {
  const custom = str.match(/^<a?:(\w+):(\d+)>$/);
  if (custom) return { name: custom[1], id: custom[2] };
  return str;
}

function getEmojis() {
  delete require.cache[require.resolve('./emojis.json')];
  return require('./emojis.json');
}
const jointocreatemap = new Map();
const pendingJoins = new Set();

function logVoiceMasterError(action, error, guildId) {
  const detail = error?.message || String(error || 'unknown error');
  console.error(`[voicemaster] ${action} failed in guild ${guildId}: ${detail}`);
}

module.exports = function (client) {
  setInterval(() => {
    try {
      for (const [key, channelId] of jointocreatemap) {
        const parts = key.split('_');
        const guildId = parts[2];
        const guild = client.guilds.cache.get(guildId);
        if (!guild) { jointocreatemap.delete(key); continue; }
        const vc = guild.channels.cache.get(channelId);
        if (!vc || vc.members.size < 1) {
          jointocreatemap.delete(key);
          db.delete(`vm_owner_${guildId}_${channelId}`);
          if (vc) vc.delete().catch(() => {});
        }
      }
    } catch {}
  }, 10000);

  function tryDeleteIfEmpty(guild, channelId) {
    const vc = guild.channels.cache.get(channelId);
    if (db.get(`vm_owner_${guild.id}_${channelId}`) === null) return;
    if (!vc || vc.members.size < 1) {
      const key = `tempvoicechannel_${guild.id}_${channelId}`;
      jointocreatemap.delete(key);
      db.delete(`vm_owner_${guild.id}_${channelId}`);
      if (vc) vc.delete().catch(() => {});
    }
  }

  client.on("voiceStateUpdate", async (oldState, newState) => {
    if (!newState.guild) return;

    if (!oldState.channelId && newState.channelId) {
      const vmChannelId = db.get(`vm_join_channel_${newState.guild.id}`) || config.JOINTOCREATECHANNEL;
      if (newState.channelId === vmChannelId) {
        await jointocreatechannel(newState).catch((error) => {
          logVoiceMasterError('creating a voice channel', error, newState.guild.id);
        });
      }
    }

    if (oldState.channelId && !newState.channelId) {
      tryDeleteIfEmpty(oldState.guild, oldState.channelId);

      const joinRoleId = db.get(`vm_joinrole_${oldState.guild.id}`);
      if (joinRoleId) {
        const role = oldState.guild.roles.cache.get(joinRoleId);
        if (role) oldState.member.roles.remove(role).catch(() => {});
      }
    }

    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      const vmChannelId = db.get(`vm_join_channel_${newState.guild.id}`) || config.JOINTOCREATECHANNEL;
      if (newState.channelId === vmChannelId) {
        await jointocreatechannel(newState).catch((error) => {
          logVoiceMasterError('creating a voice channel', error, newState.guild.id);
        });
      }

      tryDeleteIfEmpty(oldState.guild, oldState.channelId);
    }

    if (newState.channelId) {
      const joinRoleId = db.get(`vm_joinrole_${newState.guild.id}`);
      if (joinRoleId && db.get(`vm_owner_${newState.guild.id}_${newState.channelId}`) !== null) {
        const role = newState.guild.roles.cache.get(joinRoleId);
        if (role) newState.member.roles.add(role).catch(() => {});
      }
    }
  });

  async function jointocreatechannel(state) {
    const guildId = state.guild.id;
    const memberId = state.member?.id;
    const sourceChannel = state.channel;
    if (!memberId || !sourceChannel) return;

    const pendingKey = `${guildId}:${memberId}`;
    if (pendingJoins.has(pendingKey)) return;
    pendingJoins.add(pendingKey);

    try {
      const me = state.guild.members.me || await state.guild.members.fetch(client.user.id).catch(() => null);
      if (!me) throw new Error('unable to resolve the bot member in this guild');
      const missingPermissions = [
        ['ManageChannels', PermissionFlagsBits.ManageChannels],
        ['MoveMembers', PermissionFlagsBits.MoveMembers],
      ].filter(([, permission]) => !me.permissions.has(permission)).map(([name]) => name);

      if (missingPermissions.length) {
        throw new Error(`bot is missing ${missingPermissions.join(' and ')} permission${missingPermissions.length > 1 ? 's' : ''}`);
      }

      const defaultName = db.get(`vm_default_name_${guildId}`) || `{user}'s channel`;
      const name = defaultName.replace('{user}', state.member.user.username);
      const configuredBitrate = Number(db.get(`vm_default_bitrate_${guildId}`) || 64000);
      const bitrate = Math.min(Math.max(Number.isFinite(configuredBitrate) ? configuredBitrate : 64000, 8000), 384000);
      const defaultRegion = db.get(`vm_default_region_${guildId}`);
      const parentId = sourceChannel.parentId || sourceChannel.parent?.id;

      const vc = await state.guild.channels.create({
        name,
        type: ChannelType.GuildVoice,
        ...(parentId ? { parent: parentId } : {}),
        bitrate,
        ...(defaultRegion ? { rtcRegion: defaultRegion } : {}),
        permissionOverwrites: [
          { id: state.member.id, allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel] },
          { id: state.guild.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect] },
        ],
      });

      const key = `tempvoicechannel_${vc.guild.id}_${vc.id}`;
      jointocreatemap.set(key, vc.id);
      db.set(`vm_owner_${guildId}_${vc.id}`, state.member.id);

      try {
        await state.setChannel(vc);
      } catch (error) {
        jointocreatemap.delete(key);
        db.delete(`vm_owner_${guildId}_${vc.id}`);
        await vc.delete().catch(() => {});
        throw error;
      }

      const defaultRoleId = db.get(`vm_default_role_${guildId}`);
      if (defaultRoleId) {
        const role = state.guild.roles.cache.get(defaultRoleId);
        if (role) state.member.roles.add(role).catch((error) => logVoiceMasterError('adding the VoiceMaster role', error, guildId));
      }
    } finally {
      pendingJoins.delete(pendingKey);
    }
  }
};
