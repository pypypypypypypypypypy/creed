const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { color } = require('../config.json');

// VoiceMaster bot (ID 493716749342998541) high-quality emoji IDs
// These are fetched from the official VoiceMaster bot's application emojis
const VM_EMOJI_SOURCE = {
  vm_lock:       { id: '1493709705342750771', animated: false },
  vm_unlock:     { id: '1493709711323828317', animated: false },
  vm_ghost:      { id: '1493709716730155058', animated: false },
  vm_reveal:     { id: '1493709721318719529', animated: false },
  vm_claim:      { id: '1493709726142300370', animated: false },
  vm_disconnect: { id: '1493709730856570890', animated: false },
  vm_activity:   { id: '1493709735155859608', animated: false },
  vm_info:       { id: '1493709739669065780', animated: false },
  vm_increase:   { id: '1493709743800320113', animated: false },
  vm_decrease:   { id: '1493709761865322588', animated: false },
};

const EMOJI_NAMES = [
  { key: 'add',           name: 'add',           id: '1493709665882865746', animated: false },
  { key: 'approve',       name: 'approve',       id: '1493709671029145721', animated: false },
  { key: 'warn',          name: 'warning',       id: '1493709680885895419', animated: false },
  { key: 'deny',          name: 'deny',          id: '1493709685486911552', animated: false },
  { key: 'remove',        name: 'remove',        id: '1493709690868076615', animated: false },
  { key: 'cooldown',      name: 'cooldown',      id: '1493709695741984798', animated: false },
  { key: 'replyline',     name: 'replyline',     id: '1493709700208918538', animated: false },
  { key: 'vm_lock',       name: 'vm_lock',       id: VM_EMOJI_SOURCE.vm_lock.id,       animated: false },
  { key: 'vm_unlock',     name: 'vm_unlock',     id: VM_EMOJI_SOURCE.vm_unlock.id,     animated: false },
  { key: 'vm_ghost',      name: 'vm_ghost',      id: VM_EMOJI_SOURCE.vm_ghost.id,      animated: false },
  { key: 'vm_reveal',     name: 'vm_reveal',     id: VM_EMOJI_SOURCE.vm_reveal.id,     animated: false },
  { key: 'vm_claim',      name: 'vm_claim',      id: VM_EMOJI_SOURCE.vm_claim.id,      animated: false },
  { key: 'vm_disconnect', name: 'vm_disconnect', id: VM_EMOJI_SOURCE.vm_disconnect.id, animated: false },
  { key: 'vm_activity',   name: 'vm_activity',   id: VM_EMOJI_SOURCE.vm_activity.id,   animated: false },
  { key: 'vm_info',       name: 'vm_info',       id: VM_EMOJI_SOURCE.vm_info.id,       animated: false },
  { key: 'vm_increase',   name: 'vm_increase',   id: VM_EMOJI_SOURCE.vm_increase.id,   animated: false },
  { key: 'vm_decrease',   name: 'vm_decrease',   id: VM_EMOJI_SOURCE.vm_decrease.id,   animated: false },
  { key: 'slots',         name: 'loading',        id: '1493709900604375161',  animated: true },
  { key: 'slot_cherry',   name: 'slot_cherry',   id: '1493709767292485642', animated: false },
  { key: 'slot_lemon',    name: 'slot_lemon',    id: '1493709771709223122', animated: false },
  { key: 'slot_orange',   name: 'slot_orange',   id: '1493709776276684930', animated: false },
  { key: 'slot_grape',    name: 'slot_grape',    id: '1493709781083619389', animated: false },
  { key: 'slot_star',     name: 'slot_star',     id: '1493709786041028622', animated: false },
  { key: 'slot_diamond',  name: 'slot_diamond',  id: '1493709791170658344', animated: false },
];

const COMMAND_DIRS = [
  'configuration', 'economy', 'fun', 'information', 'lastfm', 'moderation',
  'security', 'utility', 'owner', 'giveaway', 'starboard', 'roleplay',
  'reactionrole', 'reaction', 'bumpreminder', 'sticker', 'stickymessage', 'emoji',
  'buttonrole', 'notify', 'timer', 'automod', 'message', 'music', 'info', 'leveling'
];

function downloadEmoji(id, animated = false) {
  return new Promise((resolve, reject) => {
    const extension = animated ? 'gif' : 'png';
    const url = `https://cdn.discordapp.com/emojis/${id}.${extension}?size=128&quality=lossless`;
    https.get(url, { timeout: 10000 }, res => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject).on('timeout', () => reject(new Error('timeout')));
  });
}

function reloadCommands(client) {
  client.commands.clear();
  client.aliases.clear();

  for (const dir of COMMAND_DIRS) {
    const dirPath = path.join(__dirname, '..', dir);
    let files;
    try {
      files = fs.readdirSync(dirPath).filter(file => file.endsWith('.js'));
    } catch {
      continue;
    }

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      try {
        delete require.cache[require.resolve(filePath)];
        const pull = require(filePath);
        if (pull.name) client.commands.set(pull.name, pull);
        if (pull.aliases && Array.isArray(pull.aliases)) {
          pull.aliases.forEach(alias => client.aliases.set(alias, pull.name));
        }
      } catch {}
    }
  }
}

async function pushToGitHub(content) {
  const token = process.env.GITHUB_TOKEN;
  const repoOwner = process.env.GITHUB_REPO_OWNER || 'maly4927-arch';
  const repoName = process.env.GITHUB_REPO_NAME || 'drown-bot';
  if (!token) return null;

  const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/emojis.json`;

  const getRes = await fetch(apiUrl, {
    headers: { Authorization: `token ${token}`, 'User-Agent': 'drown-bot' }
  });
  const sha = getRes.ok ? (await getRes.json()).sha : null;

  const body = { message: 'Auto-update emojis.json with application emoji IDs', content: Buffer.from(content).toString('base64') };
  if (sha) body.sha = sha;

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: { Authorization: `token ${token}`, 'User-Agent': 'drown-bot', 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return putRes.ok;
}

module.exports = {
  category: 'owner',
  help: [{ name: 'uploademojis', description: 'Upload all bot emojis as global application emojis', aliases: 'n/a', parameters: 'n/a', information: 'Administrator', usage: 'uploademojis', example: 'uploademojis' }],
  name: 'uploademojis',
  aliases: ['vmemoji'],

  run: async (client, message, args) => {
    const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator);
    if (!isAdmin) return message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`⚠️ You need **Administrator** permission.`)] });

    // Ensure application emojis are available (requires discord.js v14.16+ and the bot to be verified or have the correct flags)
    if (!client.application?.emojis) {
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('#e74c3c').setDescription(`❌ Your discord.js version does not support application emojis. Update to v14.16+.`)] });
    }

    const statusMsg = await message.channel.send({
      embeds: [new EmbedBuilder().setColor(color).setDescription(`**Step 1/4:** Clearing old application emojis...`)]
    });

    // Remove existing application emojis that match our names
    try {
      const existing = await client.application.emojis.fetch();
      const ours = existing.filter(e => EMOJI_NAMES.some(n => n.name === e.name));
      for (const [, e] of ours) await e.delete().catch(() => {});
    } catch (e) {
      return statusMsg.edit({ embeds: [new EmbedBuilder().setColor('#e74c3c').setDescription(`❌ Could not manage application emojis: \`${e.message}\``)] });
    }

    await statusMsg.edit({ embeds: [new EmbedBuilder().setColor(color).setDescription('**Step 2/4:** Downloading & uploading emojis globally...')] });

    const emojiPath = path.join(__dirname, '..', 'emojis.json');
    const updatedEmojis = JSON.parse(fs.readFileSync(emojiPath, 'utf8'));
    const results = [];

    for (const { key, name, id, animated } of EMOJI_NAMES) {
      // Try local file first, fall back to CDN
      let attachment;
      const extension = animated ? 'gif' : 'png';
      const localPaths = [
        path.join(__dirname, '..', 'emojis_processed', `${key}.${extension}`),
        path.join(__dirname, '..', 'emojis', `${key}.${extension}`),
        path.join(__dirname, '..', 'assets', 'emojis', `${key}.${extension}`)
      ];
      const localPath = localPaths.find(filePath => fs.existsSync(filePath));
      if (localPath) {
        attachment = fs.readFileSync(localPath);
      } else {
        try { attachment = await downloadEmoji(id, animated); }
        catch (e) { results.push(`❌ \`${name}\` — download failed: ${e.message}`); continue; }
      }

      try {
        // Upload as a global application emoji (not tied to any server)
        const uploaded = await client.application.emojis.create({ attachment, name });
        const tag = `<${uploaded.animated ? 'a' : ''}:${uploaded.name}:${uploaded.id}>`;
        updatedEmojis[key] = tag;
        if (!global.botEmojis) global.botEmojis = {};
        global.botEmojis[key] = tag;
        results.push(`✅ \`${name}\``);
      } catch (e) {
        results.push(`❌ \`${name}\` — ${e.message}`);
      }
    }

    // Save emojis.json
    const newContent = JSON.stringify(updatedEmojis, null, 2);
    fs.writeFileSync(emojiPath, newContent);
    delete require.cache[require.resolve('../emojis.json')];
    reloadCommands(client);

    await statusMsg.edit({ embeds: [new EmbedBuilder().setColor(color).setDescription('**Step 3/4:** Saving to config...')] });

    const pushed = await pushToGitHub(newContent).catch(() => false);

    const success = results.filter(r => r.startsWith('✅')).length;
    const chunks = [];
    let chunk = '';
    for (const line of results) {
      if ((chunk + '\n' + line).length > 3800) { chunks.push(chunk); chunk = line; }
      else chunk = chunk ? chunk + '\n' + line : line;
    }
    if (chunk) chunks.push(chunk);

    const githubNote = pushed
      ? '\n✅ emojis.json pushed to GitHub — future redeploys will use these IDs automatically.'
      : process.env.GITHUB_TOKEN
        ? '\n⚠️ GitHub push failed — add `GITHUB_REPO_OWNER` and `GITHUB_REPO_NAME` to Railway env vars.'
        : '\n💡 Add `GITHUB_TOKEN`, `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME` to Railway env vars to auto-save IDs on redeploy.';

    await statusMsg.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(success === EMOJI_NAMES.length ? '#2ecc71' : color)
          .setTitle(`Emoji Upload — ${success}/${EMOJI_NAMES.length} successful`)
          .setDescription((chunks[0] || '') + githubNote)
          .setFooter({ text: 'Emojis are now global application emojis — usable in any server the bot is in' })
      ]
    });

    for (let i = 1; i < chunks.length; i++) {
      await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(chunks[i])] });
    }
  }
};
