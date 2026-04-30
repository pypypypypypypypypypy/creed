const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const moment = require('moment');
const { getErrorRecord } = require('../utils/errorEmbed');
const { canRunOwnerCmd } = require('../utils/owners');

// Curated Discord JSON error codes — covers what you'll actually see day-to-day.
// Reference: https://discord.com/developers/docs/topics/opcodes-and-status-codes#json
const JSON_ERRORS = {
  0:     ['GENERAL_ERROR',                       'General / unknown error.', 'Often a malformed request body or unsupported endpoint.'],
  10001: ['UNKNOWN_ACCOUNT',                     'Unknown account.', 'The user ID is wrong or the account is deleted.'],
  10002: ['UNKNOWN_APPLICATION',                 'Unknown application.', 'Application ID is wrong or the bot was deleted.'],
  10003: ['UNKNOWN_CHANNEL',                     'Unknown channel.', 'Channel was deleted or the bot is not in that channel\'s guild.'],
  10004: ['UNKNOWN_GUILD',                       'Unknown guild.', 'Bot is not in that guild, or the ID is wrong.'],
  10005: ['UNKNOWN_INTEGRATION',                 'Unknown integration.', ''],
  10006: ['UNKNOWN_INVITE',                      'Unknown invite.', 'Invite was deleted or already used.'],
  10007: ['UNKNOWN_MEMBER',                      'Unknown member.', 'User is not in that guild.'],
  10008: ['UNKNOWN_MESSAGE',                     'Unknown message.', 'Message was deleted, or wrong channel/ID.'],
  10009: ['UNKNOWN_OVERWRITE',                   'Unknown permission overwrite.', ''],
  10010: ['UNKNOWN_PROVIDER',                    'Unknown provider.', ''],
  10011: ['UNKNOWN_ROLE',                        'Unknown role.', 'Role was deleted, or wrong guild.'],
  10012: ['UNKNOWN_TOKEN',                       'Unknown token.', ''],
  10013: ['UNKNOWN_USER',                        'Unknown user.', 'User ID is wrong or account deleted.'],
  10014: ['UNKNOWN_EMOJI',                       'Unknown emoji.', 'Emoji was deleted or the bot can\'t see its server.'],
  10015: ['UNKNOWN_WEBHOOK',                     'Unknown webhook.', ''],
  10026: ['UNKNOWN_BAN',                         'Unknown ban.', 'User is not banned.'],
  10027: ['UNKNOWN_SKU',                         'Unknown SKU.', ''],
  10028: ['UNKNOWN_STORE_LISTING',               'Unknown store listing.', ''],
  10029: ['UNKNOWN_ENTITLEMENT',                 'Unknown entitlement.', ''],
  10030: ['UNKNOWN_BUILD',                       'Unknown build.', ''],
  10036: ['UNKNOWN_LOBBY',                       'Unknown lobby.', ''],
  10037: ['UNKNOWN_BRANCH',                      'Unknown branch.', ''],
  10038: ['UNKNOWN_STORE_DIRECTORY_LAYOUT',      'Unknown store directory layout.', ''],
  10049: ['UNKNOWN_REDISTRIBUTABLE',             'Unknown redistributable.', ''],
  10050: ['UNKNOWN_GIFT_CODE',                   'Unknown gift code.', ''],
  10057: ['UNKNOWN_STREAM',                      'Unknown stream.', ''],
  10059: ['UNKNOWN_PREMIUM_SERVER_SUBSCRIBE_COOLDOWN', 'Unknown premium server subscribe cooldown.', ''],
  10062: ['UNKNOWN_INTERACTION',                 'Unknown interaction.', 'You took longer than 3 seconds to respond. Use deferReply() first.'],
  10063: ['UNKNOWN_APPLICATION_COMMAND',         'Unknown application command.', 'Slash command was deleted or never registered.'],
  10065: ['UNKNOWN_VOICE_STATE',                 'Unknown voice state.', ''],
  10066: ['UNKNOWN_APPLICATION_COMMAND_PERMISSIONS', 'Unknown application command permissions.', ''],
  10067: ['UNKNOWN_STAGE_INSTANCE',              'Unknown stage instance.', ''],
  10068: ['UNKNOWN_GUILD_MEMBER_VERIFICATION_FORM', 'Unknown guild member verification form.', ''],
  10069: ['UNKNOWN_GUILD_WELCOME_SCREEN',        'Unknown guild welcome screen.', ''],
  10070: ['UNKNOWN_GUILD_SCHEDULED_EVENT',       'Unknown guild scheduled event.', ''],
  10071: ['UNKNOWN_GUILD_SCHEDULED_EVENT_USER',  'Unknown guild scheduled event user.', ''],
  10087: ['UNKNOWN_TAG',                         'Unknown tag.', ''],
  20001: ['BOT_PROHIBITED_ENDPOINT',             'Bots cannot use this endpoint.', ''],
  20002: ['USER_PROHIBITED_ENDPOINT',            'Only bots can use this endpoint.', ''],
  20009: ['EXPLICIT_CONTENT',                    'Explicit content cannot be sent to this recipient.', ''],
  20012: ['NOT_AUTHORIZED_FOR_APPLICATION',      'You are not authorized to perform this action on this application.', ''],
  20016: ['SLOWMODE_RATE_LIMIT',                 'Action throttled by slowmode.', 'Channel slowmode is on — wait before sending again.'],
  20018: ['ONLY_OWNER',                          'Only the owner of this account can perform this action.', ''],
  20022: ['ANNOUNCEMENT_RATE_LIMIT',             'This message cannot be edited due to announcement rate limits.', ''],
  20028: ['CHANNEL_WRITE_RATE_LIMIT',            'The channel you are writing has hit the write rate limit.', ''],
  20029: ['SERVER_WRITE_RATE_LIMIT',             'The write action you are performing on the server has hit the write rate limit.', ''],
  20031: ['DISALLOWED_NAME',                     'Your Stage topic, server name, server description, or channel names contain words that are not allowed.', ''],
  20035: ['GUILD_PREMIUM_LEVEL_TOO_LOW',         'Guild premium subscription level too low.', ''],
  30001: ['MAX_GUILDS',                          'Maximum number of guilds reached (100).', ''],
  30002: ['MAX_FRIENDS',                         'Maximum number of friends reached (1000).', ''],
  30003: ['MAX_PINS',                            'Maximum number of pins reached for the channel (50).', ''],
  30004: ['MAX_RECIPIENTS',                      'Maximum number of recipients reached (10).', ''],
  30005: ['MAX_GUILD_ROLES',                     'Maximum number of guild roles reached (250).', ''],
  30007: ['MAX_WEBHOOKS',                        'Maximum number of webhooks reached (15).', ''],
  30008: ['MAX_EMOJIS',                          'Maximum number of emojis reached.', ''],
  30010: ['MAX_REACTIONS',                       'Maximum number of reactions reached (20).', ''],
  30013: ['MAX_GUILD_CHANNELS',                  'Maximum number of guild channels reached (500).', ''],
  30015: ['MAX_ATTACHMENTS',                     'Maximum number of attachments in a message reached (10).', ''],
  30016: ['MAX_INVITES',                         'Maximum number of invites reached (1000).', ''],
  30018: ['MAX_ANIMATED_EMOJIS',                 'Maximum number of animated emojis reached.', ''],
  30019: ['MAX_GUILD_MEMBERS',                   'Maximum number of server members reached.', ''],
  30030: ['MAX_SERVER_CATEGORIES',               'Maximum number of server categories has been reached (5).', ''],
  30031: ['GUILD_TEMPLATE_EXISTS',               'Guild already has a template.', ''],
  30032: ['MAX_APPLICATION_COMMANDS',            'Maximum number of application commands reached.', ''],
  30033: ['MAX_THREAD_PARTICIPANTS',             'Max number of thread participants has been reached (1000).', ''],
  30035: ['MAX_BANS_FETCHES',                    'Maximum number of bans for non-guild members have been exceeded.', ''],
  30037: ['MAX_BANS',                            'Maximum number of bans fetches has been reached.', ''],
  30038: ['MAX_UNCOMPLETED_GUILD_SCHEDULED_EVENTS', 'Maximum number of uncompleted guild scheduled events reached (100).', ''],
  30039: ['MAX_STICKERS',                        'Maximum number of stickers reached.', ''],
  30040: ['MAX_PRUNE_REQUESTS',                  'Maximum number of prune requests has been reached. Try again later.', ''],
  30042: ['MAX_GUILD_WIDGET_SETTINGS_UPDATES',   'Maximum number of guild widget settings updates has been reached. Try again later.', ''],
  30046: ['MAX_OLD_MESSAGE_EDITS',               'Maximum number of edits to messages older than 1 hour reached. Try again later.', ''],
  30047: ['MAX_PINNED_THREADS_IN_FORUM',         'Maximum number of pinned threads in a forum channel has been reached.', ''],
  30048: ['MAX_TAGS_IN_FORUM',                   'Maximum number of tags in a forum channel has been reached.', ''],
  40001: ['UNAUTHORIZED',                        'Unauthorized. Provide a valid token and try again.', 'Bot token is wrong or was reset.'],
  40002: ['ACCOUNT_VERIFICATION_REQUIRED',       'You need to verify your account in order to perform this action.', ''],
  40003: ['DIRECT_MESSAGES_TOO_FAST',            'You are opening direct messages too fast.', ''],
  40004: ['SEND_MESSAGES_TEMP_DISABLED',         'Send messages has been temporarily disabled.', ''],
  40005: ['REQUEST_ENTITY_TOO_LARGE',            'Request entity too large. Try sending something smaller in size.', ''],
  40006: ['FEATURE_TEMPORARILY_DISABLED',        'This feature has been temporarily disabled server-side.', ''],
  40007: ['USER_BANNED',                         'The user is banned from this guild.', ''],
  40012: ['CONNECTION_REVOKED',                  'Connection has been revoked.', ''],
  40032: ['TARGET_USER_NOT_CONNECTED',           'Target user is not connected to voice.', ''],
  40033: ['ALREADY_CROSSPOSTED',                 'This message has already been crossposted.', ''],
  40041: ['APPLICATION_COMMAND_NAME_EXISTS',     'An application command with that name already exists.', ''],
  40060: ['INTERACTION_ALREADY_ACKNOWLEDGED',    'Interaction has already been acknowledged.', 'You called reply()/deferReply() twice on the same interaction.'],
  40061: ['TAG_NAMES_NON_UNIQUE',                'Tag names must be unique.', ''],
  50001: ['MISSING_ACCESS',                      'Missing access.', 'Bot is not in that channel/guild, or lacks the View Channel permission.'],
  50002: ['INVALID_ACCOUNT_TYPE',                'Invalid account type.', ''],
  50003: ['CANNOT_EXECUTE_ON_DM',                'Cannot execute action on a DM channel.', ''],
  50004: ['EMBED_DISABLED',                      'Guild widget disabled.', ''],
  50005: ['CANNOT_EDIT_MESSAGE_BY_OTHER',        'Cannot edit a message authored by another user.', ''],
  50006: ['CANNOT_SEND_EMPTY_MESSAGE',           'Cannot send an empty message.', 'Set at least content, embeds, files, or components.'],
  50007: ['CANNOT_MESSAGE_USER',                 'Cannot send messages to this user.', 'User has DMs closed or has blocked the bot.'],
  50008: ['CANNOT_SEND_MESSAGES_IN_VOICE_CHANNEL', 'Cannot send messages in a non-text channel.', ''],
  50009: ['CHANNEL_VERIFICATION_LEVEL_TOO_HIGH', 'Channel verification level is too high for you to gain access.', ''],
  50010: ['OAUTH2_APPLICATION_BOT_ABSENT',       'OAuth2 application does not have a bot.', ''],
  50011: ['MAX_OAUTH2_APPLICATIONS',             'OAuth2 application limit reached.', ''],
  50012: ['INVALID_OAUTH_STATE',                 'Invalid OAuth2 state.', ''],
  50013: ['MISSING_PERMISSIONS',                 'You lack permissions to perform that action.', 'Bot needs a higher role or specific perms (Manage Messages, Ban Members, etc).'],
  50014: ['INVALID_AUTHENTICATION_TOKEN',        'Invalid authentication token provided.', ''],
  50015: ['NOTE_TOO_LONG',                       'Note was too long.', ''],
  50016: ['INVALID_BULK_DELETE_QUANTITY',        'Provided too few or too many messages to delete. Must be 2-100.', ''],
  50017: ['INVALID_MFA_LEVEL',                   'Invalid MFA Level.', ''],
  50019: ['INVALID_PIN_CHANNEL',                 'A message can only be pinned to the channel it was sent in.', ''],
  50020: ['INVALID_INVITE',                      'Invite code was either invalid or taken.', ''],
  50021: ['CANNOT_EXECUTE_ON_SYSTEM_MESSAGE',    'Cannot execute action on a system message.', ''],
  50024: ['CANNOT_EXECUTE_ON_CHANNEL_TYPE',      'Cannot execute action on this channel type.', ''],
  50025: ['INVALID_OAUTH_TOKEN',                 'Invalid OAuth2 access token provided.', ''],
  50026: ['MISSING_OAUTH_SCOPE',                 'Missing required OAuth2 scope.', ''],
  50027: ['INVALID_WEBHOOK_TOKEN',               'Invalid webhook token provided.', ''],
  50028: ['INVALID_ROLE',                        'Invalid role.', ''],
  50033: ['INVALID_RECIPIENTS',                  'Invalid Recipient(s).', ''],
  50034: ['BULK_DELETE_MESSAGE_TOO_OLD',         'A message provided was too old to bulk delete (>14 days).', ''],
  50035: ['INVALID_FORM_BODY',                   'Invalid form body or content type.', 'Check field types/values in your request body.'],
  50036: ['INVITE_ACCEPTED_TO_GUILD_NOT_CONTAINING_BOT', 'An invite was accepted to a guild the application\'s bot is not in.', ''],
  50041: ['INVALID_API_VERSION',                 'Invalid API version provided.', ''],
  50045: ['FILE_UPLOADED_EXCEEDS_MAX_SIZE',      'File uploaded exceeds the maximum size.', ''],
  50046: ['INVALID_FILE_UPLOADED',               'Invalid file uploaded.', ''],
  50054: ['CANNOT_SELF_REDEEM_GIFT',             'Cannot self-redeem this gift.', ''],
  50055: ['INVALID_GUILD',                       'Invalid Guild.', ''],
  50068: ['INVALID_MESSAGE_TYPE',                'Invalid message type.', ''],
  50070: ['PAYMENT_SOURCE_REQUIRED',             'Payment source required to redeem gift.', ''],
  50074: ['CANNOT_DELETE_REQUIRED_COMMUNITY_CHANNEL', 'Cannot delete a channel required for Community guilds.', ''],
  50081: ['INVALID_STICKER_SENT',                'Invalid sticker sent.', ''],
  50083: ['INVALID_THREAD_ARCHIVE_STATE',        'Tried to perform an operation on an archived thread.', 'Unarchive the thread first.'],
  50084: ['INVALID_THREAD_NOTIFICATION_SETTINGS', 'Invalid thread notification settings.', ''],
  50085: ['PARAMETER_EARLIER_THAN_CREATION',     'before value is earlier than the thread creation date.', ''],
  50086: ['COMMUNITY_SERVER_CHANNEL_REQUIREMENTS', 'Community server channels must be text channels.', ''],
  50095: ['SERVER_NOT_AVAILABLE_IN_LOCATION',    'This server is not available in your location.', ''],
  50097: ['SERVER_NEEDS_MONETIZATION',           'This server needs monetization enabled to perform this action.', ''],
  50101: ['SERVER_NEEDS_MORE_BOOSTS',            'This server needs more boosts to perform this action.', ''],
  50109: ['REQUEST_BODY_CONTAINS_INVALID_JSON',  'The request body contains invalid JSON.', ''],
  50132: ['OWNERSHIP_CANNOT_BE_TRANSFERRED_TO_BOT', 'Ownership cannot be transferred to a bot user.', ''],
  50138: ['FAILED_TO_RESIZE_ASSET',              'Failed to resize asset below the maximum size: 262144.', ''],
  50146: ['UPLOADED_FILE_NOT_FOUND',             'Uploaded file not found.', ''],
  60003: ['MFA_NOT_ENABLED',                     'Two factor is required for this operation.', ''],
  80004: ['NO_USERS_WITH_DISCORDTAG_EXIST',      'No users with DiscordTag exist.', ''],
  90001: ['REACTION_BLOCKED',                    'Reaction was blocked.', ''],
  130000:['API_RESOURCE_OVERLOADED',             'API resource is currently overloaded. Try again a little later.', ''],
  150006:['STAGE_ALREADY_OPEN',                  'The Stage is already open.', ''],
  160002:['CANNOT_REPLY_WITHOUT_READ_HISTORY',   'Cannot reply without permission to read message history.', ''],
  160004:['THREAD_ALREADY_CREATED_FOR_MESSAGE',  'A thread has already been created for this message.', ''],
  160005:['THREAD_LOCKED',                       'Thread is locked.', ''],
  160006:['MAX_ACTIVE_THREADS',                  'Maximum number of active threads reached.', ''],
  160007:['MAX_ACTIVE_ANNOUNCEMENT_THREADS',     'Maximum number of active announcement threads reached.', ''],
  170001:['INVALID_JSON_FOR_UPLOADED_LOTTIE',    'Invalid JSON for uploaded Lottie file.', ''],
  170002:['UPLOADED_LOTTIES_CANNOT_CONTAIN_RASTERIZED_IMAGES', 'Uploaded Lotties cannot contain rasterized images such as PNG or JPEG.', ''],
  180000:['CANNOT_UPDATE_FINISHED_EVENT',        'Cannot update a finished event.', ''],
  180002:['FAILED_TO_CREATE_STAGE_NEEDED_FOR_STAGE_EVENT', 'Failed to create stage needed for stage event.', ''],
  200000:['MESSAGE_BLOCKED_BY_AUTOMOD',          'Message was blocked by automatic moderation.', ''],
  200001:['TITLE_BLOCKED_BY_AUTOMOD',            'Title was blocked by automatic moderation.', ''],
  240000:['WEBHOOKS_POSTED_TO_FORUM_CHANNELS_MUST_HAVE_THREAD_NAME_OR_THREAD_ID', 'Webhooks posted to forum channels must have a thread_name or thread_id.', ''],
};

// HTTP status codes (the most relevant ones for Discord API responses).
const HTTP_CODES = {
  400: ['BAD_REQUEST',                'The request was improperly formatted, or sent invalid fields.', ''],
  401: ['UNAUTHORIZED',               'The Authorization header was missing or invalid.', 'Check your bot token.'],
  403: ['FORBIDDEN',                  'The Authorization token you passed did not have permission to that resource.', 'Bot is missing permissions.'],
  404: ['NOT_FOUND',                  'The resource at the location specified does not exist.', ''],
  405: ['METHOD_NOT_ALLOWED',         'The HTTP method used is not valid for the location specified.', ''],
  429: ['TOO_MANY_REQUESTS',          'You are being rate limited.', 'Slow down — Discord throttled your requests.'],
  502: ['GATEWAY_UNAVAILABLE',        'There was not a gateway available to process your request. Wait and retry.', ''],
  503: ['SERVICE_UNAVAILABLE',        'Discord is having issues.', 'Check https://discordstatus.com'],
  504: ['GATEWAY_TIMEOUT',            'Discord took too long to respond.', ''],
};

// Gateway close codes — when the bot's websocket disconnects.
const GATEWAY_CLOSE = {
  4000: ['UNKNOWN_ERROR',         'We\'re not sure what went wrong. Try reconnecting.', ''],
  4001: ['UNKNOWN_OPCODE',        'You sent an invalid Gateway opcode or an invalid payload for an opcode.', ''],
  4002: ['DECODE_ERROR',          'You sent an invalid payload to Discord.', ''],
  4003: ['NOT_AUTHENTICATED',     'You sent a payload prior to identifying.', ''],
  4004: ['AUTHENTICATION_FAILED', 'The account token sent with your identify payload is incorrect.', 'Bot token is wrong — check your config.'],
  4005: ['ALREADY_AUTHENTICATED', 'You sent more than one identify payload.', ''],
  4007: ['INVALID_SEQ',           'The sequence sent when resuming the session was invalid. Reconnect and start a new session.', ''],
  4008: ['RATE_LIMITED',          'You\'re being rate limited.', 'Slow down your gateway payloads.'],
  4009: ['SESSION_TIMED_OUT',     'Your session timed out. Reconnect and start a new one.', ''],
  4010: ['INVALID_SHARD',         'You sent an invalid shard when identifying.', ''],
  4011: ['SHARDING_REQUIRED',     'The session would have handled too many guilds — you need to shard.', ''],
  4012: ['INVALID_API_VERSION',   'You sent an invalid version for the gateway.', ''],
  4013: ['INVALID_INTENTS',       'You sent an invalid intent for a Gateway Intent.', ''],
  4014: ['DISALLOWED_INTENTS',    'You sent a disallowed intent for a Gateway Intent. Privileged intent not enabled in the dev portal.', 'Enable Message Content / Server Members / Presence intents in the bot\'s application page.'],
};

function lookup(code) {
  if (JSON_ERRORS[code]) {
    const [name, desc, cause] = JSON_ERRORS[code];
    return { kind: 'Discord JSON Error', code, name, desc, cause };
  }
  if (HTTP_CODES[code]) {
    const [name, desc, cause] = HTTP_CODES[code];
    return { kind: 'HTTP Status', code, name, desc, cause };
  }
  if (GATEWAY_CLOSE[code]) {
    const [name, desc, cause] = GATEWAY_CLOSE[code];
    return { kind: 'Gateway Close Code', code, name, desc, cause };
  }
  return null;
}

module.exports = {
  category: 'utility',
  help: [
    {
      name: 'errorlookup',
      description: 'Look up a Discord API error code, HTTP status, or gateway close code.',
      aliases: 'errlookup, error, errcode',
      parameters: '<code>',
      information: 'Covers Discord JSON error codes (10001+), HTTP statuses (400-504), and gateway close codes (4000-4014).',
      usage: 'errorlookup <code>',
      example: 'errorlookup 50013',
    },
  ],

  name: 'errorlookup',
  aliases: ['errlookup', 'error', 'errcode'],

  run: async (client, message, args) => {
    const raw = (args[0] || '').trim();
    if (!raw) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: Provide an error code. \`,errorlookup QqoIzAxSFemE\` or \`,errorlookup 50013\``)],
      });
    }

    // 1) Bot-generated alphanumeric code (e.g. "QqoIzAxSFemE") — these are
    //    stored in the DB whenever a command throws.
    if (/^[A-Za-z0-9]{8,16}$/.test(raw) && /[A-Za-z]/.test(raw)) {
      const rec = getErrorRecord(raw);
      if (!rec) {
        return message.channel.send({
          embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: No record found for code \`${raw}\`. It may have rolled out of the recent log.`)],
        });
      }

      // Owner-only details: stack trace + IDs. Everyone else gets the summary.
      const isOwner = canRunOwnerCmd(message.author.id, 'errorlookup');
      const when = moment(rec.timestamp).format('MMMM D, YYYY [at] h:mm A');

      const lines = [
        `**Code:** \`${rec.code}\``,
        `**Command:** \`${rec.command || 'unknown'}\``,
        `**When:** ${when} (${moment(rec.timestamp).fromNow()})`,
        `**User:** ${rec.userTag || rec.userId || 'unknown'}${rec.userId ? ` (\`${rec.userId}\`)` : ''}`,
        `**Server:** ${rec.guildName || 'DM'}${rec.guildId ? ` (\`${rec.guildId}\`)` : ''}`,
        '',
        `**Error:** \`${(rec.errorName || 'Error')}: ${rec.errorMessage || 'unknown'}\``,
      ];

      if (isOwner) {
        if (rec.messageContent) {
          lines.push('', `**Message:** \`\`\`\n${rec.messageContent.slice(0, 300)}\n\`\`\``);
        }
        if (rec.stack) {
          const stack = rec.stack.slice(0, 1500);
          lines.push(`**Stack:**\n\`\`\`\n${stack}\n\`\`\``);
        }
      }

      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(color)
            .setTitle(`Bot Error — ${rec.code}`)
            .setDescription(lines.join('\n')),
        ],
      });
    }

    // 2) Numeric — Discord JSON / HTTP / gateway code
    const code = parseInt(raw, 10);
    if (Number.isNaN(code)) {
      return message.channel.send({
        embeds: [new EmbedBuilder().setColor('#efa23a').setDescription(`${warn} ${message.author}: \`${raw}\` is not a valid error code.`)],
      });
    }

    const hit = lookup(code);
    if (!hit) {
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#efa23a')
            .setDescription(`${warn} ${message.author}: No info on error code \`${code}\`. See [Discord docs](https://discord.com/developers/docs/topics/opcodes-and-status-codes#json).`),
        ],
      });
    }

    const lines = [
      `**Type:** ${hit.kind}`,
      `**Code:** \`${hit.code}\``,
      `**Name:** \`${hit.name}\``,
      `**Meaning:** ${hit.desc}`,
    ];
    if (hit.cause) lines.push(`**Likely cause:** ${hit.cause}`);
    lines.push('');
    lines.push(`[Discord docs](https://discord.com/developers/docs/topics/opcodes-and-status-codes)`);

    return message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(color)
          .setTitle(`Error ${hit.code} — ${hit.name}`)
          .setDescription(lines.join('\n')),
      ],
    });
  },
};
