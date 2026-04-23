const { EmbedBuilder } = require('discord.js');

function applyVars(input, vars = {}) {
  if (!input) return input;
  let s = String(input);
  for (const [k, v] of Object.entries(vars)) {
    s = s.split(k).join(String(v));
  }
  return s;
}

function parseEmbed(rawInput, vars = {}) {
  if (!rawInput) return null;
  const input = applyVars(rawInput, vars);

  if (!input.includes('$v') && !input.trim().startsWith('{embed}')) {
    return { content: input, embeds: [] };
  }

  const parts = input.split('$v').map((p) => p.trim()).filter(Boolean);
  let hasEmbed = false;
  let content;
  const data = { fields: [] };

  for (const raw of parts) {
    const m = raw.match(/^\{([^:}\n]+)(?::\s*([\s\S]*))?\}$/);
    if (!m) continue;
    const key = m[1].trim().toLowerCase();
    const value = (m[2] ?? '').trim();

    switch (key) {
      case 'embed':
        hasEmbed = true; break;
      case 'content':
      case 'message':
      case 'text':
        content = value; break;
      case 'title':
        hasEmbed = true; data.title = value; break;
      case 'description':
      case 'desc':
        hasEmbed = true; data.description = value; break;
      case 'color':
      case 'colour':
        hasEmbed = true; data.color = value; break;
      case 'url':
        hasEmbed = true; data.url = value; break;
      case 'thumbnail':
      case 'thumb':
        hasEmbed = true; data.thumbnail = value; break;
      case 'image':
      case 'img':
        hasEmbed = true; data.image = value; break;
      case 'author':
        hasEmbed = true; data.author = value; break;
      case 'author_url':
      case 'author url':
        hasEmbed = true; data.authorUrl = value; break;
      case 'author_icon':
      case 'author icon':
        hasEmbed = true; data.authorIcon = value; break;
      case 'footer':
        hasEmbed = true; data.footer = value; break;
      case 'footer_icon':
      case 'footer icon':
        hasEmbed = true; data.footerIcon = value; break;
      case 'timestamp':
        hasEmbed = true;
        data.timestamp = value === '' || value === 'true' ? Date.now() : new Date(value).getTime();
        break;
      case 'field': {
        hasEmbed = true;
        const [name, val, inline] = value.split('&&').map((s) => s.trim());
        if (name) data.fields.push({ name, value: val || '\u200b', inline: inline === 'true' });
        break;
      }
    }
  }

  if (!hasEmbed) return { content: input, embeds: [] };

  const embed = new EmbedBuilder();
  if (data.title) embed.setTitle(data.title.slice(0, 256));
  if (data.description) embed.setDescription(data.description.slice(0, 4096));
  if (data.color) {
    try { embed.setColor(data.color); } catch {}
  }
  if (data.url) embed.setURL(data.url);
  if (data.thumbnail) embed.setThumbnail(data.thumbnail);
  if (data.image) embed.setImage(data.image);
  if (data.author) embed.setAuthor({ name: data.author.slice(0, 256), iconURL: data.authorIcon, url: data.authorUrl });
  if (data.footer) embed.setFooter({ text: data.footer.slice(0, 2048), iconURL: data.footerIcon });
  if (data.timestamp) embed.setTimestamp(data.timestamp);
  if (data.fields.length) embed.addFields(data.fields.slice(0, 25));

  return { content, embeds: [embed] };
}

function buildWelcomeVars(member) {
  const ord = (n) => {
    const s = ['th','st','nd','rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  return {
    '{user}': `<@${member.id}>`,
    '{user.mention}': `<@${member.id}>`,
    '{user.name}': member.user.username,
    '{user.tag}': member.user.tag,
    '{user.id}': member.id,
    '{user.avatar}': member.user.displayAvatarURL({ forceStatic: false, size: 1024 }),
    '{guild.name}': member.guild.name,
    '{guild.id}': member.guild.id,
    '{guild.icon}': member.guild.iconURL({ size: 1024 }) || '',
    '{membercount}': String(member.guild.memberCount),
    '{membercount.ordinal}': ord(member.guild.memberCount),
  };
}

function buildBoostVars(member) {
  return {
    '{user}': `<@${member.id}>`,
    '{user.mention}': `<@${member.id}>`,
    '{user.name}': member.user.username,
    '{user.tag}': member.user.tag,
    '{user.id}': member.id,
    '{user.avatar}': member.user.displayAvatarURL({ forceStatic: false, size: 1024 }),
    '{guild}': member.guild.name,
    '{guild.name}': member.guild.name,
    '{guild.id}': member.guild.id,
    '{guild.icon}': member.guild.iconURL({ size: 1024 }) || '',
    '{membercount}': String(member.guild.memberCount),
    '{boostcount}': String(member.guild.premiumSubscriptionCount ?? 0),
    '{boosttier}': String(member.guild.premiumTier ?? 0),
  };
}

module.exports = { parseEmbed, applyVars, buildWelcomeVars, buildBoostVars };
