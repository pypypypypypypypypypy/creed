const { readdirSync } = require("fs");
const path = require("path");

module.exports = (client) => {
  const eventsPath = path.join(__dirname, "../events");
  const files = readdirSync(eventsPath).filter(f => f.endsWith(".js"));
  const failed = [];
  for (const file of files) {
    try {
      require(`../events/${file}`);
    } catch (e) {
      failed.push(file);
      console.error(`\n[boot][events] !!! FAILED to load events/${file}`);
      console.error(e && e.stack ? e.stack : e);
    }
  }
  const ok = files.length - failed.length;
  console.log(`[boot][events] loaded ${ok}/${files.length} events.`);
  if (failed.length) {
    console.error(`[boot][events] !!! ${failed.length} event(s) failed: ${failed.join(', ')}`);
  }
};
