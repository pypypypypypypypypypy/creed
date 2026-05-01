// Shared Components V2 builder for social-media post/profile embeds.
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

function colorToInt(c) {
  if (typeof c === 'number') return c >>> 0;
  if (typeof c === 'string') { const n = parseInt(c.replace(/^#/, ''), 16); if (!isNaN(n)) return n; }
  return 0xFFFFFF;
}

function fmtK(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v === 0) return '0';
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return v.toLocaleString('en-US');
}

/**
 * Build a Components V2 container that matches the reference layout:
 *   [media image / cover]
 *   [author avatar ← section → author name (@handle)]
 *   [caption text]
 *   ─────────────────
 *   [stats row]
 *   [View on X link button]
 *
 * @param {object} opts
 * @param {string} [opts.mediaUrl]       Cover/thumbnail image URL
 * @param {string} [opts.authorAvatar]   Small avatar URL shown as section thumbnail
 * @param {string} [opts.authorName]     Display name
 * @param {string} [opts.authorHandle]   @handle (without @)
 * @param {string} [opts.authorUrl]      Profile link
 * @param {string} [opts.caption]        Post caption / bio (already formatted)
 * @param {string} [opts.stats]          Pre-formatted stats line e.g. "❤️ 1k • 🌐 2k"
 * @param {string} [opts.linkUrl]        "View on …" URL
 * @param {string} [opts.linkLabel]      "View on TikTok" / "View on Instagram" etc.
 * @param {string|number} [opts.accent]  Accent color (hex or int)
 */
function buildSocialContainer(opts) {
  const c = new ContainerBuilder();
  if (opts.accent != null) c.setAccentColor(colorToInt(opts.accent));

  if (opts.mediaUrl) {
    c.addMediaGalleryComponents((g) => g.addItems((i) => i.setURL(opts.mediaUrl)));
  }

  const authorLine =
    (opts.authorName ? `**${opts.authorName}**` : '') +
    (opts.authorHandle ? ` ([@${opts.authorHandle}](${opts.authorUrl || `https://tiktok.com/@${opts.authorHandle}`}))` : '');

  if (authorLine) {
    if (opts.authorAvatar) {
      c.addSectionComponents((s) =>
        s.addTextDisplayComponents((td) => td.setContent(authorLine))
         .setThumbnailAccessory((t) => t.setURL(opts.authorAvatar))
      );
    } else {
      c.addTextDisplayComponents((td) => td.setContent(authorLine));
    }
  }

  if (opts.caption) {
    c.addTextDisplayComponents((td) => td.setContent(opts.caption));
  }

  if (opts.stats) {
    c.addSeparatorComponents((s) => s);
    c.addTextDisplayComponents((td) => td.setContent(opts.stats));
  }

  if (opts.linkUrl && opts.linkLabel) {
    c.addActionRowComponents((row) =>
      row.addComponents(
        new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(opts.linkLabel).setURL(opts.linkUrl)
      )
    );
  }

  return c;
}

module.exports = { buildSocialContainer, fmtK, colorToInt };
