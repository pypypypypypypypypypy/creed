const { EmbedBuilder } = require('discord.js');
const { color } = require('../config.json');
const { warn } = require('../emojis.json');
const { default_prefix } = require('../config.json');
const db = require('../db');

const WORDS = [
  'abandon','ability','absence','abstract','academy','accident','account','achieve','acquire','action',
  'activate','addition','address','advance','adventure','advice','affect','afford','afraid','agency',
  'agent','agree','ahead','alarm','album','alert','alien','alley','allow','alone','already','although',
  'always','amaze','ancient','angel','anger','animal','answer','anyone','apple','apply','approach',
  'archive','argue','around','arrive','attack','author','avenue','awesome','balance','barrier','basket',
  'battle','beauty','before','begin','believe','belong','better','beware','bitter','blanket','blossom',
  'bottle','bottom','bounce','branch','breach','bright','broken','brother','buffer','burden','button',
  'camera','cancel','candle','captain','carpet','castle','casual','center','certain','change','chapter',
  'charge','choose','circle','circus','citizen','classic','clever','client','climate','cloudy',
  'collect','common','comfort','complex','connect','content','control','copper','corner','correct',
  'cosmic','cotton','country','courage','create','credit','crisis','crystal','custom','damage','danger',
  'daring','darken','debate','decide','defend','define','degree','demand','design','detail',
  'develop','differ','digital','direct','distant','divide','dollar','domain','dragon','drama',
  'driven','dynamic','effect','effort','either','embark','empire','enable','engage','engine','ensure',
  'entire','escape','eternal','evolve','examine','expand','expect','explain','explore','extend',
  'fabric','failure','fallen','famous','faster','father','figure','filter','finish','flight','follow',
  'forest','forward','frozen','future','galaxy','garden','gather','general','global','golden',
  'gossip','govern','ground','growth','hammer','handle','harbor','harvest','hidden','honest','horizon',
  'ignore','impact','import','improve','include','inform','inspire','install','invent','island','jungle',
  'keeper','kingdom','launch','leader','legend','lesson','listen','lovely','manage','marble','master',
  'matter','measure','mention','mighty','mirror','mission','moment','mountain','mystery','native',
  'network','normal','notice','object','obvious','offer','online','option','orange','order','origin',
  'output','outside','palace','panel','parent','pattern','pillow','planet','player','pocket','popular',
  'portal','power','present','prevent','primary','prison','problem','produce','profit','project',
  'proper','protect','provide','purple','puzzle','quality','quantum','random','reason','recall',
  'record','reflect','refuse','render','replace','report','rescue','result','return','reveal','review',
  'rocket','rotate','safety','sample','secret','secure','silver','simple','single','sister','socket',
  'source','spirit','stable','static','steady','storm','stranger','stream','strict','strong','studio',
  'submit','suffer','supply','survey','system','target','temple','theory','ticket','timber','together',
  'tomorrow','trading','travel','trigger','triumph','tunnel','update','upload','useful','vector',
  'venture','village','vision','visitor','visual','volume','wander','weapon','winter','wonder',
  'yellow','zipper','absolute','accurate','adequate','admire','affair','against','airport',
  'amazing','another','anxiety','anywhere','arrange','article','assault','attempt','attract','average',
  'awaken','balloon','bamboo','banner','behind','beneath','between','beyond','bizarre',
  'boulder','builder','burning','capital','capture','careful','carrier','cascade','century','command',
  'compete','concern','confirm','contain','council','counter','curious','curtain','darling','declare',
  'defense','deliver','density','describe','deserve','device','dignity','discover','dismiss','display',
  'disturb','divided','drawing','electric','elegant','element','embrace','emotion','endless','enforce',
  'enhance','entrance','equal','evening','evidence','excited','execute','exhibit','extreme','fashion',
  'feature','feeling','fiction','fighter','finally','finding','flexible','focused','foreign','forever',
  'fortune','fragile','freedom','further','gesture','glitter','gravity','greater','guidance','habitat',
  'however','hunger','ignite','illusion','imagine','immune','income','initial','integer','interest',
  'involve','isolate','journey','justice','knowing','language','lasting','leading','learning','logical',
  'machine','massive','maximum','meeting','memory','message','minimum','mobile','monitor','morning',
  'motion','neutral','nothing','nowhere','observe','obtain','operate','opinion','overlook','package',
  'passage','patient','perform','permanent','picture','plastic','platform','positive','posture',
  'process','product','promote','realize','receive','recover','release','remote','require','resolve',
  'restore','scatter','section','service','setting','signal','silence','similar','soldier','someone',
  'sorting','special','station','success','support','surface','suspend','switch','symbol','talent',
  'tension','texture','through','thunder','tonight','toward','transfer','ultimate','unique','unknown',
  'urgent','version','veteran','virtual','visible','voltage','waiting','walking','warning','watching',
  'weekend','welcome','western','whether','without','working','writing','yourself','partial','partner',
  'parking','pardon','parade','parlor','parent','parish','parrot','parcel','parker','parody',
  'spirit','spread','spring','sprain','sprawl','sprint','sprout','sparrow','spark','sparse',
  'carbon','carpet','carton','garden','garlic','garment','target','market','depart','impart',
  'depart','smart','start','chart','heart','apart','party','spark','march','stark','parse',
  'compare','prepare','repair','declare','beware','software','hardware','welfare','warfare',
  'venture','adventure','capture','feature','texture','mixture','culture','nature','future',
  'picture','creature','fracture','gesture','measure','pleasure','treasure','pressure',
  'station','nation','action','faction','traction','fraction','distraction','attraction',
  'mention','tension','pension','mansion','passion','fashion','mission','vision','division',
  'position','tradition','condition','addition','edition','ambition','ignition','nutrition',
  'strong','string','strange','strength','strategy','struggle','stream','street','stress',
  'extend','intend','defend','offend','pretend','contend','attend','depend','expend','spend',
  'broken','spoken','chosen','frozen','stolen','token','woken','golden','olden','bolden',
  'master','disaster','plaster','blaster','faster','banter','chapter','factor','reactor',
  'battle','cattle','rattle','settle','gentle','kettle','little','brittle','shuttle','nettle',
  'silver','deliver','shiver','river','liver','giver','sliver','driver','fever','clever',
  'bridge','ridge','fridge','knowledge','acknowledge','judge','grudge','pledge','wedge',
  'complex','reflex','duplex','perplex','index','vertex','cortex','context','pretext',
  'fabric','magic','tragic','logic','topic','public','critic','traffic','static','frantic',
  'enable','stable','table','cable','fable','label','sable','capable','disable','notable',
  'better','bitter','butter','batter','letter','litter','matter','otter','getter','setter',
  'center','winter','hunter','counter','printer','painter','pointer','mentor','sector','vector',
  'figure','nature','future','culture','lecture','rupture','posture','fixture','mixture',
  'follow','hollow','bellow','fellow','yellow','pillow','mellow','swallow','gallop','ballot',
  'broken','spoken','woken','token','stolen','chosen','frozen','golden','bolden','holden',
  'ancient','patient','ambient','current','fluent','silent','violent','urgent','present','absent'
];

const UNIQUE_WORDS = [...new Set(WORDS)];

const COMBOS_3 = [
  'par','arc','art','arm','ark','are','age','ace','ack','ake','ale','ame','ane','ave','aze',
  'bar','bit','ban','bat','bay','big','bin','bad','bag','bam','bap','bas','bel','bem','ben',
  'car','cat','can','cap','cut','cup','cur','cot','cod','con','com','col','cob','cog','cop',
  'dar','day','den','dim','dip','dot','dog','dom','don','dor','dug','dun','dur','dew','dex',
  'ear','eat','end','era','eve','elf','elm','ebb','egg','eon','err','est','etch','eve','evo',
  'far','fat','fan','fig','fit','fin','fix','fly','foe','fog','for','fox','fry','fun','fur',
  'gap','gas','get','god','got','gun','gum','gut','guy','gel','gem','gen','gin','gob','goo',
  'hat','has','ham','had','hag','hap','her','him','his','hit','hob','hog','hop','hot','hum',
  'ice','icy','ill','imp','ink','inn','ion','ire','irk','ism','ivy','ire','int','ith','its',
  'jam','jar','jaw','jet','jig','job','jog','jot','joy','jut','jab','jag','jan','jap','jot',
  'keg','kin','kit','knob','know','lap','law','lax','lay','led','leg','let','lid','lip','lit',
  'log','lot','low','lug','lag','lam','lan','lar','las','lat','lav','laz','lea','lec','lee',
  'mad','man','map','mar','mat','max','may','met','mob','mod','mop','mud','mug','nab','nag',
  'nap','net','new','nit','nob','nod','nor','not','now','nun','nut','odd','off','oft','oil',
  'old','one','opt','orb','ore','our','out','owe','own','pace','pad','pan','pat','paw','pay',
  'pen','pet','pin','pit','pod','pop','pot','pow','pro','pub','pug','pun','pup','pus','put',
  'rag','ram','ran','rap','rat','ray','red','ref','rep','rid','rig','rim','rip','rob','rod',
  'rot','row','rub','rug','rum','run','rut','sac','sad','sap','sat','saw','say','sea','set',
  'sew','sir','sit','six','ski','sky','sly','sob','sod','son','sop','sot','sow','sox','soy',
  'spa','spy','sub','sue','sum','sun','sup','tab','tan','tap','tar','tax','tea','ten','the',
  'tie','tim','tin','tip','toe','tog','ton','too','top','toy','try','tub','tug','tun','tup',
  'urn','van','vat','via','vim','vow','wad','wag','war','was','wax','way','web','wed','wet',
  'who','why','wig','win','wit','woe','wok','won','woo','wop','wot','yam','yap','yaw','yep',
  'yet','yew','yip','you','zap','zed','zen','zig','zip','zoo','str','spr','scr','thr','shr',
  'ble','cle','dle','fle','gle','kle','ple','sle','tle','bre','cre','dre','fre','gre','pre',
  'tre','ven','ver','ves','vey','ing','ion','ism','ist','ite','ive','ize','ure','ous','ent',
  'est','ful','age','acy','ary','ery','ory','ity','ack','eck','ick','ock','uck','ank','ink',
  'onk','unk','ong','ing','ang','eng','und','and','end','ind','ond','ound','ant','int','unt',
  'orn','arn','ern','irn','orn','urn','orm','arm','erm','irm','ard','erd','ird','ord','urd',
  'aft','eft','ift','oft','uft','ask','esk','isk','osk','usk','asp','esp','isp','osp','usp',
  'ass','ess','iss','oss','uss','att','ett','itt','ott','utt','all','ell','ill','oll','ull',
  'act','ect','ict','oct','uct','ald','eld','ild','old','uld','alf','elf','ilf','olf','ulf',
  'alm','elm','ilm','olm','ulm','alp','elp','ilp','olp','ulp','alt','elt','ilt','olt','ult',
  'ain','ein','oin','uin','aim','aid','air','ail','ait','aif','ais','aip','aix','ais','ain'
];

const UNIQUE_COMBOS = [...new Set(COMBOS_3)];

function validWords(combo) {
  return UNIQUE_WORDS.filter(w => w.includes(combo));
}

function pickCombo() {
  const shuffled = [...UNIQUE_COMBOS].sort(() => Math.random() - 0.5);
  for (const combo of shuffled) {
    if (validWords(combo).length >= 3) return combo;
  }
  return 'art';
}

const active = new Map();

module.exports = {
  category: 'fun',
  help: [
    {
        name: 'blacktea',
        description: 'Play the blacktea word game',
        aliases: 'bt, wordgame, bte',
        parameters: 'n/a',
        information: 'n/a',
        usage: 'blacktea',
        example: 'blacktea'
    }
],

    name: 'blacktea',
  aliases: ['bt', 'wordgame', 'bte'],

  run: async (client, message, args) => {
    let prefix = db.get(`prefix_${message.guild.id}`) || default_prefix;

    if (active.has(message.channel.id))
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: A **Black Tea** game is already running in this channel`)] });

    active.set(message.channel.id, true);

    const lives = new Map();
    const usedWords = new Set();

    const joinEmbed = new EmbedBuilder()
      .setColor(color)
      .setDescription(
        `⏰ Waiting for **players**, react with ✅ to join. The game will begin in **30** seconds.\n\n` +
        `GOAL : You have **10** seconds to say a word containing the given group of **3** letters. Failure to do so within the **10** seconds will lose a life. Each player has **2** lives to begin with.\n\n` +
        `NOTES : A word can only be used **once** through the course of the game.`
      );

    const joinMsg = await message.reply({ embeds: [joinEmbed] });
    await joinMsg.react('✅');

    await new Promise(r => setTimeout(r, 30000));

    try { await joinMsg.fetch(); } catch {}
    const reaction = joinMsg.reactions.cache.get('✅');
    if (reaction) {
      const users = await reaction.users.fetch();
      for (const [id, user] of users) {
        if (!user.bot) lives.set(id, 2);
      }
    }
    if (!lives.has(message.author.id)) lives.set(message.author.id, 2);

    if (lives.size === 0) {
      active.delete(message.channel.id);
      return message.channel.send({ embeds: [new EmbedBuilder().setColor('efa23a').setDescription(`${warn} ${message.author}: Nobody joined. Game cancelled.`)] });
    }

    let turnIdx = 0;

    const getUsername = async (id) => {
      try {
        const member = await message.guild.members.fetch(id).catch(() => null);
        return member?.displayName || member?.user.username || id;
      } catch { return id; }
    };

    while (true) {
      const aliveList = [...lives.entries()].filter(([, hp]) => hp > 0).map(([id]) => id);
      if (aliveList.length <= 1) break;

      const currentId = aliveList[turnIdx % aliveList.length];
      turnIdx++;

      const combo = pickCombo();

      const promptEmbed = new EmbedBuilder()
        .setColor(color)
        .setDescription(`☕ Type a **word** containing the letters: **${combo.toUpperCase()}**.`);

      const promptMsg = await message.channel.send({ content: `<@${currentId}>`, embeds: [promptEmbed] });

      const t3 = setTimeout(() => promptMsg.react('3️⃣').catch(() => {}), 7000);
      const t2 = setTimeout(() => promptMsg.react('2️⃣').catch(() => {}), 8000);
      const t1 = setTimeout(() => promptMsg.react('1️⃣').catch(() => {}), 9000);

      const filter = m => {
        if (m.author.id !== currentId) return false;
        const word = m.content.trim().toLowerCase();
        return (
          /^[a-z]+$/.test(word) &&
          word.length >= 3 &&
          word.includes(combo) &&
          !usedWords.has(word)
        );
      };

      const answered = await new Promise(resolve => {
        const collector = message.channel.createMessageCollector({ filter, time: 10000, max: 1 });

        collector.on('collect', m => {
          clearTimeout(t3); clearTimeout(t2); clearTimeout(t1);
          usedWords.add(m.content.trim().toLowerCase());
          m.react('✅').catch(() => {});
          resolve(true);
        });

        collector.on('end', (collected) => {
          if (!collected.size) resolve(false);
        });
      });

      if (!answered) {
        clearTimeout(t3); clearTimeout(t2); clearTimeout(t1);
        const hp = (lives.get(currentId) ?? 1) - 1;
        lives.set(currentId, hp);
        const username = await getUsername(currentId);

        await new Promise(r => setTimeout(r, 500));

        if (hp <= 0) {
          await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`🚪 **${username}** has been **eliminated**!`)] });
        } else {
          await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`💥 Times up, **${username}** has **${hp}** life${hp === 1 ? '' : 's'} remaining!`)] });
        }
      }

      await new Promise(r => setTimeout(r, 1500));
    }

    active.delete(message.channel.id);

    const survivors = [...lives.entries()].filter(([, hp]) => hp > 0);
    if (survivors.length === 1) {
      const winnerId = survivors[0][0];
      const winnerName = await getUsername(winnerId);
      await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`🏆 **${winnerName}** has won the game! 🏆`)] });
    } else if (survivors.length === 0) {
      await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`💀 Everyone has been eliminated! No winner this time.`)] });
    } else {
      const names = await Promise.all(survivors.map(([id]) => getUsername(id)));
      await message.channel.send({ embeds: [new EmbedBuilder().setColor(color).setDescription(`🏆 Winners: **${names.join(', ')}** 🏆`)] });
    }
  }
};
