const client = require('../bored');
const db = require('../db');

const intervals = new Map();

client.on('clientReady', () => {
  setInterval(async () => {
    const dbData = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '../db_data.json'), 'utf8'));

    for (const key of Object.keys(dbData)) {
      if (!key.startsWith('autopfp_enabled_')) continue;
      if (!dbData[key]) continue;

      const guildId = key.replace('autopfp_enabled_', '');
      const channelId = db.get(`autopfp_channel_${guildId}`);
      const images = db.get(`autopfp_images_${guildId}`);
      const intervalMins = db.get(`autopfp_interval_${guildId}`) || 30;

      if (!channelId || !images || !images.length) continue;

      const lastPost = db.get(`autopfp_lastpost_${guildId}`) || 0;
      const now = Date.now();
      if (now - lastPost < intervalMins * 60 * 1000) continue;

      const channel = client.channels.cache.get(channelId);
      if (!channel) continue;

      let idx = db.get(`autopfp_index_${guildId}`) || 0;
      if (idx >= images.length) idx = 0;

      const imageUrl = images[idx];
      await channel.send({ files: [imageUrl] }).catch(() => {});

      db.set(`autopfp_index_${guildId}`, idx + 1);
      db.set(`autopfp_lastpost_${guildId}`, now);
    }
  }, 60 * 1000);
});
