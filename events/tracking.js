const client = require('../bleed');
const db = require('../db');

client.on('guildMemberAdd', member => {
  if (!db.get(`tracking_${member.guild.id}`)) return;

  db.add(`tracking_joins_${member.guild.id}`, 1);

  const events = db.get(`tracking_events_${member.guild.id}`) || [];
  events.push({ type: 'join', userId: member.id, username: member.user.username, timestamp: Date.now() });
  if (events.length > 100) events.shift();
  db.set(`tracking_events_${member.guild.id}`, events);
});

client.on('guildMemberRemove', member => {
  if (!db.get(`tracking_${member.guild.id}`)) return;

  db.add(`tracking_leaves_${member.guild.id}`, 1);

  const events = db.get(`tracking_events_${member.guild.id}`) || [];
  events.push({ type: 'leave', userId: member.id, username: member.user.username, timestamp: Date.now() });
  if (events.length > 100) events.shift();
  db.set(`tracking_events_${member.guild.id}`, events);
});
