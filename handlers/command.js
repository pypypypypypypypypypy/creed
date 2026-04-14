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

  for (const dir of dirs) {
    const dirPath = path.join(__dirname, `../${dir}`);
    let files;
    try {
      files = readdirSync(dirPath).filter(f => f.endsWith(".js"));
    } catch {
      continue;
    }

    for (const file of files) {
      try {
        const pull = require(`../${dir}/${file}`);
        if (pull.name) {
          client.commands.set(pull.name, pull);
        }
        if (pull.aliases && Array.isArray(pull.aliases)) {
          pull.aliases.forEach(alias => client.aliases.set(alias, pull.name));
        }
      } catch (e) {
        console.log(`Failed to load ${dir}/${file}:`, e.message);
      }
    }
  }

  console.log(`Loaded ${client.commands.size} commands.`);
};
