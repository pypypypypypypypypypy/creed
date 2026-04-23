const emojis = require('../emojis.json');

function parseEmoji(tag) {
  const m = /^<(a)?:([a-zA-Z0-9_]+):(\d+)>$/.exec(tag || '');
  if (!m) return null;
  return { animated: !!m[1], name: m[2], id: m[3] };
}

function applyEmoji(button, key, fallbackLabel) {
  const e = parseEmoji(emojis[key]);
  if (e) button.setEmoji(e);
  else if (fallbackLabel != null) button.setLabel(fallbackLabel);
  return button;
}

module.exports = { parseEmoji, applyEmoji };
