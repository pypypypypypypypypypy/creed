/**
 * downloadvmemojis — one-time script to download high-quality VoiceMaster emojis
 * from the official VoiceMaster bot and save them to emojis_processed/
 * 
 * Run once: node owner/downloadvmemojis.js
 * After running, uploademojis will automatically use these local files.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// VoiceMaster bot emoji IDs (from the official VoiceMaster bot: 493716749342998541)
// These are the high-quality versions shown in the VoiceMaster interface screenshot
const VM_EMOJIS = [
  { key: 'vm_lock',       id: '1493709705342750771' },
  { key: 'vm_unlock',     id: '1493709711323828317' },
  { key: 'vm_ghost',      id: '1493709716730155058' },
  { key: 'vm_reveal',     id: '1493709721318719529' },
  { key: 'vm_claim',      id: '1493709726142300370' },
  { key: 'vm_disconnect', id: '1493709730856570890' },
  { key: 'vm_activity',   id: '1493709735155859608' },
  { key: 'vm_info',       id: '1493709739669065780' },
  { key: 'vm_increase',   id: '1493709743800320113' },
  { key: 'vm_decrease',   id: '1493709761865322588' },
];

function download(id) {
  return new Promise((resolve, reject) => {
    const url = `https://cdn.discordapp.com/emojis/${id}.png?size=128&quality=lossless`;
    https.get(url, { timeout: 10000 }, res => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${id}`));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject).on('timeout', () => reject(new Error('timeout')));
  });
}

(async () => {
  const outDir = path.join(__dirname, '..', 'emojis_processed');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log('Downloading VoiceMaster emojis...\n');

  for (const { key, id } of VM_EMOJIS) {
    const outPath = path.join(outDir, `${key}.png`);
    try {
      const data = await download(id);
      fs.writeFileSync(outPath, data);
      console.log(`✅  ${key} (${data.length} bytes) → emojis_processed/${key}.png`);
    } catch (e) {
      console.log(`❌  ${key} — ${e.message}`);
    }
  }

  console.log('\nDone! Run ,uploademojis to upload them as global application emojis.');
})();
