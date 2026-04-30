const { readdirSync } = require("fs");
const path = require("path");

module.exports = (client) => {
  const dirs = [
    "configuration", "economy", "fun", "information", "lastfm", "moderation",
    "security", "utility", "owner", "giveaway", "starboard", "roleplay",
    "reactionrole", "reaction", "bumpreminder", "sticker", "stickymessage", "emoji",
    "buttonrole", "notify", "timer",
    "automod", "message", "music", "info", "leveling"
  ];

  let total = 0;
  const failed = [];
  const skipped = [];

  for (const dir of dirs) {
    const dirPath = path.join(__dirname, `../${dir}`);
    let files;
    try {
      files = readdirSync(dirPath).filter(f => f.endsWith(".js"));
    } catch {
      continue;
    }

    for (const file of files) {
      total++;
      const rel = `${dir}/${file}`;
      try {
        const pull = require(`../${dir}/${file}`);
        if (pull && pull.name) {
          client.commands.set(pull.name, pull);
          if (pull.aliases && Array.isArray(pull.aliases)) {
            pull.aliases.forEach(alias => client.aliases.set(alias, pull.name));
          }
        } else {
          skipped.push(rel);
        }
      } catch (e) {
        failed.push(rel);
        console.error(`\n[boot][cmds] !!! FAILED to load ${rel}`);
        console.error(e && e.stack ? e.stack : e);
      }
    }
  }

  console.log(`[boot][cmds] loaded ${client.commands.size} commands (${client.aliases.size} aliases) from ${total} files.`);
  if (skipped.length) {
    console.warn(`[boot][cmds] ${skipped.length} file(s) had no .name and were skipped: ${skipped.slice(0, 10).join(', ')}${skipped.length > 10 ? `, +${skipped.length - 10} more` : ''}`);
  }
  if (failed.length) {
    console.error(`[boot][cmds] !!! ${failed.length} command(s) failed to load: ${failed.join(', ')}`);
  }
};
