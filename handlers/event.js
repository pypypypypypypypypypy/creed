const { readdirSync } = require("fs");
const path = require("path");

module.exports = (client) => {
  const eventsPath = path.join(__dirname, "../events");
  const files = readdirSync(eventsPath).filter(f => f.endsWith(".js"));
  for (const file of files) {
    try {
      require(`../events/${file}`);
    } catch (e) {
      console.log(`Failed to load event ${file}:`, e.message);
    }
  }
  console.log(`Loaded ${files.length} events.`);
};
