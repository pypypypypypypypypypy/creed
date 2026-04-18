const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const db = require('../db');
const { default_prefix, color } = require("../config.json");
function getEmojis() {
  delete require.cache[require.resolve('../emojis.json')];
  return require('../emojis.json');
}

module.exports = {
  name: "help",
  aliases: [],
  category: 'information',
  help: [
    { name: 'help', description: 'View all commands or get help for a specific command', aliases: 'n/a', parameters: '[command] [subcommand]', information: 'n/a', usage: 'help [command] [subcommand]', example: 'help welcome add' },
  ],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`);
    if (prefix === null) prefix = default_prefix;
    if (message.author.bot) return;

    const emojis = getEmojis();
    const thumb = client.user.displayAvatarURL({ extension: "png", forceStatic: false, size: 2048 });

    const groups = {
      configuration: {
        label: 'Configuration',
        aliases: ['config', 'cfg'],
        pages: [
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Configuration — Alt & Invite')
            .setDescription(
              `\`${prefix}altdentifier enable\` — Enable alt detection\n` +
              `\`${prefix}altdentifier disable\` — Disable alt detection\n` +
              `\`${prefix}antiinvite enable\` — Block Discord invite links\n` +
              `\`${prefix}antiinvite disable\` — Allow Discord invite links`
            )
            .setFooter({ text: `Page 1/4 • Aliases: config, cfg` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Configuration — Autorole & JoinDM')
            .setDescription(
              `\`${prefix}autorole set\` — Set the server autorole\n` +
              `\`${prefix}autorole clear\` — Remove the current autorole\n` +
              `\`${prefix}joindm message\` — Set the DM sent to new members\n` +
              `\`${prefix}joindm clear\` — Clear the join DM message\n` +
              `\`${prefix}joindm test\` — Test your join DM message`
            )
            .setFooter({ text: `Page 2/4 • Aliases: config, cfg` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Configuration — Logs & Prefix')
            .setDescription(
              `\`${prefix}logs channel\` — Set the moderation logs channel\n` +
              `\`${prefix}logs clear\` — Remove the modlogs channel\n` +
              `\`${prefix}prefix <prefix>\` — Set a custom command prefix`
            )
            .setFooter({ text: `Page 3/4 • Aliases: config, cfg` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Configuration — Welcome')
            .setDescription(
              `\`${prefix}welcome channel\` — Set the welcome message channel\n` +
              `\`${prefix}welcome message\` — Set the welcome message text\n` +
              `\`${prefix}welcome test\` — Preview the welcome message\n` +
              `\`${prefix}welcome variables\` — View all welcome message variables`
            )
            .setFooter({ text: `Page 4/4 • Aliases: config, cfg` })
            .setTimestamp(),
        ],
      },

      economy: {
        label: 'Economy',
        aliases: ['eco'],
        pages: [
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Economy — Earning')
            .setDescription(
              `\`${prefix}balance [user]\` — Check your economy balance\n` +
              `\`${prefix}open\` — Open your economy account\n` +
              `\`${prefix}daily\` — Claim your daily reward\n` +
              `\`${prefix}work [job]\` — Work to earn money\n` +
              `\`${prefix}crime\` — Commit a crime to earn money\n` +
              `\`${prefix}rob <user>\` — Rob another user`
            )
            .setFooter({ text: `Page 1/4 • Aliases: eco` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Economy — Banking & Games')
            .setDescription(
              `\`${prefix}deposit <amount>\` — Deposit money into your bank\n` +
              `\`${prefix}withdraw <amount>\` — Withdraw money from your bank\n` +
              `\`${prefix}transfer <user> <amount>\` — Transfer money to another user\n` +
              `\`${prefix}blackjack <amount>\` — Play blackjack\n` +
              `\`${prefix}coinflip <amount> <heads/tails>\` — Flip a coin and bet\n` +
              `\`${prefix}slots <amount>\` — Play the slot machine`
            )
            .setFooter({ text: `Page 2/4 • Aliases: eco` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Economy — Games')
            .setDescription(
              `\`${prefix}dice <amount>\` — Roll dice against the bot\n` +
              `\`${prefix}highlow <amount>\` — Guess higher or lower\n` +
              `\`${prefix}gamble <amount>\` — Gamble with random multipliers\n` +
              `\`${prefix}crash <amount>\` — Cash out before the multiplier crashes\n` +
              `\`${prefix}roulette <type> <amount>\` — Play roulette\n` +
              `\`${prefix}scratch <amount>\` — Play scratch card lottery`
            )
            .setFooter({ text: `Page 3/4 • Aliases: eco` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Economy — More Games & Settings')
            .setDescription(
              `\`${prefix}plinko <amount>\` — Drop a chip down the plinko board\n` +
              `\`${prefix}bombs <amount>\` — Play minesweeper\n` +
              `\`${prefix}ladder <amount>\` — Climb the ladder for multipliers\n` +
              `\`${prefix}shop\` — Browse the shop\n` +
              `\`${prefix}job\` — View custom jobs\n` +
              `\`${prefix}circulation\` — View economy circulation stats\n` +
              `\`${prefix}economy\` — Economy system settings`
            )
            .setFooter({ text: `Page 4/4 • Aliases: eco` })
            .setTimestamp(),
        ],
      },

      fun: {
        label: 'Fun',
        aliases: [],
        pages: [
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Fun')
            .setDescription(
              `\`${prefix}gnome\` — Gnome the mentioned user\n` +
              `\`${prefix}image <search>\` — Search Google for an image\n` +
              `\`${prefix}meme\` — Get a random meme from Reddit\n` +
              `\`${prefix}randomnumber\` — Generate a random number\n` +
              `\`${prefix}snipe\` — Snipe the last deleted message`
            )
            .setFooter({ text: `Page 1/1` })
            .setTimestamp(),
        ],
      },

      giveaway: {
        label: 'Giveaway',
        aliases: ['giveaways', 'g'],
        pages: [
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Giveaway — Main')
            .setDescription(
              `\`${prefix}giveaway start <#channel> <duration> <winners> <prize>\` — Start a giveaway\n` +
              `\`${prefix}giveaway end <message_link>\` — End a giveaway early\n` +
              `\`${prefix}giveaway reroll <message_link> [count]\` — Reroll winners\n` +
              `\`${prefix}giveaway cancel <message_link>\` — Cancel a giveaway\n` +
              `\`${prefix}giveaway list\` — List all active giveaways`
            )
            .setFooter({ text: `Page 1/2 • Aliases: giveaways, g` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Giveaway — Edit')
            .setDescription(
              `\`${prefix}giveaway edit prize <link> <prize>\` — Edit the prize\n` +
              `\`${prefix}giveaway edit winners <link> <count>\` — Edit winner count\n` +
              `\`${prefix}giveaway edit duration <link> <duration>\` — Edit end time\n` +
              `\`${prefix}giveaway edit description <link> <text>\` — Edit description\n` +
              `\`${prefix}giveaway edit color <link> <color>\` — Edit embed color\n` +
              `\`${prefix}giveaway edit requiredroles <link> <@role>\` — Required roles to enter\n` +
              `\`${prefix}giveaway edit roles <link> <@role>\` — Roles given to winners\n` +
              `\`${prefix}giveaway edit host <link> <@user>\` — Change host`
            )
            .setFooter({ text: `Page 2/2 • Aliases: giveaways, g` })
            .setTimestamp(),
        ],
      },

      information: {
        label: 'Information',
        aliases: ['info'],
        pages: [
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Information')
            .setDescription(
              `\`${prefix}about\` — Information about ${client.user.username}\n` +
              `\`${prefix}help\` — Display this help menu\n` +
              `\`${prefix}invite\` — Get an invite link for ${client.user.username}\n` +
              `\`${prefix}membercount\` — View the server's member count\n` +
              `\`${prefix}members\` — View members in a specific role`
            )
            .setFooter({ text: `Page 1/2 • Aliases: info` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Information')
            .setDescription(
              `\`${prefix}roleinfo\` — View information about a role\n` +
              `\`${prefix}serverinfo\` — View information about the server\n` +
              `\`${prefix}uptime\` — View ${client.user.username}'s uptime\n` +
              `\`${prefix}userinfo\` — View information about a member`
            )
            .setFooter({ text: `Page 2/2 • Aliases: info` })
            .setTimestamp(),
        ],
      },

      lastfm: {
        label: 'Last.fm',
        aliases: ['fm', 'lfm'],
        pages: [
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Last.fm — Account')
            .setDescription(
              `\`${prefix}fm\` / \`${prefix}np\` — Show your currently playing track\n` +
              `\`${prefix}nowplaying [user]\` — Now playing with reaction buttons\n` +
              `\`${prefix}lastfm set <user>\` — Link your Last.fm account\n` +
              `\`${prefix}lastfm logout\` — Unlink your Last.fm account\n` +
              `\`${prefix}lastfm whois [user]\` — View a user's Last.fm profile\n` +
              `\`${prefix}lastfm color <hex>\` — Set a custom embed color`
            )
            .setFooter({ text: `Page 1/8 • Aliases: fm, lfm` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Last.fm — Settings')
            .setDescription(
              `\`${prefix}lastfm mode <template>\` — Set a custom embed template\n` +
              `\`${prefix}lastfm embed view\` — View your embed settings\n` +
              `\`${prefix}lastfm embed reset\` — Reset your embed settings\n` +
              `\`${prefix}lastfm variables\` — View available embed variables\n` +
              `\`${prefix}lastfm customcommand <cmd>\` — Set a custom fm alias\n` +
              `\`${prefix}lastfm react <up> <down>\` — Set custom reactions`
            )
            .setFooter({ text: `Page 2/8 • Aliases: fm, lfm` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Last.fm — Friends & Charts')
            .setDescription(
              `\`${prefix}lastfm addfriends <users>\` — Add Last.fm friends\n` +
              `\`${prefix}lastfm removefriends <users>\` — Remove Last.fm friends\n` +
              `\`${prefix}lastfm update\` — Update your library index\n` +
              `\`${prefix}lastfm count [user]\` — Total scrobble count\n` +
              `\`${prefix}lastfm topartists [user] [period]\` — Top artists\n` +
              `\`${prefix}lastfm topalbums [user] [period]\` — Top albums`
            )
            .setFooter({ text: `Page 3/8 • Aliases: fm, lfm` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Last.fm — Charts & History')
            .setDescription(
              `\`${prefix}lastfm toptracks [user] [period]\` — Top tracks\n` +
              `\`${prefix}lastfm toptentracks [user] [artist]\` — Top 10 tracks for artist\n` +
              `\`${prefix}lastfm toptenalbums [user] [artist]\` — Top 10 albums for artist\n` +
              `\`${prefix}lastfm recent [user] [limit]\` — Recent tracks\n` +
              `\`${prefix}lastfm recentfor [user] [artist]\` — Recent tracks for artist\n` +
              `\`${prefix}lastfm favorites [user]\` — Loved/favorited tracks`
            )
            .setFooter({ text: `Page 4/8 • Aliases: fm, lfm` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Last.fm — Stats & Lookup')
            .setDescription(
              `\`${prefix}lastfm streak [user]\` — Listening streak info\n` +
              `\`${prefix}lastfm milestone <n>\` — Find your Nth scrobble\n` +
              `\`${prefix}lastfm discoverydate [user] [artist]\` — First listen date\n` +
              `\`${prefix}lastfm artist [user] [artist]\` — Artist info & your plays\n` +
              `\`${prefix}lastfm track [user] [artist - track]\` — Track info\n` +
              `\`${prefix}lastfm album [user] [artist - album]\` — Album info`
            )
            .setFooter({ text: `Page 5/8 • Aliases: fm, lfm` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Last.fm — Overview & Plays')
            .setDescription(
              `\`${prefix}lastfm overview [user] [artist]\` — Full artist overview\n` +
              `\`${prefix}lastfm plays [user] [artist]\` — Artist play count\n` +
              `\`${prefix}lastfm playstrack [user] [artist - track]\` — Track play count\n` +
              `\`${prefix}lastfm playsalbum [user] [artist - album]\` — Album play count\n` +
              `\`${prefix}lastfm collage [user] [size] [period]\` — Generate a collage\n` +
              `\`${prefix}lastfm recommendation [user]\` — Music recommendations`
            )
            .setFooter({ text: `Page 6/8 • Aliases: fm, lfm` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Last.fm — Social')
            .setDescription(
              `\`${prefix}lastfm taste <user> [period]\` — Compare music taste\n` +
              `\`${prefix}lastfm affinity\` — Server music affinity\n` +
              `\`${prefix}lastfm youtube/spotify/soundcloud/itunes [user]\` — Find on platform\n` +
              `\`${prefix}lastfm scoreboard\` — Server scrobble leaderboard\n` +
              `\`${prefix}lastfm whoknows [artist]\` — Who in server knows artist\n` +
              `\`${prefix}lastfm wktrack [artist - track]\` — Who knows track`
            )
            .setFooter({ text: `Page 7/8 • Aliases: fm, lfm` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Last.fm — Social')
            .setDescription(
              `\`${prefix}lastfm wkalbum [artist - album]\` — Who knows album\n` +
              `\`${prefix}lastfm friendwhoknows [artist]\` — Friend who knows\n` +
              `\`${prefix}lastfm servertracks\` — Who's listening right now\n` +
              `\`${prefix}lastfm serverartists\` — Server top artists\n` +
              `\`${prefix}lastfm serveralbums\` — Server top albums\n` +
              `\`${prefix}lastfm crowns [user]\` — View user's crowns\n` +
              `\`${prefix}lastfm mostcrowns\` — Server crown leaderboard`
            )
            .setFooter({ text: `Page 8/8 • Periods: 7day 1month 3month 6month 12month overall` })
            .setTimestamp(),
        ],
      },

      security: {
        label: 'Security',
        aliases: ['sec'],
        pages: [
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Security — AntiRaid')
            .setDescription(
              `**AntiRaid** \`${prefix}antiraid\` / \`${prefix}ar\`\n` +
              `\`toggle <enable|disable>\` — Enable or disable AntiRaid\n` +
              `\`config\` — View full AntiRaid configuration\n` +
              `\`state\` — Check if AntiRaid is enabled\n` +
              `\`list\` — List all enabled modules\n` +
              `\`whitelist [view] <@user>\` — Manage AntiRaid whitelist`
            )
            .setFooter({ text: `Page 1/4 • Aliases: sec` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Security — AntiRaid Modules')
            .setDescription(
              `**AntiRaid Modules** \`${prefix}antiraid\` / \`${prefix}ar\`\n` +
              `\`massjoin <enable|disable>\` — Mass join detection\n` +
              `\`massmention <enable|disable>\` — Mass mention detection\n` +
              `\`age <enable|disable>\` — Block new accounts\n` +
              `\`avatar <enable|disable>\` — Block users with no avatar\n` +
              `\`unverifiedbots <enable|disable>\` — Block unverified bots\n` +
              `\`username add/remove/list <pattern>\` — Filter username patterns`
            )
            .setFooter({ text: `Page 2/4 • Punishments: kick, ban, mute, strip` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Security — AntiNuke')
            .setDescription(
              `**AntiNuke** \`${prefix}antinuke\` / \`${prefix}an\`\n` +
              `\`enable\` / \`disable\` — Toggle AntiNuke\n` +
              `\`config\` — View full configuration\n` +
              `\`list\` — View enabled modules & whitelist\n` +
              `\`admin <@user>\` — Add/remove AntiNuke admins\n` +
              `\`admins\` — List all AntiNuke admins\n` +
              `\`whitelist <user id>\` — Whitelist a user`
            )
            .setFooter({ text: `Page 3/4 • Aliases: sec` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Security — Filter, FakePerms & Incidents')
            .setDescription(
              `**Filter** \`${prefix}filter\` / \`${prefix}f\`\n` +
              `\`add/remove/list <word>\` — Manage word filter\n` +
              `\`whitelist <word>\` — Whitelist a word\n` +
              `\`reset\` / \`settings\` — Reset or view filter settings\n\n` +
              `**Fake Permissions** \`${prefix}fakepermissions\` / \`${prefix}fp\`\n` +
              `\`add <@role> <permissions>\` — Grant fake permissions\n` +
              `\`remove <@role>\` / \`reset\` / \`list\` — Manage fake permissions\n\n` +
              `**Incidents** \`${prefix}incidents\` / \`${prefix}inc\`\n` +
              `\`list\` / \`view <id>\` / \`resolve <id>\` / \`search <query>\``
            )
            .setFooter({ text: `Page 4/4 • Aliases: sec` })
            .setTimestamp(),
        ],
      },

      moderation: {
        label: 'Moderation',
        aliases: ['mod'],
        pages: [
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Moderation — Bans & Kicks')
            .setDescription(
              `\`${prefix}ban <member> [delete history] [reason]\` — Ban a member\n` +
              `\`${prefix}hackban <user> [reason]\` — Ban a user not in the server\n` +
              `\`${prefix}unban <user> [reason]\` — Unban a member\n` +
              `\`${prefix}kick <member> [reason]\` — Kick a member from the server`
            )
            .setFooter({ text: `Page 1/4 • Aliases: mod` })
            .setTimestamp(),

          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Moderation — Muting & Jail')
            .setDescription(
              `\`${prefix}mute <member>\` — Mute a member across all channels\n` +
              `\`${prefix}unmute <member>\` — Unmute a member\n` +
              `\`${prefix}jail <member> <duration> [reason]\` — Jail a member`
            )
            .setFooter({ text: `Page 2/4 • Aliases: mod` })
            .setTimestamp(),

          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Moderation — Channel Management')
            .setDescription(
              `\`${prefix}lockdown [channel]\` — Lock a channel\n` +
              `\`${prefix}unlock [channel]\` — Unlock a channel\n` +
              `\`${prefix}purge <amount>\` — Delete a specified number of messages\n` +
              `\`${prefix}purgeuser <member> <amount>\` — Delete messages from a specific user\n` +
              `\`${prefix}botclear\` — Purge messages sent by bots`
            )
            .setFooter({ text: `Page 3/4 • Aliases: mod` })
            .setTimestamp(),

          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Moderation — Roles & Members')
            .setDescription(
              `\`${prefix}role <member> <role>\` — Add or remove a role from a member\n` +
              `\`${prefix}rolecreate <role name> [color]\` — Create a new role\n` +
              `\`${prefix}roleremove <member> <role>\` — Remove a role from a member\n` +
              `\`${prefix}rename <member> [nick]\` — Give a member a new nickname`
            )
            .setFooter({ text: `Page 4/4 • Aliases: mod` })
            .setTimestamp(),
        ],
      },

      roleplay: {
        label: 'Roleplay',
        aliases: ['rp'],
        pages: [
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Roleplay (1/8)')
            .setDescription(
              `Disabled by default — run \`${prefix}roleplay enable\` first.\n\n` +
              `\`${prefix}airkiss <@member>\` — Airkiss someone\n` +
              `\`${prefix}angrystare <@member>\` — Stare angrily at someone\n` +
              `\`${prefix}bite <@member>\` — Bite someone\n` +
              `\`${prefix}bleh <@member>\` — Bleh at someone\n` +
              `\`${prefix}brofist <@member>\` — Bro fist someone\n` +
              `\`${prefix}celebrate <@member>\` — Celebrate with someone\n` +
              `\`${prefix}cheers <@member>\` — Cheer with someone`
            )
            .setFooter({ text: `Page 1/8 • Aliases: rp` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Roleplay (2/8)')
            .setDescription(
              `\`${prefix}clap <@member>\` — Clap at someone\n` +
              `\`${prefix}confused <@member>\` — Act confused at someone\n` +
              `\`${prefix}cool <@member>\` — Cool with someone\n` +
              `\`${prefix}cry <@member>\` — Cry at someone\n` +
              `\`${prefix}cuddle <@member>\` — Cuddle someone\n` +
              `\`${prefix}dance <@member>\` — Dance with someone\n` +
              `\`${prefix}drool <@member>\` — Drool on someone\n` +
              `\`${prefix}evillaugh <@member>\` — Laugh evilly at someone`
            )
            .setFooter({ text: `Page 2/8 • Aliases: rp` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Roleplay (3/8)')
            .setDescription(
              `\`${prefix}facepalm <@member>\` — Facepalm at someone\n` +
              `\`${prefix}handhold <@member>\` — Hold hands with someone\n` +
              `\`${prefix}happy <@member>\` — Be happy with someone\n` +
              `\`${prefix}headbang <@member>\` — Headbang into someone\n` +
              `\`${prefix}hug <@member>\` — Hug someone\n` +
              `\`${prefix}kiss <@member>\` — Kiss someone\n` +
              `\`${prefix}laugh <@member>\` — Laugh with someone\n` +
              `\`${prefix}lick <@member>\` — Lick someone`
            )
            .setFooter({ text: `Page 3/8 • Aliases: rp` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Roleplay (4/8)')
            .setDescription(
              `\`${prefix}love <@member>\` — Love someone\n` +
              `\`${prefix}mad <@member>\` — Get mad at someone\n` +
              `\`${prefix}nervous <@member>\` — Get nervous around someone\n` +
              `\`${prefix}nom <@member>\` — Nibble someone\n` +
              `\`${prefix}nuzzle <@member>\` — Nuzzle someone\n` +
              `\`${prefix}nyah <@member>\` — Nyahhh\n` +
              `\`${prefix}pat <@member>\` — Pat someone\n` +
              `\`${prefix}peek <@member>\` — Peek at someone`
            )
            .setFooter({ text: `Page 4/8 • Aliases: rp` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Roleplay (5/8)')
            .setDescription(
              `\`${prefix}pinch <@member>\` — Pinch someone\n` +
              `\`${prefix}poke <@member>\` — Poke someone\n` +
              `\`${prefix}pout <@member>\` — Pout at someone\n` +
              `\`${prefix}punch <@member>\` — Punch someone\n` +
              `\`${prefix}sad <@member>\` — Is sad because of someone\n` +
              `\`${prefix}scared <@member>\` — Get scared of someone\n` +
              `\`${prefix}shout <@member>\` — Shout at someone\n` +
              `\`${prefix}shrug <@member>\` — Shrug at someone`
            )
            .setFooter({ text: `Page 5/8 • Aliases: rp` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Roleplay (6/8)')
            .setDescription(
              `\`${prefix}shy <@member>\` — Get shy around someone\n` +
              `\`${prefix}sigh <@member>\` — Sigh at someone\n` +
              `\`${prefix}sip <@member>\` — Sip something with someone\n` +
              `\`${prefix}slap <@member>\` — Slap someone\n` +
              `\`${prefix}sleep <@member>\` — Sleep with someone\n` +
              `\`${prefix}slowclap <@member>\` — Slow clap at someone\n` +
              `\`${prefix}smack <@member>\` — Smack someone\n` +
              `\`${prefix}smile <@member>\` — Smile at someone`
            )
            .setFooter({ text: `Page 6/8 • Aliases: rp` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Roleplay (7/8)')
            .setDescription(
              `\`${prefix}smug <@member>\` — Smug at someone\n` +
              `\`${prefix}sneeze <@member>\` — Sneeze on someone\n` +
              `\`${prefix}sorry <@member>\` — Be sorry to someone\n` +
              `\`${prefix}stare <@member>\` — Stare at someone\n` +
              `\`${prefix}surprised <@member>\` — Act surprised at someone\n` +
              `\`${prefix}sweat <@member>\` — Sweat around someone\n` +
              `\`${prefix}thumbsup <@member>\` — Give a thumbs up to someone\n` +
              `\`${prefix}tickle <@member>\` — Tickle someone`
            )
            .setFooter({ text: `Page 7/8 • Aliases: rp` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Roleplay (8/8)')
            .setDescription(
              `\`${prefix}tired <@member>\` — Get tired around someone\n` +
              `\`${prefix}wave <@member>\` — Wave at someone\n` +
              `\`${prefix}wink <@member>\` — Wink at someone\n` +
              `\`${prefix}woah <@member>\` — Gasp at someone\n` +
              `\`${prefix}yawn <@member>\` — Yawn at someone\n` +
              `\`${prefix}yay <@member>\` — Get excited around someone\n` +
              `\`${prefix}yes <@member>\` — Say yes to someone`
            )
            .setFooter({ text: `Page 8/8 • Aliases: rp` })
            .setTimestamp(),
        ],
      },

      reactions: {
        label: 'Reactions',
        aliases: ['react', 'rxn'],
        pages: [
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Reactions — Add & Triggers')
            .setDescription(
              `\`${prefix}reaction <message link> <emoji>\` — Add a reaction to a message\n` +
              `\`${prefix}reaction add <emoji> <trigger>\` — Add a reaction trigger\n` +
              `\`${prefix}reaction delete <emoji> <trigger>\` — Remove a reaction trigger\n` +
              `\`${prefix}reaction deleteall <trigger>\` — Remove all triggers for a word\n` +
              `\`${prefix}reaction clear\` — Remove all reaction triggers in guild\n` +
              `\`${prefix}reaction owner <trigger>\` — Get who created a trigger\n` +
              `\`${prefix}reaction list\` — List all reaction triggers`
            )
            .setFooter({ text: `Page 1/3 • Aliases: react, rxn` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Reactions — Auto & Previous')
            .setDescription(
              `\`${prefix}reaction messages <channel> [e1] [e2] [e3]\` — Set auto reactions on a channel\n` +
              `\`${prefix}reaction messages list\` — List all auto reaction channels\n\n` +
              `\`${prefix}previousreact add <emoji> <trigger>\` — Add a previous-react trigger\n` +
              `\`${prefix}previousreact delete <emote> <trigger>\` — Remove a previous-react trigger\n` +
              `\`${prefix}previousreact deleteall <trigger>\` — Remove all for a word\n` +
              `\`${prefix}previousreact clear\` — Clear all previous-react triggers\n` +
              `\`${prefix}previousreact owner <trigger>\` — Get trigger owner\n` +
              `\`${prefix}previousreact list\` — List all previous-react triggers`
            )
            .setFooter({ text: `Page 2/3 • Aliases: react, rxn` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Reactions — NoSelfReact')
            .setDescription(
              `\`${prefix}noselfreact\` — View NoSelfReact config (Admin)\n` +
              `\`${prefix}noselfreact toggle <enable|disable>\` — Toggle NoSelfReact (Admin)\n` +
              `\`${prefix}noselfreact bypass <on|off>\` — Toggle owner bypass (Owner)\n` +
              `\`${prefix}noselfreact punishment <type>\` — Set punishment (Admin)\n` +
              `\`${prefix}noselfreact exempt <@user|#channel|@role>\` — Exempt a target (Admin)\n` +
              `\`${prefix}noselfreact exempt list\` — List all exempts (Admin)\n` +
              `\`${prefix}noselfreact emoji <emoji>\` — Toggle a blocked emoji (Admin)\n` +
              `\`${prefix}noselfreact emoji list\` — List blocked emojis (Admin)\n\n` +
              `Punishments: \`none\`, \`warn\`, \`mute\`, \`kick\`, \`ban\``
            )
            .setFooter({ text: `Page 3/3 • Aliases: react, rxn` })
            .setTimestamp(),
        ],
      },

      starboard: {
        label: 'Starboard & Clownboard',
        aliases: ['sb', 'clownboard', 'cb'],
        pages: [
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Starboard')
            .setDescription(
              `**Starboard** \`${prefix}starboard\` / \`${prefix}sb\`\n` +
              `\`set <#channel>\` — Set the starboard channel\n` +
              `\`emoji <emoji>\` — Set the star emoji\n` +
              `\`threshold <number>\` — Set the required reaction count\n` +
              `\`color <color>\` — Set the embed color\n` +
              `\`selfstar <on/off>\` — Allow self-starring\n` +
              `\`lock\` / \`unlock\` — Lock or unlock the starboard\n` +
              `\`ignore <#channel | @member | @role>\` — Ignore a target\n` +
              `\`config\` — View current starboard settings\n` +
              `\`reset\` — Reset all starboard settings`
            )
            .setFooter({ text: `Page 1/2 • Aliases: sb, cb` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Clownboard')
            .setDescription(
              `**Clownboard** \`${prefix}clownboard\` / \`${prefix}cb\`\n` +
              `\`set <#channel>\` — Set the clownboard channel\n` +
              `\`emoji <emoji>\` — Set the clown emoji\n` +
              `\`threshold <number>\` — Set the required reaction count\n` +
              `\`color <color>\` — Set the embed color\n` +
              `\`selfstar <on/off>\` — Allow self-clowning\n` +
              `\`lock\` / \`unlock\` — Lock or unlock the clownboard\n` +
              `\`ignore <#channel | @member | @role>\` — Ignore a target\n` +
              `\`config\` — View current clownboard settings\n` +
              `\`reset\` — Reset all clownboard settings`
            )
            .setFooter({ text: `Page 2/2 • Aliases: sb, cb` })
            .setTimestamp(),
        ],
      },

      utility: {
        label: 'Utility',
        aliases: ['util'],
        pages: [
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Utility (1/3)')
            .setDescription(
              `\`${prefix}afk\` — Set an AFK status when mentioned\n` +
              `\`${prefix}appstore\` — Search an app on the App Store\n` +
              `\`${prefix}avatar\` — Get a member's avatar\n` +
              `\`${prefix}createembed\` — Create a custom embed\n` +
              `\`${prefix}firstmessage\` — Get the first message in a channel\n` +
              `\`${prefix}google <query>\` — Search Google\n` +
              `\`${prefix}guildbanner\` — Get the server banner`
            )
            .setFooter({ text: `Page 1/3 • Aliases: util` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Utility (2/3)')
            .setDescription(
              `\`${prefix}guildicon\` — Get the server icon\n` +
              `\`${prefix}pin\` — Pin a message by ID\n` +
              `\`${prefix}poll\` — Create a poll\n` +
              `\`${prefix}remind\` — Set a reminder\n` +
              `\`${prefix}setbanner\` — Set a new server banner\n` +
              `\`${prefix}seticon\` — Set a new server icon\n` +
              `\`${prefix}setsplash\` — Set a new server splash`
            )
            .setFooter({ text: `Page 2/3 • Aliases: util` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('Utility (3/3)')
            .setDescription(
              `\`${prefix}spotify\` — Get Spotify results for a song\n` +
              `\`${prefix}twitter\` — Look up a Twitter profile\n` +
              `\`${prefix}unpin\` — Unpin a message by ID\n` +
              `\`${prefix}urban\` — Look up a word on Urban Dictionary\n` +
              `\`${prefix}userbanner\` — Get a member's banner`
            )
            .setFooter({ text: `Page 3/3 • Aliases: util` })
            .setTimestamp(),
        ],
      },

      voicemaster: {
        label: 'VoiceMaster',
        aliases: ['vm', 'vc'],
        pages: [
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('VoiceMaster — Setup & Channel')
            .setDescription(
              `\`${prefix}voicemaster setup\` — Setup the voicemaster interface\n` +
              `\`${prefix}voicemaster sendinterface\` — Forcefully resend the interface\n` +
              `\`${prefix}voicemaster lock\` — Lock your voice channel\n` +
              `\`${prefix}voicemaster unlock\` — Unlock your voice channel\n` +
              `\`${prefix}voicemaster hide\` — Hide your voice channel\n` +
              `\`${prefix}voicemaster reveal\` — Reveal your hidden voice channel\n` +
              `\`${prefix}voicemaster claim\` — Claim an unclaimed voice channel\n` +
              `\`${prefix}voicemaster rename [name]\` — Rename your voice channel`
            )
            .setFooter({ text: `Page 1/3 • Aliases: vm, vc` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('VoiceMaster — Controls')
            .setDescription(
              `\`${prefix}voicemaster limit [limit]\` — Set the user limit\n` +
              `\`${prefix}voicemaster bitrate [kbps]\` — Change the bitrate\n` +
              `\`${prefix}voicemaster region [region]\` — Change the region\n` +
              `\`${prefix}voicemaster status [status]\` — Set voice channel status\n` +
              `\`${prefix}voicemaster permit [user]\` — Permit a user to join\n` +
              `\`${prefix}voicemaster reject [user]\` — Reject a user from joining\n` +
              `\`${prefix}voicemaster drag [user]\` — Drag a user into your channel\n` +
              `\`${prefix}voicemaster delete\` — Delete your voice channel`
            )
            .setFooter({ text: `Page 2/3 • Aliases: vm, vc` })
            .setTimestamp(),
          new EmbedBuilder()
            .setColor(color).setThumbnail(thumb)
            .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
            .setTitle('VoiceMaster — Defaults')
            .setDescription(
              `\`${prefix}voicemaster information\` — View channel information\n` +
              `\`${prefix}voicemaster temporary\` — Toggle temporary voice channels\n` +
              `\`${prefix}voicemaster reset\` — Reset your voice channel\n` +
              `\`${prefix}voicemaster joinrole [role]\` — Set a role given on join\n` +
              `\`${prefix}voicemaster default interface [state]\` — Default interface state\n` +
              `\`${prefix}voicemaster default region [region]\` — Default region\n` +
              `\`${prefix}voicemaster default role [role]\` — Default role\n` +
              `\`${prefix}voicemaster default bitrate [kbps]\` — Default bitrate\n` +
              `\`${prefix}voicemaster default name [template]\` — Default name template`
            )
            .setFooter({ text: `Page 3/3 • Aliases: vm, vc` })
            .setTimestamp(),
        ],
      },
    };

    // Shared button row builder
    function buildRow(idx, total, disabled = false) {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('help_prev')
          .setLabel('<')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disabled || idx === 0),
        new ButtonBuilder()
          .setCustomId('help_stop')
          .setLabel('x')
          .setStyle(ButtonStyle.Danger)
          .setDisabled(disabled),
        new ButtonBuilder()
          .setCustomId('help_next')
          .setLabel('>')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disabled || idx === total - 1)
      );
    }

    // Build alias → key lookup
    const aliasMap = {};
    for (const [key, group] of Object.entries(groups)) {
      aliasMap[key] = key;
      for (const alias of group.aliases) aliasMap[alias] = key;
    }

    const input = args[0] ? args[0].toLowerCase() : null;

    // ,h <command> [subcommand] — per-command help lookup
    if (input && !aliasMap[input]) {
      const cmdName = input;
      let command = client.commands.get(cmdName);
      if (!command) command = client.commands.get(client.aliases.get(cmdName));

      if (!command) return;

      const subArgs = args.slice(1).map(a => a.toLowerCase());
      const fullQuery = [cmdName, ...subArgs].join(' ');
      const commandFullQuery = [command.name, ...subArgs].join(' ');

      if (command.help && Array.isArray(command.help)) {
        let matchedPage = null;

        if (subArgs.length > 0) {
          matchedPage = command.help.find(p =>
            p.name.toLowerCase() === commandFullQuery ||
            p.name.toLowerCase() === fullQuery
          );
        }

        if (!matchedPage) {
          matchedPage = command.help.find(p =>
            p.name.toLowerCase() === command.name.toLowerCase()
          );
        }

        if (!matchedPage) matchedPage = command.help[0];

        if (matchedPage) {
          const category = command.category || 'n/a';
          const infoValue = matchedPage.information && matchedPage.information !== 'n/a'
            ? `${emojis.warn} ${matchedPage.information}`
            : 'n/a';

          const helpEmbed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL({ forceStatic: false }) })
            .setTitle(matchedPage.name)
            .setDescription(`> ${matchedPage.description}`)
            .addFields(
              { name: 'Aliases', value: matchedPage.aliases || 'n/a', inline: false },
              { name: 'Parameters', value: matchedPage.parameters || 'n/a', inline: false },
              { name: 'Information', value: infoValue, inline: false },
              { name: 'Usage', value: `\`\`\`\nSyntax: ${prefix}${matchedPage.usage}\nExample: ${prefix}${matchedPage.example || matchedPage.usage}\n\`\`\``, inline: false }
            )
            .setFooter({ text: `Module: ${category}` });

          return message.channel.send({ embeds: [helpEmbed] });
        }
      }

      // Fallback: command exists but has no help data
      const aliasStr = command.aliases && command.aliases.length
        ? command.aliases.join(', ')
        : 'n/a';
      const category = command.category || 'n/a';

      const fallbackEmbed = new EmbedBuilder()
        .setColor(color)
        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL({ forceStatic: false }) })
        .setTitle(command.name)
        .setDescription(`> No detailed help available for this command.`)
        .addFields(
          { name: 'Aliases', value: aliasStr, inline: false },
          { name: 'Parameters', value: 'n/a', inline: false },
          { name: 'Information', value: 'n/a', inline: false },
          { name: 'Usage', value: `\`\`\`\nSyntax: ${prefix}${command.name}\nExample: ${prefix}${command.name}\n\`\`\``, inline: false }
        )
        .setFooter({ text: `Module: ${category}` });

      return message.channel.send({ embeds: [fallbackEmbed] });
    }

    // ,h <group>
    if (input && aliasMap[input]) {
      const group = groups[aliasMap[input]];
      const pages = group.pages;

      if (pages.length === 1) {
        return message.channel.send({ embeds: [pages[0]] });
      }

      let current = 0;

      const msg = await message.channel.send({
        embeds: [pages[current]],
        components: [buildRow(current, pages.length)],
      });

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: i => i.user.id === message.author.id,
        time: 60_000,
      });

      collector.on('collect', async interaction => {
        await interaction.deferUpdate();
        if (interaction.customId === 'help_stop') {
          collector.stop('user');
          return msg.delete().catch(() => {});
        }
        if (interaction.customId === 'help_prev') current = Math.max(0, current - 1);
        if (interaction.customId === 'help_next') current = Math.min(pages.length - 1, current + 1);
        await msg.edit({ embeds: [pages[current]], components: [buildRow(current, pages.length)] }).catch(() => {});
      });

      collector.on('end', () => {
        msg.edit({ components: [buildRow(current, pages.length, true)] }).catch(() => {});
      });

      return;
    }

    // ,h — paginated overview: page 1 is the overview, then one page per group
    const groupEntries = Object.entries(groups);
    const total = groupEntries.length + 1;

    const overviewEmbed = new EmbedBuilder()
      .setColor(color)
      .setThumbnail(thumb)
      .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
      .setTitle(client.user.username)
      .setDescription(
        `A refined, feature-rich Discord bot.\n` +
        `Use \`${prefix}help\` or \`${prefix}h\` to view this menu.\n` +
        `Navigate pages with the buttons below.\n\n` +
        `**Invite**\n[Add ${client.user.username} to your server](https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot)\n` +
        `**Support**\nContact @ abannition for any issues.`
      )
      .setFooter({ text: `Page 1/${total} • Prefix: ${prefix}` })
      .setTimestamp();

    const allPages = [overviewEmbed];
    for (const [key, group] of groupEntries) {
      const cleanName = group.label.replace(/<:[^>]+>/g, '').replace(/\p{Emoji_Presentation}/gu, '').trim();
      const aliasStr = group.aliases.length ? `\`${group.aliases.join('`, `')}\`` : 'n/a';
      const exampleAlias = group.aliases.length ? group.aliases[0] : key;
      const groupPage = new EmbedBuilder()
        .setColor(color)
        .setThumbnail(thumb)
        .setAuthor({ name: message.guild.name, iconURL: message.guild.iconURL({ forceStatic: false }) || undefined })
        .setTitle(cleanName)
        .setDescription(`> Use \`${prefix}h ${key}\` to view all **${cleanName}** commands.`)
        .addFields(
          { name: 'Aliases', value: aliasStr, inline: false },
          { name: 'Parameters', value: 'n/a', inline: false },
          { name: 'Information', value: 'n/a', inline: false },
          { name: 'Usage', value: `\`\`\`\nSyntax: ${prefix}h ${key}\nExample: ${prefix}h ${exampleAlias}\n\`\`\``, inline: false }
        )
        .setFooter({ text: `Page ${allPages.length + 1}/${total} (${total} entries) • Module: help` });
      allPages.push(groupPage);
    }

    let current = 0;

    const msg = await message.channel.send({
      embeds: [allPages[current]],
      components: [buildRow(current, allPages.length)],
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === message.author.id,
      time: 60_000,
    });

    collector.on('collect', async interaction => {
      await interaction.deferUpdate();
      if (interaction.customId === 'help_stop') {
        collector.stop('user');
        return msg.delete().catch(() => {});
      }
      if (interaction.customId === 'help_prev') current = Math.max(0, current - 1);
      if (interaction.customId === 'help_next') current = Math.min(allPages.length - 1, current + 1);
      await msg.edit({ embeds: [allPages[current]], components: [buildRow(current, allPages.length)] }).catch(() => {});
    });

    collector.on('end', () => {
      msg.edit({ components: [buildRow(current, allPages.length, true)] }).catch(() => {});
    });
  }
};
