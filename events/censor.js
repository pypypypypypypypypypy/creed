const client = require('../bleed');
const db = require('../db');

client.on('messageCreate', async message => {
  if (!message.guild || message.author.bot) return;
  if (message.member?.permissions.has(8n)) return;

  const list = db.get(`censor_${message.guild.id}`);
  if (!list || !list.length) return;

  const content = message.content.toLowerCase();
  const matched = list.find(word => content.includes(word));
  if (!matched) return;

  await message.delete().catch(() => {});

  message.author.send(`Your message in **${message.guild.name}** was deleted because it contained a censored word.`).catch(() => {});
});
