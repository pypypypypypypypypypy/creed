const client = require('../index');
const db = require('../db');

client.on('messageCreate', message => {
  if (!message.guild || message.author.bot) return;

  const tracked = db.get(`wstats_tracked_${message.guild.id}`);
  if (!tracked || !tracked.length) return;

  const content = message.content.toLowerCase();
  const words = content.split(/\s+/);

  for (const word of tracked) {
    const occurrences = words.filter(w => w === word || w.replace(/[^a-z0-9]/gi, '') === word).length;
    if (occurrences > 0) {
      db.add(`wstats_${message.guild.id}_${word}_total`, occurrences);
      db.add(`wstats_${message.guild.id}_${word}_${message.author.id}`, occurrences);

      const top = db.get(`wstats_top_${message.guild.id}_${word}`) || {};
      top[message.author.id] = (top[message.author.id] || 0) + occurrences;
      db.set(`wstats_top_${message.guild.id}_${word}`, top);
    }
  }
});
