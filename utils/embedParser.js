const { EmbedBuilder } = require('discord.js');

function applyVars(input, vars = {}) {
  if (!input) return input;
  let s = String(input);
  for (const [k, v] of Object.entries(vars)) {
    s = s.split(k).join(String(v ?? ''));
  }
  return s;
}

// Build a full Bleed-style variable map from any source
// source can be a Message, GuildMember, or { user, guild, channel, member }
function buildVars(source) {
  let user = null, member = null, guild = null, channel = null;

  if (!source) return {};

  // GuildMember
  if (source.guild && source.user && source.roles) {
    member = source;
    user = source.user;
    guild = source.guild;
    channel = null;
  }
  // Message
  else if (source.author && source.guild) {
    user = source.author;
    member = source.member;
    guild = source.guild;
    channel = source.channel;
  }
  // Plain object { user, guild, channel, member }
  else {
    user = source.user || null;
    member = source.member || null;
    guild = source.guild || null;
    channel = source.channel || null;
  }

  const ord = (n) => {
    const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const ts = (date) => date ? `<t:${Math.floor(new Date(date).getTime() / 1000)}:F>` : '';
  const tsR = (date) => date ? `<t:${Math.floor(new Date(date).getTime() / 1000)}:R>` : '';

  const vars = {};

  // ── User variables ─────────────────────────────────────────────
  if (user) {
    const avatar = user.displayAvatarURL({ forceStatic: false, size: 1024 });
    const banner = user.bannerURL?.({ forceStatic: false, size: 1024 }) || '';

    vars['{user}']                  = `<@${user.id}>`;
    vars['{user.mention}']          = `<@${user.id}>`;
    vars['{user.name}']             = user.username;
    vars['{user.username}']         = user.username;
    vars['{user.tag}']              = user.tag || user.username;
    vars['{user.discriminator}']    = user.discriminator || '0';
    vars['{user.id}']               = user.id;
    vars['{user.avatar}']           = avatar;
    vars['{user.avatar_url}']       = avatar;
    vars['{user.banner}']           = banner;
    vars['{user.banner_url}']       = banner;
    vars['{user.created_at}']       = ts(user.createdAt);
    vars['{user.created_at.ago}']   = tsR(user.createdAt);
    vars['{user.bot}']              = user.bot ? 'Yes' : 'No';
  }

  // ── Member variables ───────────────────────────────────────────
  if (member) {
    const dispAvatar = member.displayAvatarURL?.({ forceStatic: false, size: 1024 }) || vars['{user.avatar}'] || '';
    const topRole = member.roles?.highest;

    vars['{member}']                = `<@${member.id || member.user?.id}>`;
    vars['{member.mention}']        = `<@${member.id || member.user?.id}>`;
    vars['{member.nickname}']       = member.nickname || member.user?.username || '';
    vars['{member.display_name}']   = member.displayName || member.user?.username || '';
    vars['{member.avatar}']         = dispAvatar;
    vars['{member.joined_at}']      = ts(member.joinedAt);
    vars['{member.joined_at.ago}']  = tsR(member.joinedAt);
    vars['{member.top_role}']       = topRole ? `<@&${topRole.id}>` : '';
    vars['{member.top_role.name}']  = topRole?.name || '';
    vars['{member.roles}']          = member.roles?.cache
      ? [...member.roles.cache.values()].filter(r => r.name !== '@everyone').map(r => `<@&${r.id}>`).join(', ') || 'None'
      : '';
    vars['{member.role_count}']     = member.roles?.cache ? String(member.roles.cache.size - 1) : '0';
    vars['{member.boosting}']       = member.premiumSince ? 'Yes' : 'No';
    vars['{member.boost_since}']    = member.premiumSince ? ts(member.premiumSince) : 'Not boosting';
  }

  // ── Guild variables ────────────────────────────────────────────
  if (guild) {
    const memberCount = guild.memberCount ?? 0;
    const owner = guild.members?.cache.get(guild.ownerId);

    vars['{guild}']                 = guild.name;
    vars['{guild.name}']            = guild.name;
    vars['{guild.id}']              = guild.id;
    vars['{guild.icon}']            = guild.iconURL({ size: 1024 }) || '';
    vars['{guild.icon_url}']        = guild.iconURL({ size: 1024 }) || '';
    vars['{guild.banner}']          = guild.bannerURL?.({ size: 1024 }) || '';
    vars['{guild.splash}']          = guild.splashURL?.({ size: 1024 }) || '';
    vars['{guild.count}']           = String(memberCount);
    vars['{guild.member_count}']    = String(memberCount);
    vars['{membercount}']           = String(memberCount);
    vars['{membercount.ordinal}']   = ord(memberCount);
    vars['{guild.owner}']           = owner ? `<@${guild.ownerId}>` : `<@${guild.ownerId}>`;
    vars['{guild.owner.id}']        = guild.ownerId;
    vars['{guild.boost_count}']     = String(guild.premiumSubscriptionCount ?? 0);
    vars['{boostcount}']            = String(guild.premiumSubscriptionCount ?? 0);
    vars['{guild.boost_tier}']      = String(guild.premiumTier ?? 0);
    vars['{boosttier}']             = String(guild.premiumTier ?? 0);
    vars['{guild.created_at}']      = ts(guild.createdAt);
    vars['{guild.created_at.ago}']  = tsR(guild.createdAt);
    vars['{guild.vanity}']          = guild.vanityURLCode ? `discord.gg/${guild.vanityURLCode}` : '';
    vars['{guild.description}']     = guild.description || '';
    vars['{guild.verification}']    = ['None','Low','Medium','High','Very High'][guild.verificationLevel] || '';
  }

  // ── Channel variables ──────────────────────────────────────────
  if (channel) {
    vars['{channel}']               = `<#${channel.id}>`;
    vars['{channel.mention}']       = `<#${channel.id}>`;
    vars['{channel.name}']          = channel.name || '';
    vars['{channel.id}']            = channel.id;
    vars['{channel.topic}']         = channel.topic || '';
    vars['{channel.created_at}']    = ts(channel.createdAt);
  }

  // ── Misc ───────────────────────────────────────────────────────
  vars['{unix}']    = String(Math.floor(Date.now() / 1000));
  vars['{date}']    = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  vars['{time}']    = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return vars;
}

// Legacy helpers — kept for backwards compatibility
function buildWelcomeVars(member) {
  return buildVars(member);
}

function buildBoostVars(member) {
  return buildVars(member);
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
      case 'embed':        hasEmbed = true; break;
      case 'content': case 'message': case 'text':
        content = value; break;
      case 'title':
        hasEmbed = true; data.title = value; break;
      case 'description': case 'desc':
        hasEmbed = true; data.description = value; break;
      case 'color': case 'colour':
        hasEmbed = true; data.color = value; break;
      case 'url':
        hasEmbed = true; data.url = value; break;
      case 'thumbnail': case 'thumb':
        hasEmbed = true; data.thumbnail = value; break;
      case 'image': case 'img':
        hasEmbed = true; data.image = value; break;
      case 'author':
        hasEmbed = true; data.author = value; break;
      case 'author_url': case 'author url':
        hasEmbed = true; data.authorUrl = value; break;
      case 'author_icon': case 'author icon':
        hasEmbed = true; data.authorIcon = value; break;
      case 'footer':
        hasEmbed = true; data.footer = value; break;
      case 'footer_icon': case 'footer icon':
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
  if (data.title)       embed.setTitle(data.title.slice(0, 256));
  if (data.description) embed.setDescription(data.description.slice(0, 4096));
  if (data.color)       { try { embed.setColor(data.color); } catch {} }
  if (data.url)         embed.setURL(data.url);
  if (data.thumbnail)   embed.setThumbnail(data.thumbnail);
  if (data.image)       embed.setImage(data.image);
  if (data.author)      embed.setAuthor({ name: data.author.slice(0, 256), iconURL: data.authorIcon, url: data.authorUrl });
  if (data.footer)      embed.setFooter({ text: data.footer.slice(0, 2048), iconURL: data.footerIcon });
  if (data.timestamp)   embed.setTimestamp(data.timestamp);
  if (data.fields.length) embed.addFields(data.fields.slice(0, 25));

  return { content, embeds: [embed] };
}

module.exports = { parseEmbed, applyVars, buildVars, buildWelcomeVars, buildBoostVars };
