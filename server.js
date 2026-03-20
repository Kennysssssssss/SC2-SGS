/**
 * StarCraft-themed San Guo Sha (三国杀) Card Game Server
 * WebSocket-based multiplayer game server
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;

// ============================================================
// SECTION 1: HERO DEFINITIONS
// ============================================================
const HEROES = [
  // TERRAN
  { id: 'raynor', name: '吉姆·雷诺', faction: 'terran', hp: 4, skills: [
    { id: 'command', name: '号召', desc: '人族盟友可以为你代出闪' },
    { id: 'guerrilla', name: '游击', desc: '回合外被杀时可以反杀' }
  ]},
  { id: 'tychus', name: '泰凯斯', faction: 'terran', hp: 4, skills: [
    { id: 'suppression', name: '压制火力', desc: '每回合可以出2张杀' },
    { id: 'desperado', name: '亡命', desc: '弃1张牌，本回合杀的伤害+1' }
  ]},
  { id: 'banshee', name: '女妖驾驶员', faction: 'terran', hp: 3, skills: [
    { id: 'cloak', name: '隐形', desc: '每回合免疫第一张锦囊牌' },
    { id: 'airstrike', name: '空袭', desc: '杀无视距离' }
  ]},
  { id: 'medic', name: '医疗兵', faction: 'terran', hp: 3, skills: [
    { id: 'firstaid', name: '急救', desc: '弃一张红色牌，为任意角色恢复1点体力' },
    { id: 'nanorepair', name: '纳米修复', desc: '被治疗时摸1张牌' }
  ]},
  { id: 'nova', name: '诺娃', faction: 'terran', hp: 3, skills: [
    { id: 'nuke', name: '核弹定点', desc: '弃2张红色牌，对一名角色造成2点伤害' },
    { id: 'stealth', name: '潜行', desc: '回合外距离大于1的杀不能指定你为目标' }
  ]},
  { id: 'swann', name: '斯旺', faction: 'terran', hp: 4, skills: [
    { id: 'repair', name: '修理', desc: '弃一张装备牌，恢复1点体力' },
    { id: 'armament', name: '军备升级', desc: '装备武器时摸2张牌' }
  ]},
  // PROTOSS
  { id: 'zeratul', name: '泽拉图', faction: 'protoss', hp: 4, skills: [
    { id: 'shadowstrike', name: '暗影突袭', desc: '每回合第一张杀不可闪避' },
    { id: 'voidcloak', name: '虚空隐匿', desc: '弃牌阶段可将一张牌置于武将牌上，下回合可当任意基本牌使用' }
  ]},
  { id: 'artanis', name: '阿塔尼斯', faction: 'protoss', hp: 4, skills: [
    { id: 'glory', name: '光辉统帅', desc: '星灵盟友的闪可以当杀使用' },
    { id: 'warp', name: '折跃', desc: '弃1张牌，本回合可对任意距离角色出杀' }
  ]},
  { id: 'highTemplar', name: '高阶圣堂武士', faction: 'protoss', hp: 3, skills: [
    { id: 'psistorm', name: '灵能风暴', desc: '弃2张牌，对所有其他角色造成1点伤害' },
    { id: 'feedback', name: '反馈', desc: '被锦囊牌造成伤害时，对来源造成1点伤害' }
  ]},
  { id: 'sentry', name: '哨兵', faction: 'protoss', hp: 3, skills: [
    { id: 'forcefield', name: '力场', desc: '弃一张黑色牌，一名角色本回合不可被杀指定' },
    { id: 'hallucination', name: '幻象', desc: '跳过摸牌阶段，获得2张幻象牌（当闪使用）' }
  ]},
  { id: 'tassadar', name: '塔萨达尔', faction: 'protoss', hp: 3, skills: [
    { id: 'illusion', name: '幻象投影', desc: '弃2张牌抵消一次伤害' },
    { id: 'sacrifice', name: '牺牲', desc: '死亡时，完全治愈一名角色' }
  ]},
  { id: 'fenix', name: '菲尼克斯', faction: 'protoss', hp: 4, skills: [
    { id: 'immortal', name: '不灭', desc: '第一次进入濒死状态时，自动恢复至2点体力（每局一次）' },
    { id: 'warrior', name: '勇士之魂', desc: '体力低于2时，杀的伤害+1' }
  ]},
  // ZERG
  { id: 'kerrigan', name: '凯瑞甘', faction: 'zerg', hp: 4, skills: [
    { id: 'swarmwill', name: '虫群意志', desc: '虫族盟友死亡时，恢复1点体力并摸2张牌' },
    { id: 'psychicblast', name: '灵能爆发', desc: '弃1张紫色(黑桃)牌，查看一名角色手牌并弃掉其中1张' }
  ]},
  { id: 'zergling', name: '跳虫首领', faction: 'zerg', hp: 3, skills: [
    { id: 'rush', name: '狂涌', desc: '每回合可以出无限张杀' },
    { id: 'evolve', name: '蜕变', desc: '体力为1时，摸牌阶段额外摸2张' }
  ]},
  { id: 'infestor', name: '感染虫', faction: 'zerg', hp: 3, skills: [
    { id: 'infest', name: '感染', desc: '弃一张黑色牌，控制目标下一张牌的目标' },
    { id: 'fungal', name: '真菌生长', desc: '回合外弃一张牌，跳过目标的出牌阶段' }
  ]},
  { id: 'overlord', name: '领主', faction: 'zerg', hp: 4, skills: [
    { id: 'detect', name: '侦测', desc: '摸牌阶段少摸1张，查看两名角色的手牌' },
    { id: 'transport', name: '运输', desc: '将装备转移给另一名角色' }
  ]},
  { id: 'ultralisk', name: '雷兽', faction: 'zerg', hp: 5, skills: [
    { id: 'heavyarmor', name: '重甲', desc: '受到伤害-1（最低为1）' },
    { id: 'trample', name: '践踏', desc: '弃2张牌，对一名角色造成1点伤害（无视防具）' }
  ]},
  { id: 'mutalisk', name: '飞龙', faction: 'zerg', hp: 3, skills: [
    { id: 'acidspore', name: '腐蚀孢子', desc: '弃1张牌，令目标本回合不能使用闪' },
    { id: 'agility', name: '敏捷', desc: '回合外出闪时摸1张牌' }
  ]},
];

// Commander-eligible heroes (one per faction)
const COMMANDER_HEROES = ['raynor', 'artanis', 'kerrigan'];

// ============================================================
// SECTION 2: CARD DECK DEFINITIONS
// ============================================================
function buildDeck() {
  const cards = [];
  let id = 1;
  const S = 'spade', H = 'heart', D = 'diamond', C = 'club';

  function add(name, type, subtype, suit, number, desc) {
    cards.push({ id: id++, name, type, subtype, suit, number, description: desc || '' });
  }

  // 杀 (Strike) - 30 cards
  const strikeDistrib = [
    [S,1],[S,2],[S,3],[S,4],[S,5],[S,6],[S,7],[S,8],[S,9],[S,10],
    [C,2],[C,3],[C,4],[C,5],[C,6],[C,7],[C,8],[C,9],[C,10],[C,11],
    [H,10],[H,11],[H,12],[H,13],
    [D,6],[D,7],[D,8],[D,9],[D,10],[D,13]
  ];
  for (const [suit, num] of strikeDistrib) {
    add('杀', 'basic', 'strike', suit, num, '高斯步枪射击 - 对攻击范围内一名角色造成1点伤害');
  }

  // 闪 (Dodge) - 15 cards
  const dodgeDistrib = [
    [H,2],[H,3],[H,4],[H,5],[H,6],[H,7],[H,8],[H,9],[H,13],
    [D,2],[D,3],[D,4],[D,5],[D,11],[D,12]
  ];
  for (const [suit, num] of dodgeDistrib) {
    add('闪', 'basic', 'dodge', suit, num, '护盾闪避 - 抵消一张杀');
  }

  // 桃 (Peach) - 8 cards
  const peachDistrib = [
    [H,1],[H,12],[D,1],[D,9],
    [H,3],[H,6],[D,2],[D,8]
  ];
  for (const [suit, num] of peachDistrib) {
    add('桃', 'basic', 'peach', suit, num, '能量补给 - 恢复1点体力');
  }

  // Trick cards
  // 虫群入侵 (Barbarian Invasion) - 3
  add('虫群入侵', 'trick', 'barbarian', S, 7, '所有其他角色需出杀，否则受到1点伤害');
  add('虫群入侵', 'trick', 'barbarian', S, 13, '所有其他角色需出杀，否则受到1点伤害');
  add('虫群入侵', 'trick', 'barbarian', C, 7, '所有其他角色需出杀，否则受到1点伤害');

  // 战列巡航舰轰炸 (Arrow Rain) - 1
  add('战列巡航舰轰炸', 'trick', 'arrowrain', H, 1, '所有其他角色需出闪，否则受到1点伤害');

  // 星际联盟 (Peach Garden) - 1
  add('星际联盟', 'trick', 'peachgarden', H, 1, '所有角色恢复1点体力');

  // 矿物开采 (Something for Nothing) - 4
  add('矿物开采', 'trick', 'draw2', H, 7, '摸2张牌');
  add('矿物开采', 'trick', 'draw2', H, 8, '摸2张牌');
  add('矿物开采', 'trick', 'draw2', H, 9, '摸2张牌');
  add('矿物开采', 'trick', 'draw2', H, 11, '摸2张牌');

  // 一对一单挑 (Duel) - 3
  add('一对一单挑', 'trick', 'duel', S, 1, '与目标轮流出杀，先不出杀者受到1点伤害');
  add('一对一单挑', 'trick', 'duel', C, 1, '与目标轮流出杀，先不出杀者受到1点伤害');
  add('一对一单挑', 'trick', 'duel', D, 1, '与目标轮流出杀，先不出杀者受到1点伤害');

  // 掠夺协议 (Snatch) - 5
  add('掠夺协议', 'trick', 'snatch', S, 3, '获得距离1以内一名角色的一张牌');
  add('掠夺协议', 'trick', 'snatch', S, 4, '获得距离1以内一名角色的一张牌');
  add('掠夺协议', 'trick', 'snatch', S, 11, '获得距离1以内一名角色的一张牌');
  add('掠夺协议', 'trick', 'snatch', D, 3, '获得距离1以内一名角色的一张牌');
  add('掠夺协议', 'trick', 'snatch', D, 4, '获得距离1以内一名角色的一张牌');

  // EMP打击 (Dismantlement) - 6
  add('EMP打击', 'trick', 'dismantle', S, 3, '弃掉目标一张牌');
  add('EMP打击', 'trick', 'dismantle', S, 4, '弃掉目标一张牌');
  add('EMP打击', 'trick', 'dismantle', S, 12, '弃掉目标一张牌');
  add('EMP打击', 'trick', 'dismantle', C, 3, '弃掉目标一张牌');
  add('EMP打击', 'trick', 'dismantle', C, 4, '弃掉目标一张牌');
  add('EMP打击', 'trick', 'dismantle', H, 12, '弃掉目标一张牌');

  // 电磁干扰 (Indulgence) - 3 delayed trick
  add('电磁干扰', 'trick', 'indulgence', S, 6, '延时锦囊：判定非红心则跳过出牌阶段');
  add('电磁干扰', 'trick', 'indulgence', C, 6, '延时锦囊：判定非红心则跳过出牌阶段');
  add('电磁干扰', 'trick', 'indulgence', H, 6, '延时锦囊：判定非红心则跳过出牌阶段');

  // 反制矩阵 (Nullification) - 4
  add('反制矩阵', 'trick', 'nullify', S, 11, '抵消一张锦囊牌');
  add('反制矩阵', 'trick', 'nullify', C, 12, '抵消一张锦囊牌');
  add('反制矩阵', 'trick', 'nullify', C, 13, '抵消一张锦囊牌');
  add('反制矩阵', 'trick', 'nullify', D, 12, '抵消一张锦囊牌');

  // 雇佣兵合同 (Borrow Sword) - 1
  add('雇佣兵合同', 'trick', 'borrowsword', C, 12, '令一名有武器的角色对另一角色出杀，否则交出武器');

  // 核弹打击 (Fire Attack) - 3
  add('核弹打击', 'trick', 'fireattack', H, 2, '目标展示手牌，弃同花色牌造成1点火焰伤害');
  add('核弹打击', 'trick', 'fireattack', H, 3, '目标展示手牌，弃同花色牌造成1点火焰伤害');
  add('核弹打击', 'trick', 'fireattack', D, 12, '目标展示手牌，弃同花色牌造成1点火焰伤害');

  // 离子风暴 (Lightning) - 2 delayed trick
  add('离子风暴', 'trick', 'lightning', S, 1, '延时锦囊：判定黑桃2-9则受到3点伤害，否则传递');
  add('离子风暴', 'trick', 'lightning', H, 12, '延时锦囊：判定黑桃2-9则受到3点伤害，否则传递');

  // Equipment - Weapons
  add('加特林机炮', 'equipment', 'weapon', D, 1, '射程1，无限出杀');
  add('灵能刀刃', 'equipment', 'weapon', S, 6, '射程3，杀被闪时可追杀');
  add('C-14穿甲枪', 'equipment', 'weapon', S, 12, '射程3，弃2牌当杀使用');
  add('攻城坦克炮', 'equipment', 'weapon', D, 5, '射程3，弃2牌强制命中');
  add('航母拦截机', 'equipment', 'weapon', S, 5, '射程4，最后一张杀可指定3个目标');
  add('幽灵狙击枪', 'equipment', 'weapon', H, 5, '射程5，命中移除目标坐骑');

  // Equipment - Armor
  add('护盾电池', 'equipment', 'armor', S, 2, '判定红心/方块自动闪避');
  add('护盾电池', 'equipment', 'armor', C, 2, '判定红心/方块自动闪避');
  add('相位护甲', 'equipment', 'armor', C, 2, '黑色杀无效');
  add('再生甲虫', 'equipment', 'armor', C, 1, '受到伤害最多为1，卸下时恢复1点体力');
  add('生化护甲', 'equipment', 'armor', S, 2, '普通杀和虫群入侵无效，火焰伤害+1');

  // Equipment - Mounts
  // +1 horse (defensive) - 3 cards
  add('传送棱镜', 'equipment', 'horse_plus', H, 13, '其他角色计算距离+1');
  add('传送棱镜', 'equipment', 'horse_plus', S, 5, '其他角色计算距离+1');
  add('传送棱镜', 'equipment', 'horse_plus', C, 5, '其他角色计算距离+1');

  // -1 horse (offensive) - 3 cards
  add('超时空加速器', 'equipment', 'horse_minus', H, 5, '你计算距离-1');
  add('超时空加速器', 'equipment', 'horse_minus', D, 13, '你计算距离-1');
  add('超时空加速器', 'equipment', 'horse_minus', S, 13, '你计算距离-1');

  return cards;
}

const WEAPON_RANGES = {
  '加特林机炮': 1,
  '灵能刀刃': 3,
  'C-14穿甲枪': 3,
  '攻城坦克炮': 3,
  '航母拦截机': 4,
  '幽灵狙击枪': 5,
};

// ============================================================
// SECTION 3: IDENTITY SYSTEM
// ============================================================
const IDENTITY_MAP = {
  2: { commander: 1, insurgent: 1, spy: 0, guardian: 0 },
  3: { commander: 1, insurgent: 1, spy: 1, guardian: 0 },
  4: { commander: 1, insurgent: 1, spy: 1, guardian: 1 },
  5: { commander: 1, insurgent: 2, spy: 1, guardian: 1 },
  6: { commander: 1, insurgent: 2, spy: 1, guardian: 2 },
  7: { commander: 1, insurgent: 3, spy: 1, guardian: 2 },
  8: { commander: 1, insurgent: 3, spy: 1, guardian: 3 },
};

// Faction counter system: attacker faction -> countered faction
const FACTION_COUNTER = {
  terran: 'zerg',
  zerg: 'protoss',
  protoss: 'terran',
};

// ============================================================
// SECTION 4: UTILITY FUNCTIONS
// ============================================================
function generateRoomId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function generatePlayerId() {
  return 'p_' + Math.random().toString(36).slice(2, 10);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sendTo(ws, msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function isRedSuit(suit) { return suit === 'heart' || suit === 'diamond'; }
function isBlackSuit(suit) { return suit === 'spade' || suit === 'club'; }

function identityName(id) {
  const names = { commander: '指挥官', guardian: '卫戍者', insurgent: '反叛者', spy: '间谍' };
  return names[id] || id;
}

const MIME_TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg',
};

// ============================================================
// SECTION 5: ROOM MANAGEMENT
// ============================================================
const rooms = new Map();
const playerRoomMap = new Map(); // playerId -> roomId

class Player {
  constructor(id, name, ws, isAI = false) {
    this.id = id;
    this.name = name;
    this.ws = ws;
    this.isAI = isAI;
    this.ready = false;
    this.identity = null;   // commander, insurgent, spy, guardian
    this.heroId = null;
    this.heroName = null;
    this.faction = null;
    this.hp = 0;
    this.maxHp = 0;
    this.hand = [];
    this.equipment = { weapon: null, armor: null, horse_plus: null, horse_minus: null };
    this.delayedTricks = []; // pending delayed trick cards
    this.alive = true;
    this.strikeCount = 0;   // 杀 played this turn
    this.trickImmune = false; // for banshee cloak
    this.immortalUsed = false; // for fenix
    this.voidCard = null;   // for zeratul
    this.forcefieldTarget = null; // for sentry
    this.skipPlayPhase = false;  // for indulgence / fungal
    this.seatIndex = 0;
  }

  send(msg) { sendTo(this.ws, msg); }

  getVisibleInfo() {
    return {
      id: this.id, name: this.name, heroId: this.heroId,
      heroName: this.heroName, faction: this.faction,
      hp: this.hp, maxHp: this.maxHp, alive: this.alive,
      handCount: this.hand.length, isAI: this.isAI,
      equipment: {
        weapon: this.equipment.weapon ? { id: this.equipment.weapon.id, name: this.equipment.weapon.name } : null,
        armor: this.equipment.armor ? { id: this.equipment.armor.id, name: this.equipment.armor.name } : null,
        horse_plus: this.equipment.horse_plus ? { id: this.equipment.horse_plus.id, name: this.equipment.horse_plus.name } : null,
        horse_minus: this.equipment.horse_minus ? { id: this.equipment.horse_minus.id, name: this.equipment.horse_minus.name } : null,
      },
      delayedTricks: this.delayedTricks.map(c => ({ id: c.id, name: c.name })),
    };
  }

  hasCard(cardId) { return this.hand.some(c => c.id === cardId); }
  getCard(cardId) { return this.hand.find(c => c.id === cardId); }
  removeCard(cardId) {
    const idx = this.hand.findIndex(c => c.id === cardId);
    if (idx >= 0) return this.hand.splice(idx, 1)[0];
    return null;
  }
  findCardBySubtype(subtype) { return this.hand.find(c => c.subtype === subtype); }
  maxStrikes() {
    if (this.heroId === 'zergling') return Infinity; // 狂涌
    if (this.heroId === 'tychus') return 2; // 压制火力
    if (this.equipment.weapon && this.equipment.weapon.name === '加特林机炮') return Infinity;
    return 1;
  }
}

class Room {
  constructor(id, creatorId) {
    this.id = id;
    this.creatorId = creatorId;
    this.players = [];
    this.game = null;
    this.lastActivity = Date.now();
  }

  addPlayer(player) {
    this.players.push(player);
    player.seatIndex = this.players.length - 1;
    this.lastActivity = Date.now();
  }

  removePlayer(playerId) {
    this.players = this.players.filter(p => p.id !== playerId);
    this.lastActivity = Date.now();
  }

  getPlayer(playerId) { return this.players.find(p => p.id === playerId); }

  broadcast(msg, excludeId) {
    for (const p of this.players) {
      if (p.id !== excludeId && !p.isAI) {
        p.send(msg);
      }
    }
  }

  broadcastRoomUpdate() {
    this.broadcast({
      type: 'roomUpdate',
      players: this.players.map(p => ({
        id: p.id, name: p.name, ready: p.ready, isAI: p.isAI
      }))
    });
  }
}

// Room cleanup interval: every 5 minutes, remove rooms inactive for 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms) {
    if (now - room.lastActivity > 30 * 60 * 1000) {
      for (const p of room.players) {
        playerRoomMap.delete(p.id);
      }
      rooms.delete(id);
    }
  }
}, 5 * 60 * 1000);

// ============================================================
// SECTION 6: GAME ENGINE
// ============================================================
const RESPONSE_TIMEOUT = 15000; // 15 seconds for player response

class GameEngine {
  constructor(room) {
    this.room = room;
    this.players = room.players;
    this.deck = [];
    this.discard = [];
    this.currentPlayerIdx = 0;
    this.currentPhase = null; // prepare, judge, draw, play, discard, end
    this.turnPlayer = null;
    this.pendingResponse = null;  // { type, fromPlayer, targetPlayer, card, callback, timeoutId }
    this.pendingNullify = null;
    this.pendingAOE = null; // for barbarian/arrowrain resolution
    this.heroPool = [];
    this.heroSelections = new Map(); // playerId -> heroes to pick from
    this.selectionsRemaining = 0;
    this.gameStarted = false;
    this.gameOver = false;
    this.log = [];
  }

  // ---- Response timeout helper ----
  setPendingResponse(response) {
    this.clearPendingResponse();
    this.pendingResponse = response;
    
    // Set timeout for human players
    if (!response.targetPlayer.isAI) {
      this.pendingResponse.timeoutId = setTimeout(() => {
        if (this.pendingResponse && this.pendingResponse.targetPlayer.id === response.targetPlayer.id) {
          this.broadcastLog(`${response.targetPlayer.name} 响应超时，自动放弃。`);
          const callback = this.pendingResponse.callback;
          this.pendingResponse = null;
          if (callback) callback(false);
        }
      }, RESPONSE_TIMEOUT);
      
      // Send timeout info to client
      response.targetPlayer.send({
        type: 'requestResponse',
        requestType: response.type,
        fromPlayer: response.fromPlayer ? response.fromPlayer.id : null,
        card: response.card,
        factionCountered: response.factionCountered,
        timeout: RESPONSE_TIMEOUT
      });
    }
  }

  clearPendingResponse() {
    if (this.pendingResponse && this.pendingResponse.timeoutId) {
      clearTimeout(this.pendingResponse.timeoutId);
    }
    this.pendingResponse = null;
  }

  // ---- Deck management ----
  initDeck() {
    this.deck = shuffle(buildDeck());
    this.discard = [];
  }

  drawCard() {
    if (this.deck.length === 0) {
      if (this.discard.length === 0) return null;
      this.deck = shuffle(this.discard);
      this.discard = [];
      this.broadcastLog('牌堆已重新洗牌。');
    }
    return this.deck.pop();
  }

  drawCards(player, count) {
    const drawn = [];
    for (let i = 0; i < count; i++) {
      const card = this.drawCard();
      if (card) {
        player.hand.push(card);
        drawn.push(card);
      }
    }
    // Tell the drawing player their new cards
    player.send({ type: 'drawCards', playerId: player.id, count: drawn.length, cards: drawn });
    player.send({ type: 'yourCards', cards: player.hand });
    // Tell others about the draw (no card details)
    this.room.broadcast({ type: 'drawCards', playerId: player.id, count: drawn.length }, player.id);
    this.broadcastHandCounts(player);
    return drawn;
  }

  discardCard(card) {
    if (card) this.discard.push(card);
  }

  // ---- Broadcasting helpers ----
  broadcastLog(text, isAIAction = false) {
    this.log.push(text);
    this.room.broadcast({ type: 'log', text, isAIAction });
  }

  broadcastHandCounts(player) {
    this.room.broadcast({ type: 'cardsChanged', playerId: player.id, handCount: player.hand.length }, player.id);
  }

  broadcastHpChange(player) {
    this.room.broadcast({ type: 'hpChanged', playerId: player.id, hp: player.hp, maxHp: player.maxHp });
  }

  broadcastEquipChange(player, slot) {
    this.room.broadcast({
      type: 'equipChanged', playerId: player.id, slot,
      card: player.equipment[slot] ? { id: player.equipment[slot].id, name: player.equipment[slot].name } : null
    });
  }

  broadcastPhase(phase, playerId) {
    this.currentPhase = phase;
    this.room.broadcast({ type: 'phase', phase, playerId });
  }

  broadcastGameState() {
    // Build hero info map for all players
    const heroInfoMap = {};
    for (const pl of this.players) {
      if (pl.heroId) {
        const hero = HEROES.find(h => h.id === pl.heroId);
        if (hero) {
          heroInfoMap[hero.id] = {
            id: hero.id, name: hero.name, faction: hero.faction, hp: hero.hp,
            skills: hero.skills.map(s => ({ id: s.id, name: s.name, desc: s.desc }))
          };
        }
      }
    }
    for (const p of this.players) {
      if (!p.isAI) {
        p.send({
          type: 'gameStart',
          yourId: p.id,
          players: this.players.map(pl => ({
            id: pl.id, name: pl.name, heroId: pl.heroId,
            heroName: pl.heroName, faction: pl.faction,
            hp: pl.hp, maxHp: pl.maxHp,
            identity: pl.identity === 'commander' ? 'commander' : null,
          })),
          yourIdentity: p.identity,
          yourIdentityName: identityName(p.identity),
          yourCards: p.hand,
          heroData: heroInfoMap,
        });
      }
    }
  }

  // ---- Distance calculation ----
  getDistance(fromPlayer, toPlayer) {
    const alive = this.players.filter(p => p.alive);
    const fromIdx = alive.indexOf(fromPlayer);
    const toIdx = alive.indexOf(toPlayer);
    if (fromIdx === -1 || toIdx === -1) return Infinity;
    const n = alive.length;
    let dist = Math.min(
      Math.abs(fromIdx - toIdx),
      n - Math.abs(fromIdx - toIdx)
    );
    // +1 horse on target
    if (toPlayer.equipment.horse_plus) dist += 1;
    // -1 horse on attacker
    if (fromPlayer.equipment.horse_minus) dist -= 1;
    return Math.max(dist, 1);
  }

  getAttackRange(player) {
    if (player.heroId === 'banshee') return Infinity; // 空袭
    if (player.equipment.weapon) {
      return WEAPON_RANGES[player.equipment.weapon.name] || 1;
    }
    return 1;
  }

  canTarget(fromPlayer, toPlayer) {
    if (!toPlayer.alive || fromPlayer.id === toPlayer.id) return false;
    return true;
  }

  canStrike(fromPlayer, toPlayer) {
    if (!this.canTarget(fromPlayer, toPlayer)) return false;
    // Warp active: bypass distance check
    if (fromPlayer.warpActive) return true;
    // Nova stealth: can't be targeted by 杀 from distance>1 outside attacker's turn
    if (toPlayer.heroId === 'nova' && this.turnPlayer && this.turnPlayer.id !== fromPlayer.id) {
      if (this.getDistance(fromPlayer, toPlayer) > 1) return false;
    }
    // Force field immunity
    for (const p of this.players) {
      if (p.forcefieldTarget === toPlayer.id) return false;
    }
    const dist = this.getDistance(fromPlayer, toPlayer);
    const range = this.getAttackRange(fromPlayer);
    return dist <= range;
  }

  // ---- Identity assignment ----
  assignIdentities() {
    const count = this.players.length;
    const dist = IDENTITY_MAP[count] || IDENTITY_MAP[Math.min(count, 8)];
    if (!dist) return;
    const identities = [];
    for (let i = 0; i < dist.commander; i++) identities.push('commander');
    for (let i = 0; i < dist.guardian; i++) identities.push('guardian');
    for (let i = 0; i < dist.insurgent; i++) identities.push('insurgent');
    for (let i = 0; i < dist.spy; i++) identities.push('spy');
    shuffle(identities);
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].identity = identities[i];
    }
  }

  // ---- Hero selection ----
  startHeroSelection() {
    const pool = shuffle([...HEROES]);
    this.heroPool = pool;
    this.selectionsRemaining = this.players.length;

    for (const p of this.players) {
      let choices;
      if (p.identity === 'commander') {
        // Commander picks from commander-eligible heroes + 2 random
        const cmdHeroes = pool.filter(h => COMMANDER_HEROES.includes(h.id));
        const others = pool.filter(h => !COMMANDER_HEROES.includes(h.id));
        choices = [...cmdHeroes.slice(0, 1), ...others.slice(0, 2)];
      } else {
        // Pick 3 random heroes not yet shown
        choices = [];
        for (const h of pool) {
          if (choices.length >= 3) break;
          choices.push(h);
        }
        // Rotate pool to avoid giving same heroes
        for (let i = 0; i < 3 && pool.length > 0; i++) pool.push(pool.shift());
      }
      this.heroSelections.set(p.id, choices);
      if (!p.isAI) {
        p.send({
          type: 'heroSelect',
          heroes: choices.map(h => ({
            id: h.id, name: h.name, faction: h.faction, hp: h.hp,
            skills: h.skills.map(s => ({ id: s.id, name: s.name, desc: s.desc }))
          }))
        });
      } else {
        // AI picks hero with highest hp
        const best = choices.reduce((a, b) => b.hp > a.hp ? b : a, choices[0]);
        this.selectHero(p.id, best.id);
      }
    }
  }

  selectHero(playerId, heroId) {
    const player = this.room.getPlayer(playerId);
    if (!player) return;
    const choices = this.heroSelections.get(playerId);
    if (!choices) return;
    const hero = choices.find(h => h.id === heroId);
    if (!hero) return;

    player.heroId = hero.id;
    player.heroName = hero.name;
    player.faction = hero.faction;
    player.maxHp = hero.hp + (player.identity === 'commander' ? 1 : 0);
    player.hp = player.maxHp;

    this.heroSelections.delete(playerId);
    this.selectionsRemaining--;

    this.broadcastLog(`${player.name} 选择了 ${hero.name}。`);

    if (this.selectionsRemaining <= 0) {
      this.beginGame();
    }
  }

  // ---- Game start ----
  beginGame() {
    this.gameStarted = true;
    this.initDeck();

    // Deal 4 cards each
    for (const p of this.players) {
      this.drawCards(p, 4);
    }

    this.broadcastGameState();

    // Commander goes first
    const cmdIdx = this.players.findIndex(p => p.identity === 'commander');
    this.currentPlayerIdx = cmdIdx >= 0 ? cmdIdx : 0;

    this.broadcastLog('游戏开始！指挥官先手。');
    this.startTurn();
  }

  // ---- Turn flow ----
  startTurn() {
    if (this.gameOver) return;
    const player = this.players[this.currentPlayerIdx];
    if (!player.alive) {
      this.nextTurn();
      return;
    }
    this.turnPlayer = player;
    player.strikeCount = 0;
    player.trickImmune = (player.heroId === 'banshee'); // reset cloak
    player.skipPlayPhase = false;
    player.forcefieldTarget = null;
    player.desperadoBoost = false;
    player.warpActive = false;
    // Reset cannotDodge for all players at turn start
    for (const p of this.players) {
      p.cannotDodge = false;
    }

    // Handle zeratul void card
    if (player.heroId === 'zeratul' && player.voidCard) {
      player.hand.push(player.voidCard);
      player.send({ type: 'yourCards', cards: player.hand });
      this.broadcastHandCounts(player);
      player.voidCard = null;
    }

    // Zergling evolve: draw 2 extra when hp=1
    const evolveExtra = (player.heroId === 'zergling' && player.hp === 1) ? 2 : 0;

    this.room.broadcast({ type: 'turnStart', playerId: player.id });
    this.broadcastLog(`--- ${player.name} 的回合 ---`);

    this.preparePhase(player, evolveExtra);
  }

  preparePhase(player, evolveExtra) {
    this.broadcastPhase('prepare', player.id);
    // Prepare phase: trigger start-of-turn effects
    // Move to judge phase
    setTimeout(() => this.judgePhase(player, evolveExtra), 300);
  }

  judgePhase(player, evolveExtra) {
    if (this.gameOver || !player.alive) return;
    this.broadcastPhase('judge', player.id);

    // Process delayed tricks one at a time
    this.resolveDelayedTricks(player, [...player.delayedTricks], evolveExtra);
  }

  resolveDelayedTricks(player, tricks, evolveExtra) {
    if (this.gameOver || !player.alive) return;
    if (tricks.length === 0) {
      this.drawPhase(player, evolveExtra);
      return;
    }

    const trick = tricks.shift();
    // Remove from player's delayed tricks
    const idx = player.delayedTricks.findIndex(c => c.id === trick.id);
    if (idx >= 0) player.delayedTricks.splice(idx, 1);

    const judgeCard = this.drawCard();
    if (!judgeCard) {
      this.resolveDelayedTricks(player, tricks, evolveExtra);
      return;
    }
    this.discard.push(judgeCard);

    if (trick.subtype === 'indulgence') {
      // 电磁干扰: skip play phase if not heart
      const skip = judgeCard.suit !== 'heart';
      this.room.broadcast({
        type: 'judgement', playerId: player.id,
        card: { id: judgeCard.id, name: judgeCard.name, suit: judgeCard.suit, number: judgeCard.number },
        result: skip ? '电磁干扰生效 - 跳过出牌阶段' : '电磁干扰失效'
      });
      this.broadcastLog(`${player.name} 的电磁干扰判定: ${judgeCard.suit} ${judgeCard.number} - ${skip ? '生效' : '失效'}`);
      if (skip) player.skipPlayPhase = true;
      this.discardCard(trick);
    } else if (trick.subtype === 'lightning') {
      // 离子风暴: 3 damage if spade 2-9
      const hit = judgeCard.suit === 'spade' && judgeCard.number >= 2 && judgeCard.number <= 9;
      this.room.broadcast({
        type: 'judgement', playerId: player.id,
        card: { id: judgeCard.id, name: judgeCard.name, suit: judgeCard.suit, number: judgeCard.number },
        result: hit ? '离子风暴命中 - 3点伤害' : '离子风暴未命中 - 传递给下一位'
      });
      this.broadcastLog(`${player.name} 的离子风暴判定: ${judgeCard.suit} ${judgeCard.number} - ${hit ? '命中' : '未命中'}`);
      if (hit) {
        this.discardCard(trick);
        this.dealDamage(null, player, 3, 'lightning');
      } else {
        // Pass to next alive player
        const next = this.nextAlivePlayer(player);
        if (next && next.id !== player.id) {
          next.delayedTricks.push(trick);
          this.broadcastLog(`离子风暴传递给 ${next.name}。`);
        } else {
          this.discardCard(trick);
        }
      }
    }

    this.resolveDelayedTricks(player, tricks, evolveExtra);
  }

  drawPhase(player, evolveExtra) {
    if (this.gameOver || !player.alive) return;
    this.broadcastPhase('draw', player.id);

    let drawCount = 2 + (evolveExtra || 0);

    // Sentry hallucination: may skip draw to get 2 dodge tokens
    // (simplified: AI won't use this)
    // Overlord detect: draw 1 less to view hands (simplified: skip for now)

    this.drawCards(player, drawCount);
    this.broadcastLog(`${player.name} 摸了 ${drawCount} 张牌。`);

    // Swann armament: handled in equip logic
    // Medic nanorepair: handled in heal logic

    setTimeout(() => this.playPhase(player), 300);
  }

  playPhase(player) {
    if (this.gameOver || !player.alive) return;
    // Wait if there's a pending response
    if (this.pendingResponse) {
      setTimeout(() => this.playPhase(player), 1000);
      return;
    }
    this.broadcastPhase('play', player.id);

    if (player.skipPlayPhase) {
      this.broadcastLog(`${player.name} 的出牌阶段被跳过。`);
      setTimeout(() => this.discardPhase(player), 300);
      return;
    }

    if (player.isAI) {
      setTimeout(() => aiPlayPhase(this, player), 2000 + Math.random() * 1000);
    }
    // Human players send playCard messages; the phase ends when they send "endPlay" or we move to discard
  }

  discardPhase(player) {
    if (this.gameOver || !player.alive) return;
    // Wait if there's a pending response
    if (this.pendingResponse) {
      setTimeout(() => this.discardPhase(player), 1000);
      return;
    }
    this.broadcastPhase('discard', player.id);

    const maxCards = Math.max(player.hp, 0);
    const toDiscard = player.hand.length - maxCards;

    if (toDiscard <= 0) {
      this.endPhase(player);
      return;
    }

    if (player.isAI) {
      setTimeout(() => aiDiscardPhase(this, player, toDiscard), 2500);
    } else {
      // Tell player they need to discard
      player.send({ type: 'requestResponse', requestType: 'discard', count: toDiscard, fromPlayer: player.id });
    }
  }

  endPhase(player) {
    if (this.gameOver) return;
    // Don't end phase if there's a pending response
    if (this.pendingResponse) {
      setTimeout(() => this.endPhase(player), 1000);
      return;
    }
    this.broadcastPhase('end', player.id);

    // Zeratul void cloak: set aside 1 card
    if (player.heroId === 'zeratul' && player.hand.length > 0 && player.isAI) {
      const card = player.hand.pop();
      player.voidCard = card;
      this.broadcastHandCounts(player);
    }

    this.nextTurn();
  }

  nextTurn() {
    if (this.gameOver) return;
    // Don't start next turn if there's a pending response
    if (this.pendingResponse) {
      setTimeout(() => this.nextTurn(), 1000);
      return;
    }
    let attempts = 0;
    do {
      this.currentPlayerIdx = (this.currentPlayerIdx + 1) % this.players.length;
      attempts++;
    } while (!this.players[this.currentPlayerIdx].alive && attempts < this.players.length);

    if (attempts >= this.players.length) {
      this.endGame([], 'none');
      return;
    }
    this.startTurn();
  }

  nextAlivePlayer(player) {
    let idx = this.players.indexOf(player);
    for (let i = 1; i < this.players.length; i++) {
      const next = this.players[(idx + i) % this.players.length];
      if (next.alive) return next;
    }
    return null;
  }

  adjacentPlayers(player) {
    const alive = this.players.filter(p => p.alive);
    const idx = alive.indexOf(player);
    if (idx === -1) return [];
    const adj = [];
    if (alive.length > 1) adj.push(alive[(idx + 1) % alive.length]);
    if (alive.length > 2) adj.push(alive[(idx - 1 + alive.length) % alive.length]);
    return adj;
  }

  // ---- Card playing ----
  playCard(playerId, cardId, targetId, extraCardIds) {
    const player = this.room.getPlayer(playerId);
    if (!player || !player.alive) return;
    if (this.gameOver) return;

    // "endPlay" signal to move to discard phase
    if (cardId === 'endPlay') {
      if (this.turnPlayer && this.turnPlayer.id === playerId && this.currentPhase === 'play') {
        this.discardPhase(this.turnPlayer);
      }
      return;
    }

    const card = player.getCard(cardId);
    if (!card) {
      player.send({ type: 'error', message: '你没有这张牌。' });
      return;
    }

    const target = targetId ? this.room.getPlayer(targetId) : null;

    switch (card.subtype) {
      case 'strike':
        this.playStrike(player, card, target);
        break;
      case 'dodge':
        player.send({ type: 'error', message: '闪不能主动使用。' });
        break;
      case 'peach':
        this.playPeach(player, card, target);
        break;
      case 'barbarian':
        this.playAOE(player, card, 'strike');
        break;
      case 'arrowrain':
        this.playAOE(player, card, 'dodge');
        break;
      case 'peachgarden':
        this.playPeachGarden(player, card);
        break;
      case 'draw2':
        this.playDraw2(player, card);
        break;
      case 'duel':
        this.playDuel(player, card, target);
        break;
      case 'snatch':
        this.playSnatch(player, card, target);
        break;
      case 'dismantle':
        this.playDismantle(player, card, target);
        break;
      case 'indulgence':
        this.playDelayedTrick(player, card, target);
        break;
      case 'lightning':
        this.playLightning(player, card);
        break;
      case 'nullify':
        player.send({ type: 'error', message: '反制矩阵只能在锦囊使用时打出。' });
        break;
      case 'borrowsword':
        this.playBorrowSword(player, card, target, extraCardIds);
        break;
      case 'fireattack':
        this.playFireAttack(player, card, target);
        break;
      case 'weapon':
      case 'armor':
      case 'horse_plus':
      case 'horse_minus':
        this.equipCard(player, card);
        break;
      default:
        player.send({ type: 'error', message: '无法使用该牌。' });
    }
  }

  // ---- Strike (杀) ----
  playStrike(player, card, target) {
    if (!target || !target.alive) {
      player.send({ type: 'error', message: '请选择有效的目标。' });
      return;
    }
    if (player.strikeCount >= player.maxStrikes()) {
      player.send({ type: 'error', message: '本回合已使用过杀。' });
      return;
    }
    if (!this.canStrike(player, target)) {
      player.send({ type: 'error', message: '目标不在攻击范围内。' });
      return;
    }

    // Check 相位护甲 (Ren Wang Shield) - immune to black 杀
    if (target.equipment.armor && target.equipment.armor.name === '相位护甲' && isBlackSuit(card.suit)) {
      player.removeCard(card.id);
      this.discardCard(card);
      player.strikeCount++;
      player.send({ type: 'yourCards', cards: player.hand });
      this.broadcastHandCounts(player);
      this.room.broadcast({ type: 'cardPlayed', playerId: player.id, card: { id: card.id, name: card.name, suit: card.suit, number: card.number }, targetId: target.id });
      this.broadcastLog(`${player.name} 对 ${target.name} 使用了杀，但被相位护甲抵挡。`);
      return;
    }

    // Check 生化护甲 (Vine Armor) - immune to normal 杀
    if (target.equipment.armor && target.equipment.armor.name === '生化护甲') {
      player.removeCard(card.id);
      this.discardCard(card);
      player.strikeCount++;
      player.send({ type: 'yourCards', cards: player.hand });
      this.broadcastHandCounts(player);
      this.room.broadcast({ type: 'cardPlayed', playerId: player.id, card: { id: card.id, name: card.name, suit: card.suit, number: card.number }, targetId: target.id });
      this.broadcastLog(`${player.name} 对 ${target.name} 使用了杀，但被生化护甲抵挡。`);
      return;
    }

    player.removeCard(card.id);
    this.discardCard(card);
    player.strikeCount++;
    player.send({ type: 'yourCards', cards: player.hand });
    this.broadcastHandCounts(player);

    this.room.broadcast({
      type: 'cardPlayed', playerId: player.id,
      card: { id: card.id, name: card.name, suit: card.suit, number: card.number },
      targetId: target.id
    });
    this.broadcastLog(`${player.name} 对 ${target.name} 使用了杀。`);

    // Zeratul shadow strike: 杀 cannot be dodged once per turn
    if (player.heroId === 'zeratul' && player.strikeCount === 1) {
      let damage = 1;
      if (player.heroId === 'tychus' && player.desperadoBoost) damage++;
      if (player.heroId === 'fenix' && player.hp < 2) damage++;
      this.strikeHit(player, target, card, damage);
      return;
    }

    let damage = 1;
    if (player.heroId === 'tychus' && player.desperadoBoost) damage++; // 亡命
    if (player.heroId === 'fenix' && player.hp < 2) damage++; // 勇士之魂

    // Faction counter: defender discards extra card
    const counterFaction = FACTION_COUNTER[player.faction];
    const factionCountered = target.faction === counterFaction;

    // Check 护盾电池 (Eight Trigrams) - auto dodge on heart/diamond
    if (target.equipment.armor && target.equipment.armor.name === '护盾电池') {
      const judgeCard = this.drawCard();
      if (judgeCard) {
        this.discard.push(judgeCard);
        this.room.broadcast({
          type: 'judgement', playerId: target.id,
          card: { id: judgeCard.id, name: judgeCard.name, suit: judgeCard.suit, number: judgeCard.number },
          result: isRedSuit(judgeCard.suit) ? '护盾电池生效' : '护盾电池失效'
        });
        if (isRedSuit(judgeCard.suit)) {
          this.broadcastLog(`${target.name} 的护盾电池自动闪避。`);
          return; // dodged
        }
      }
    }

    // Ask target to play 闪
    this.requestDodge(player, target, card, damage, factionCountered);
  }

  requestDodge(attacker, target, strikeCard, damage, factionCountered) {
    const response = {
      type: 'dodge',
      fromPlayer: attacker,
      targetPlayer: target,
      card: strikeCard,
      damage,
      factionCountered,
      callback: (dodged) => {
        this.clearPendingResponse();
        if (dodged) {
          this.broadcastLog(`${target.name} 使用闪回避了杀。`);
          // 灵能刀刃 (Green Dragon Blade): chain 杀 on dodge
          if (attacker.equipment.weapon && attacker.equipment.weapon.name === '灵能刀刃') {
            this.broadcastLog(`${attacker.name} 的灵能刀刃发动，可以追杀。`);
            // Simplified: AI won't chain
          }
          // 攻城坦克炮: discard 2 to force hit
          if (attacker.equipment.weapon && attacker.equipment.weapon.name === '攻城坦克炮' && attacker.hand.length >= 2) {
            // Simplified: AI may use this
            if (attacker.isAI && attacker.hand.length >= 4) {
              const c1 = attacker.hand.pop();
              const c2 = attacker.hand.pop();
              this.discardCard(c1);
              this.discardCard(c2);
              this.broadcastLog(`${attacker.name} 发动攻城坦克炮，弃2牌强制命中。`);
              this.broadcastHandCounts(attacker);
              this.strikeHit(attacker, target, strikeCard, damage);
              return;
            }
          }
        } else {
          this.strikeHit(attacker, target, strikeCard, damage);
        }
      }
    };

    this.setPendingResponse(response);

    if (target.isAI) {
      setTimeout(() => aiRespondDodge(this, target, factionCountered), 2000 + Math.random() * 1000);
    }
  }

  strikeHit(attacker, target, strikeCard, damage) {
    this.broadcastLog(`杀命中了 ${target.name}。`);
    this.dealDamage(attacker, target, damage, 'strike');

    // 幽灵狙击枪: remove target mount on hit
    if (attacker.equipment.weapon && attacker.equipment.weapon.name === '幽灵狙击枪') {
      if (target.equipment.horse_plus) {
        this.discardCard(target.equipment.horse_plus);
        target.equipment.horse_plus = null;
        this.broadcastEquipChange(target, 'horse_plus');
        this.broadcastLog(`${attacker.name} 的幽灵狙击枪移除了 ${target.name} 的防御坐骑。`);
      } else if (target.equipment.horse_minus) {
        this.discardCard(target.equipment.horse_minus);
        target.equipment.horse_minus = null;
        this.broadcastEquipChange(target, 'horse_minus');
        this.broadcastLog(`${attacker.name} 的幽灵狙击枪移除了 ${target.name} 的进攻坐骑。`);
      }
    }

    // Kerrigan parasite: view target hand and take 1 card
    if (attacker.heroId === 'kerrigan' && target.alive && target.hand.length > 0) {
      const stolen = target.hand.splice(Math.floor(Math.random() * target.hand.length), 1)[0];
      if (stolen) {
        attacker.hand.push(stolen);
        attacker.send({ type: 'yourCards', cards: attacker.hand });
        target.send({ type: 'yourCards', cards: target.hand });
        this.broadcastHandCounts(attacker);
        this.broadcastHandCounts(target);
        this.broadcastLog(`${attacker.name} 的寄生技能从 ${target.name} 手中夺取了一张牌。`);
      }
    }
  }

  // ---- Peach (桃) ----
  playPeach(player, card, target) {
    const healTarget = target || player;
    if (healTarget.hp >= healTarget.maxHp) {
      player.send({ type: 'error', message: '目标生命值已满。' });
      return;
    }
    player.removeCard(card.id);
    this.discardCard(card);
    player.send({ type: 'yourCards', cards: player.hand });
    this.broadcastHandCounts(player);

    this.room.broadcast({
      type: 'cardPlayed', playerId: player.id,
      card: { id: card.id, name: card.name, suit: card.suit, number: card.number },
      targetId: healTarget.id
    });

    this.healPlayer(healTarget, 1);
    this.broadcastLog(`${player.name} 使用桃为 ${healTarget.name} 回复了1点体力。`);

    // Medic nanorepair: draw 1 when healed
    if (healTarget.heroId === 'medic') {
      this.drawCards(healTarget, 1);
      this.broadcastLog(`${healTarget.name} 的纳米修复技能触发，摸1张牌。`);
    }
  }

  healPlayer(player, amount) {
    player.hp = Math.min(player.hp + amount, player.maxHp);
    this.broadcastHpChange(player);
  }

  // ---- AOE tricks ----
  playAOE(player, card, responseType) {
    player.removeCard(card.id);
    this.discardCard(card);
    player.send({ type: 'yourCards', cards: player.hand });
    this.broadcastHandCounts(player);

    this.room.broadcast({
      type: 'cardPlayed', playerId: player.id,
      card: { id: card.id, name: card.name, suit: card.suit, number: card.number },
      targetId: null
    });

    const aoeType = card.subtype === 'barbarian' ? '虫群入侵' : '战列巡航舰轰炸';
    this.broadcastLog(`${player.name} 使用了 ${aoeType}。`);

    // Build list of targets (all alive players except caster, clockwise)
    const targets = [];
    let idx = this.players.indexOf(player);
    for (let i = 1; i < this.players.length; i++) {
      const t = this.players[(idx + i) % this.players.length];
      if (t.alive) {
        // Banshee cloak: immune to first trick
        if (t.heroId === 'banshee' && t.trickImmune) {
          t.trickImmune = false;
          this.broadcastLog(`${t.name} 的隐形技能抵消了 ${aoeType}。`);
          continue;
        }
        // Vine armor immune to barbarian
        if (t.equipment.armor && t.equipment.armor.name === '生化护甲' && card.subtype === 'barbarian') {
          this.broadcastLog(`${t.name} 的生化护甲抵消了虫群入侵。`);
          continue;
        }
        targets.push(t);
      }
    }

    this.resolveAOE(player, targets, 0, responseType);
  }

  resolveAOE(source, targets, idx, responseType) {
    if (this.gameOver || idx >= targets.length) return;
    const target = targets[idx];
    if (!target.alive) {
      this.resolveAOE(source, targets, idx + 1, responseType);
      return;
    }

    const neededSubtype = responseType === 'strike' ? 'strike' : 'dodge';
    const response = {
      type: neededSubtype,
      fromPlayer: source,
      targetPlayer: target,
      card: null,
      damage: 1,
      callback: (responded) => {
        this.clearPendingResponse();
        if (!responded) {
          this.dealDamage(source, target, 1, 'aoe');
        } else {
          this.broadcastLog(`${target.name} 回应了。`);
        }
        this.resolveAOE(source, targets, idx + 1, responseType);
      }
    };

    const reqType = neededSubtype === 'strike' ? 'strike_response' : 'dodge';
    this.setPendingResponse(response);

    if (target.isAI) {
      setTimeout(() => aiRespondAOE(this, target, neededSubtype), 2000 + Math.random() * 1000);
    }
  }

  // ---- Peach Garden ----
  playPeachGarden(player, card) {
    player.removeCard(card.id);
    this.discardCard(card);
    player.send({ type: 'yourCards', cards: player.hand });
    this.broadcastHandCounts(player);

    this.room.broadcast({
      type: 'cardPlayed', playerId: player.id,
      card: { id: card.id, name: card.name, suit: card.suit, number: card.number },
      targetId: null
    });
    this.broadcastLog(`${player.name} 使用了星际联盟，所有人回复1点体力。`);
    for (const p of this.players) {
      if (p.alive && p.hp < p.maxHp) {
        this.healPlayer(p, 1);
      }
    }
  }

  // ---- Draw 2 (矿物开采) ----
  playDraw2(player, card) {
    player.removeCard(card.id);
    this.discardCard(card);
    player.send({ type: 'yourCards', cards: player.hand });
    this.broadcastHandCounts(player);

    this.room.broadcast({
      type: 'cardPlayed', playerId: player.id,
      card: { id: card.id, name: card.name, suit: card.suit, number: card.number },
      targetId: null
    });
    this.broadcastLog(`${player.name} 使用了矿物开采，摸2张牌。`);
    this.drawCards(player, 2);
  }

  // ---- Duel (一对一单挑) ----
  playDuel(player, card, target) {
    if (!target || !target.alive || target.id === player.id) {
      player.send({ type: 'error', message: '请选择有效的决斗目标。' });
      return;
    }
    player.removeCard(card.id);
    this.discardCard(card);
    player.send({ type: 'yourCards', cards: player.hand });
    this.broadcastHandCounts(player);

    this.room.broadcast({
      type: 'cardPlayed', playerId: player.id,
      card: { id: card.id, name: card.name, suit: card.suit, number: card.number },
      targetId: target.id
    });
    this.broadcastLog(`${player.name} 对 ${target.name} 发起了决斗。`);

    this.resolveDuel(player, target, target); // target responds first
  }

  resolveDuel(source, target, currentResponder) {
    if (this.gameOver) return;
    const other = currentResponder.id === source.id ? target : source;

    const response = {
      type: 'duel_strike',
      fromPlayer: other,
      targetPlayer: currentResponder,
      card: null,
      damage: 1,
      callback: (played) => {
        this.clearPendingResponse();
        if (!played) {
          // Current responder loses
          this.broadcastLog(`${currentResponder.name} 未能出杀，决斗落败。`);
          const damageSource = currentResponder.id === source.id ? target : source;
          this.dealDamage(damageSource, currentResponder, 1, 'duel');
        } else {
          this.broadcastLog(`${currentResponder.name} 出了一张杀。`);
          this.resolveDuel(source, target, other);
        }
      }
    };

    this.setPendingResponse(response);

    if (currentResponder.isAI) {
      setTimeout(() => aiRespondDuel(this, currentResponder), 2000 + Math.random() * 500);
    }
  }

  // ---- Snatch (掠夺协议) ----
  playSnatch(player, card, target) {
    if (!target || !target.alive || target.id === player.id) {
      player.send({ type: 'error', message: '请选择有效目标。' });
      return;
    }
    if (this.getDistance(player, target) > 1) {
      player.send({ type: 'error', message: '掠夺协议只能对距离1以内的目标使用。' });
      return;
    }
    player.removeCard(card.id);
    this.discardCard(card);
    player.send({ type: 'yourCards', cards: player.hand });
    this.broadcastHandCounts(player);

    this.room.broadcast({
      type: 'cardPlayed', playerId: player.id,
      card: { id: card.id, name: card.name, suit: card.suit, number: card.number },
      targetId: target.id
    });
    this.broadcastLog(`${player.name} 对 ${target.name} 使用了掠夺协议。`);

    // Take a random card from target's hand or equipment
    const allTargetCards = [...target.hand];
    const equipSlots = ['weapon', 'armor', 'horse_plus', 'horse_minus'];
    for (const slot of equipSlots) {
      if (target.equipment[slot]) allTargetCards.push({ ...target.equipment[slot], _slot: slot });
    }

    if (allTargetCards.length > 0) {
      const picked = allTargetCards[Math.floor(Math.random() * allTargetCards.length)];
      if (picked._slot) {
        const equip = target.equipment[picked._slot];
        target.equipment[picked._slot] = null;
        player.hand.push(equip);
        this.broadcastEquipChange(target, picked._slot);
        // Silver lion heal on unequip
        if (equip.name === '再生甲虫') {
          this.healPlayer(target, 1);
          this.broadcastLog(`${target.name} 的再生甲虫卸下，恢复1点体力。`);
        }
      } else {
        const taken = target.removeCard(picked.id);
        if (taken) player.hand.push(taken);
      }
      player.send({ type: 'yourCards', cards: player.hand });
      target.send({ type: 'yourCards', cards: target.hand });
      this.broadcastHandCounts(player);
      this.broadcastHandCounts(target);
      this.broadcastLog(`${player.name} 从 ${target.name} 获得了一张牌。`);
    }
  }

  // ---- Dismantle (EMP打击) ----
  playDismantle(player, card, target) {
    if (!target || !target.alive || target.id === player.id) {
      player.send({ type: 'error', message: '请选择有效目标。' });
      return;
    }
    player.removeCard(card.id);
    this.discardCard(card);
    player.send({ type: 'yourCards', cards: player.hand });
    this.broadcastHandCounts(player);

    this.room.broadcast({
      type: 'cardPlayed', playerId: player.id,
      card: { id: card.id, name: card.name, suit: card.suit, number: card.number },
      targetId: target.id
    });
    this.broadcastLog(`${player.name} 对 ${target.name} 使用了EMP打击。`);

    // Discard random card from target
    const allTargetCards = [...target.hand];
    const equipSlots = ['weapon', 'armor', 'horse_plus', 'horse_minus'];
    for (const slot of equipSlots) {
      if (target.equipment[slot]) allTargetCards.push({ ...target.equipment[slot], _slot: slot });
    }

    if (allTargetCards.length > 0) {
      const picked = allTargetCards[Math.floor(Math.random() * allTargetCards.length)];
      if (picked._slot) {
        const equip = target.equipment[picked._slot];
        target.equipment[picked._slot] = null;
        this.discardCard(equip);
        this.broadcastEquipChange(target, picked._slot);
        if (equip.name === '再生甲虫') {
          this.healPlayer(target, 1);
          this.broadcastLog(`${target.name} 的再生甲虫卸下，恢复1点体力。`);
        }
      } else {
        const removed = target.removeCard(picked.id);
        if (removed) this.discardCard(removed);
      }
      target.send({ type: 'yourCards', cards: target.hand });
      this.broadcastHandCounts(target);
      this.broadcastLog(`${player.name} 拆除了 ${target.name} 的一张牌。`);
    }
  }

  // ---- Delayed Trick (电磁干扰) ----
  playDelayedTrick(player, card, target) {
    if (!target || !target.alive || target.id === player.id) {
      player.send({ type: 'error', message: '请选择有效目标。' });
      return;
    }
    // Check if target already has this delayed trick
    if (target.delayedTricks.some(c => c.subtype === card.subtype)) {
      player.send({ type: 'error', message: '目标已有同类延时锦囊。' });
      return;
    }
    player.removeCard(card.id);
    player.send({ type: 'yourCards', cards: player.hand });
    this.broadcastHandCounts(player);

    target.delayedTricks.push(card);
    this.room.broadcast({
      type: 'cardPlayed', playerId: player.id,
      card: { id: card.id, name: card.name, suit: card.suit, number: card.number },
      targetId: target.id
    });
    this.broadcastLog(`${player.name} 对 ${target.name} 使用了电磁干扰。`);
  }

  // ---- Lightning (离子风暴) ----
  playLightning(player, card) {
    player.removeCard(card.id);
    player.send({ type: 'yourCards', cards: player.hand });
    this.broadcastHandCounts(player);

    // Place on self
    player.delayedTricks.push(card);
    this.room.broadcast({
      type: 'cardPlayed', playerId: player.id,
      card: { id: card.id, name: card.name, suit: card.suit, number: card.number },
      targetId: player.id
    });
    this.broadcastLog(`${player.name} 放置了离子风暴。`);
  }

  // ---- Borrow Sword (雇佣兵合同) ----
  playBorrowSword(player, card, target, extraCardIds) {
    if (!target || !target.alive || target.id === player.id || !target.equipment.weapon) {
      player.send({ type: 'error', message: '雇佣兵合同需要选择一个有武器的目标。' });
      return;
    }
    const victimId = extraCardIds && extraCardIds[0];
    const victim = victimId ? this.room.getPlayer(victimId) : null;
    if (!victim || !victim.alive || victim.id === target.id) {
      player.send({ type: 'error', message: '请指定有效的被杀目标。' });
      return;
    }
    player.removeCard(card.id);
    this.discardCard(card);
    player.send({ type: 'yourCards', cards: player.hand });
    this.broadcastHandCounts(player);

    this.room.broadcast({
      type: 'cardPlayed', playerId: player.id,
      card: { id: card.id, name: card.name, suit: card.suit, number: card.number },
      targetId: target.id
    });
    this.broadcastLog(`${player.name} 使用雇佣兵合同，令 ${target.name} 杀 ${victim.name}。`);

    // Simplified: target either plays strike or gives weapon to player
    if (target.isAI) {
      setTimeout(() => {
        const strike = target.findCardBySubtype('strike');
        if (strike && this.canStrike(target, victim)) {
          target.removeCard(strike.id);
          this.discardCard(strike);
          target.send({ type: 'yourCards', cards: target.hand });
          this.broadcastHandCounts(target);
          this.broadcastLog(`${target.name} 对 ${victim.name} 出杀。`);
          this.dealDamage(target, victim, 1, 'strike');
        } else {
          // Give weapon to player
          const weapon = target.equipment.weapon;
          target.equipment.weapon = null;
          player.hand.push(weapon);
          this.broadcastEquipChange(target, 'weapon');
          player.send({ type: 'yourCards', cards: player.hand });
          this.broadcastHandCounts(player);
          this.broadcastLog(`${target.name} 交出了武器给 ${player.name}。`);
        }
      }, 2500);
    }
  }

  // ---- Fire Attack (核弹打击) ----
  playFireAttack(player, card, target) {
    if (!target || !target.alive) {
      player.send({ type: 'error', message: '请选择有效目标。' });
      return;
    }
    if (target.hand.length === 0) {
      player.send({ type: 'error', message: '目标没有手牌。' });
      return;
    }
    player.removeCard(card.id);
    this.discardCard(card);
    player.send({ type: 'yourCards', cards: player.hand });
    this.broadcastHandCounts(player);

    this.room.broadcast({
      type: 'cardPlayed', playerId: player.id,
      card: { id: card.id, name: card.name, suit: card.suit, number: card.number },
      targetId: target.id
    });

    // Simplified: deal 1 fire damage
    let fireDamage = 1;
    if (target.equipment.armor && target.equipment.armor.name === '生化护甲') fireDamage++;
    this.broadcastLog(`${player.name} 对 ${target.name} 使用了核弹打击，造成 ${fireDamage} 点火焰伤害。`);
    this.dealDamage(player, target, fireDamage, 'fire');
  }

  // ---- Equipment ----
  equipCard(player, card) {
    const slot = card.subtype; // weapon, armor, horse_plus, horse_minus
    player.removeCard(card.id);
    player.send({ type: 'yourCards', cards: player.hand });
    this.broadcastHandCounts(player);

    // Unequip existing
    if (player.equipment[slot]) {
      const old = player.equipment[slot];
      this.discardCard(old);
      // Silver lion heal on unequip
      if (old.name === '再生甲虫') {
        this.healPlayer(player, 1);
        this.broadcastLog(`${player.name} 的再生甲虫卸下，恢复1点体力。`);
      }
    }

    player.equipment[slot] = card;
    this.room.broadcast({
      type: 'cardPlayed', playerId: player.id,
      card: { id: card.id, name: card.name, suit: card.suit, number: card.number },
      targetId: player.id
    });
    this.broadcastEquipChange(player, slot);
    this.broadcastLog(`${player.name} 装备了 ${card.name}。`);

    // Swann armament: draw 2 when equipping weapon
    if (player.heroId === 'swann' && slot === 'weapon') {
      this.drawCards(player, 2);
      this.broadcastLog(`${player.name} 的军备升级技能触发，摸2张牌。`);
    }
  }

  // ---- Damage and death ----
  dealDamage(source, target, amount, damageType) {
    if (!target.alive) return;

    // Ultralisk heavy armor: damage -1 min 1
    if (target.heroId === 'ultralisk' && amount > 1) {
      amount = Math.max(amount - 1, 1);
      this.broadcastLog(`${target.name} 的重甲减少了1点伤害。`);
    }

    // Tassadar illusion projection: discard 2 to negate
    if (target.heroId === 'tassadar' && target.hand.length >= 2 && target.isAI) {
      const c1 = target.hand.pop();
      const c2 = target.hand.pop();
      this.discardCard(c1);
      this.discardCard(c2);
      target.send({ type: 'yourCards', cards: target.hand });
      this.broadcastHandCounts(target);
      this.broadcastLog(`${target.name} 发动幻象投影，弃2牌抵消伤害。`);
      return;
    }

    // Silver lion: max 1 damage at a time
    if (target.equipment.armor && target.equipment.armor.name === '再生甲虫') {
      amount = Math.min(amount, 1);
    }

    target.hp -= amount;
    this.broadcastHpChange(target);
    this.room.broadcast({ type: 'damageDealt', targetId: target.id, amount, sourceId: source ? source.id : null });
    this.broadcastLog(`${target.name} 受到了 ${amount} 点伤害，当前体力 ${target.hp}/${target.maxHp}。`);

    // High Templar feedback: damaged by trick, deal 1 back
    if (target.heroId === 'highTemplar' && source && (damageType === 'aoe' || damageType === 'duel' || damageType === 'fire') && source.alive) {
      this.broadcastLog(`${target.name} 的反馈技能触发，对 ${source.name} 造成1点伤害。`);
      this.dealDamage(target, source, 1, 'feedback');
    }

    // Check dying
    if (target.hp <= 0) {
      this.handleDying(target, source);
    }
  }

  handleDying(player, killer) {
    // Fenix immortal: first time, recover to 2hp
    if (player.heroId === 'fenix' && !player.immortalUsed) {
      player.immortalUsed = true;
      player.hp = 2;
      this.broadcastHpChange(player);
      this.broadcastLog(`${player.name} 的不灭技能触发，恢复到2点体力。`);
      return;
    }

    // Ask for peach
    this.requestPeach(player, killer);
  }

  requestPeach(dyingPlayer, killer) {
    // Check if dying player has peach
    const peach = dyingPlayer.findCardBySubtype('peach');
    if (peach && dyingPlayer.isAI) {
      dyingPlayer.removeCard(peach.id);
      this.discardCard(peach);
      dyingPlayer.hp = 1;
      this.broadcastHpChange(dyingPlayer);
      dyingPlayer.send({ type: 'yourCards', cards: dyingPlayer.hand });
      this.broadcastHandCounts(dyingPlayer);
      this.broadcastLog(`${dyingPlayer.name} 使用桃自救。`);
      return;
    }

    if (!dyingPlayer.isAI) {
      // Set pending response for peach
      const response = {
        type: 'peach',
        fromPlayer: null,
        targetPlayer: dyingPlayer,
        card: null,
        damage: 0,
        callback: (saved) => {
          this.clearPendingResponse();
          if (!saved) {
            this.handleDeath(dyingPlayer, killer);
          }
        }
      };
      this.setPendingResponse(response);
      return;
    }

    // AI has no peach, die
    this.handleDeath(dyingPlayer, killer);
  }

  handleDeath(player, killer) {
    player.alive = false;
    player.hp = 0;

    // Discard all cards
    for (const c of player.hand) this.discardCard(c);
    player.hand = [];
    for (const slot of ['weapon', 'armor', 'horse_plus', 'horse_minus']) {
      if (player.equipment[slot]) {
        this.discardCard(player.equipment[slot]);
        player.equipment[slot] = null;
      }
    }
    for (const c of player.delayedTricks) this.discardCard(c);
    player.delayedTricks = [];

    this.room.broadcast({ type: 'playerDied', playerId: player.id, identity: player.identity, identityName: identityName(player.identity) });
    this.broadcastLog(`${player.name} 阵亡了！身份是 ${identityName(player.identity)}。`);

    // Tassadar sacrifice: fully heal one player
    if (player.heroId === 'tassadar') {
      const lowestHp = this.players.filter(p => p.alive).sort((a, b) => a.hp - b.hp)[0];
      if (lowestHp) {
        lowestHp.hp = lowestHp.maxHp;
        this.broadcastHpChange(lowestHp);
        this.broadcastLog(`${player.name} 的牺牲技能触发，完全治愈了 ${lowestHp.name}。`);
      }
    }

    // Kerrigan swarm will: when Zerg ally dies
    for (const p of this.players) {
      if (p.alive && p.heroId === 'kerrigan' && player.faction === 'zerg' && player.id !== p.id) {
        this.healPlayer(p, 1);
        this.drawCards(p, 2);
        this.broadcastLog(`${p.name} 的虫群意志技能触发。`);
      }
    }

    // Rewards and penalties
    if (killer) {
      if (player.identity === 'insurgent') {
        // Killer draws 3
        this.drawCards(killer, 3);
        this.broadcastLog(`${killer.name} 击杀反叛者，摸3张牌。`);
      }
      if (player.identity === 'guardian' && killer.identity === 'commander') {
        // Commander kills guardian - discard all cards
        for (const c of killer.hand) this.discardCard(c);
        killer.hand = [];
        for (const slot of ['weapon', 'armor', 'horse_plus', 'horse_minus']) {
          if (killer.equipment[slot]) {
            this.discardCard(killer.equipment[slot]);
            killer.equipment[slot] = null;
            this.broadcastEquipChange(killer, slot);
          }
        }
        killer.send({ type: 'yourCards', cards: killer.hand });
        this.broadcastHandCounts(killer);
        this.broadcastLog(`指挥官误杀卫戍者，弃掉所有牌。`);
      }
    }

    this.checkWinCondition(killer);
  }

  checkWinCondition(killer) {
    const alive = this.players.filter(p => p.alive);
    const commander = this.players.find(p => p.identity === 'commander');

    // Commander dead
    if (!commander || !commander.alive) {
      // Spy wins if only spy left
      if (alive.length === 1 && alive[0].identity === 'spy') {
        this.endGame([alive[0].id], 'spy');
      } else {
        // Insurgents win
        const insurgents = this.players.filter(p => p.identity === 'insurgent');
        this.endGame(insurgents.map(p => p.id), 'insurgent');
      }
      return;
    }

    // All insurgents and spy dead = commander + guardians win
    const insurgentsAlive = this.players.filter(p => p.alive && p.identity === 'insurgent');
    const spyAlive = this.players.filter(p => p.alive && p.identity === 'spy');
    if (insurgentsAlive.length === 0 && spyAlive.length === 0) {
      const winners = this.players.filter(p => p.identity === 'commander' || p.identity === 'guardian');
      this.endGame(winners.map(p => p.id), 'commander');
      return;
    }
  }

  endGame(winners, winIdentity) {
    this.gameOver = true;
    this.room.broadcast({ type: 'gameOver', winners, winIdentity });
    this.broadcastLog(`游戏结束！${identityName(winIdentity)} 阵营获胜！`);
  }

  // ---- Respond handler ----
  handleResponse(playerId, cardId, pass) {
    const player = this.room.getPlayer(playerId);
    if (!player) return;

    if (!this.pendingResponse || this.pendingResponse.targetPlayer.id !== playerId) {
      player.send({ type: 'error', message: '当前无需响应。' });
      return;
    }

    const pr = this.pendingResponse;
    // Clear timeout first to prevent race condition
    if (pr.timeoutId) {
      clearTimeout(pr.timeoutId);
      pr.timeoutId = null;
    }

    if (pr.type === 'peach') {
      if (pass) {
        this.pendingResponse = null;
        pr.callback(false);
        return;
      }
      const card = cardId ? player.getCard(cardId) : player.findCardBySubtype('peach');
      if (card && card.subtype === 'peach') {
        player.removeCard(card.id);
        this.discardCard(card);
        player.hp = 1;
        this.broadcastHpChange(player);
        player.send({ type: 'yourCards', cards: player.hand });
        this.broadcastHandCounts(player);
        this.broadcastLog(`${player.name} 使用桃自救。`);
        this.pendingResponse = null;
        pr.callback(true);
      } else {
        this.pendingResponse = null;
        pr.callback(false);
      }
      return;
    }

    if (pr.type === 'dodge') {
      if (pass) {
        this.pendingResponse = null;
        pr.callback(false);
        return;
      }
      // Acid spore: target cannot dodge
      if (player.cannotDodge) {
        this.broadcastLog(`${player.name} 受到腐蚀孢子影响，无法使用闪。`);
        this.pendingResponse = null;
        pr.callback(false);
        return;
      }
      const card = cardId ? player.getCard(cardId) : player.findCardBySubtype('dodge');
      if (card && card.subtype === 'dodge') {
        // Faction counter: need extra discard
        if (pr.factionCountered && player.hand.length <= 1) {
          // Not enough cards for counter penalty - still can dodge but must discard another card
          // If only 1 card (the dodge), allow it but no extra discard
        }
        player.removeCard(card.id);
        this.discardCard(card);

        // Faction counter extra discard
        if (pr.factionCountered && player.hand.length > 0) {
          const extra = player.hand.pop();
          this.discardCard(extra);
          this.broadcastLog(`${player.name} 因阵营克制额外弃掉一张牌。`);
        }

        player.send({ type: 'yourCards', cards: player.hand });
        this.broadcastHandCounts(player);
        // Mutalisk agility: draw 1 when playing 闪 outside your turn
        if (player.heroId === 'mutalisk' && this.turnPlayer && this.turnPlayer.id !== player.id) {
          this.drawCards(player, 1);
          this.broadcastLog(`${player.name} 的敏捷技能触发，摸1张牌。`);
        }
        this.pendingResponse = null;
        pr.callback(true);
      } else {
        this.pendingResponse = null;
        pr.callback(false);
      }
      return;
    }

    if (pr.type === 'strike') {
      // Response for barbarian invasion
      if (pass) {
        this.pendingResponse = null;
        pr.callback(false);
        return;
      }
      const card = cardId ? player.getCard(cardId) : player.findCardBySubtype('strike');
      if (card && card.subtype === 'strike') {
        player.removeCard(card.id);
        this.discardCard(card);
        player.send({ type: 'yourCards', cards: player.hand });
        this.broadcastHandCounts(player);
        this.pendingResponse = null;
        pr.callback(true);
      } else {
        this.pendingResponse = null;
        pr.callback(false);
      }
      return;
    }

    if (pr.type === 'duel_strike') {
      if (pass) {
        this.pendingResponse = null;
        pr.callback(false);
        return;
      }
      const card = cardId ? player.getCard(cardId) : player.findCardBySubtype('strike');
      if (card && card.subtype === 'strike') {
        player.removeCard(card.id);
        this.discardCard(card);
        player.send({ type: 'yourCards', cards: player.hand });
        this.broadcastHandCounts(player);
        this.pendingResponse = null;
        pr.callback(true);
      } else {
        this.pendingResponse = null;
        pr.callback(false);
      }
      return;
    }

    // Default: pass
    this.pendingResponse = null;
    pr.callback(false);
  }

  // ---- Discard handler ----
  handleDiscard(playerId, cardIds) {
    const player = this.room.getPlayer(playerId);
    if (!player) return;

    const maxCards = Math.max(player.hp, 0);
    const needed = player.hand.length - maxCards;

    if (!cardIds || cardIds.length < needed) {
      player.send({ type: 'error', message: `需要弃 ${needed} 张牌。` });
      return;
    }

    // Zeratul: may set aside 1 card
    for (const cid of cardIds) {
      const card = player.removeCard(cid);
      if (card) {
        // Zeratul void cloak on first discard
        if (player.heroId === 'zeratul' && !player.voidCard && cardIds.indexOf(cid) === cardIds.length - 1) {
          player.voidCard = card;
          this.broadcastLog(`${player.name} 将一张牌隐入虚空。`);
        } else {
          this.discardCard(card);
        }
      }
    }

    player.send({ type: 'yourCards', cards: player.hand });
    this.broadcastHandCounts(player);
    this.broadcastLog(`${player.name} 弃掉了 ${cardIds.length} 张牌。`);
    this.endPhase(player);
  }

  // ---- Medic first aid skill ----
  useSkill(playerId, skillId, targetId, cardIds) {
    const player = this.room.getPlayer(playerId);
    if (!player) return;

    if (skillId === 'firstaid' && player.heroId === 'medic') {
      // Discard 1 red card to heal target
      if (!cardIds || cardIds.length < 1) return;
      const card = player.getCard(cardIds[0]);
      if (!card || !isRedSuit(card.suit)) {
        player.send({ type: 'error', message: '需要弃一张红色牌。' });
        return;
      }
      const target = this.room.getPlayer(targetId);
      if (!target || !target.alive || target.hp >= target.maxHp) return;
      player.removeCard(card.id);
      this.discardCard(card);
      this.healPlayer(target, 1);
      player.send({ type: 'yourCards', cards: player.hand });
      this.broadcastHandCounts(player);
      this.broadcastLog(`${player.name} 发动急救技能，治愈 ${target.name} 1点体力。`);
    }

    if (skillId === 'psistorm' && player.heroId === 'highTemplar') {
      // Discard 2 cards to deal 1 damage to all others
      if (!cardIds || cardIds.length < 2) return;
      const c1 = player.removeCard(cardIds[0]);
      const c2 = player.removeCard(cardIds[1]);
      if (c1) this.discardCard(c1);
      if (c2) this.discardCard(c2);
      player.send({ type: 'yourCards', cards: player.hand });
      this.broadcastHandCounts(player);
      this.broadcastLog(`${player.name} 发动灵能风暴！`);
      for (const t of this.players) {
        if (t.alive && t.id !== player.id) {
          this.dealDamage(player, t, 1, 'psistorm');
        }
      }
    }

    if (skillId === 'nuke' && player.heroId === 'nova') {
      // Discard 2 red cards to deal 2 damage to target
      if (!cardIds || cardIds.length < 2) return;
      const c1 = player.getCard(cardIds[0]);
      const c2 = player.getCard(cardIds[1]);
      if (!c1 || !c2 || !isRedSuit(c1.suit) || !isRedSuit(c2.suit)) {
        player.send({ type: 'error', message: '需要弃两张红色牌。' });
        return;
      }
      const target = this.room.getPlayer(targetId);
      if (!target || !target.alive) return;
      player.removeCard(c1.id);
      player.removeCard(c2.id);
      this.discardCard(c1);
      this.discardCard(c2);
      player.send({ type: 'yourCards', cards: player.hand });
      this.broadcastHandCounts(player);
      this.broadcastLog(`${player.name} 发动核弹定点，对 ${target.name} 造成2点伤害。`);
      this.dealDamage(player, target, 2, 'nuke');
    }

    if (skillId === 'repair' && player.heroId === 'swann') {
      // Discard equipment card to heal 1hp
      if (!cardIds || cardIds.length < 1) return;
      const card = player.getCard(cardIds[0]);
      if (!card || card.type !== 'equipment') {
        player.send({ type: 'error', message: '需要弃一张装备牌。' });
        return;
      }
      if (player.hp >= player.maxHp) return;
      player.removeCard(card.id);
      this.discardCard(card);
      this.healPlayer(player, 1);
      player.send({ type: 'yourCards', cards: player.hand });
      this.broadcastHandCounts(player);
      this.broadcastLog(`${player.name} 发动修理技能，恢复1点体力。`);
    }

    if (skillId === 'forcefield' && player.heroId === 'sentry') {
      // Discard 1 black card to protect a target from 杀 this turn
      if (!cardIds || cardIds.length < 1) return;
      const card = player.getCard(cardIds[0]);
      if (!card || !isBlackSuit(card.suit)) {
        player.send({ type: 'error', message: '需要弃一张黑色牌。' });
        return;
      }
      const target = this.room.getPlayer(targetId);
      if (!target || !target.alive) return;
      player.removeCard(card.id);
      this.discardCard(card);
      player.forcefieldTarget = target.id;
      player.send({ type: 'yourCards', cards: player.hand });
      this.broadcastHandCounts(player);
      this.broadcastLog(`${player.name} 发动力场，保护 ${target.name} 本回合不可被杀指定。`);
    }

    if (skillId === 'desperado' && player.heroId === 'tychus') {
      // Discard 1 card, strike damage +1 this turn
      if (!cardIds || cardIds.length < 1) return;
      const card = player.getCard(cardIds[0]);
      if (!card) return;
      player.removeCard(card.id);
      this.discardCard(card);
      player.desperadoBoost = true;
      player.send({ type: 'yourCards', cards: player.hand });
      this.broadcastHandCounts(player);
      this.broadcastLog(`${player.name} 发动亡命，本回合杀的伤害+1。`);
    }

    if (skillId === 'warp' && player.heroId === 'artanis') {
      // Discard 1 card, bypass distance for strikes this turn
      if (!cardIds || cardIds.length < 1) return;
      const card = player.getCard(cardIds[0]);
      if (!card) return;
      player.removeCard(card.id);
      this.discardCard(card);
      player.warpActive = true;
      player.send({ type: 'yourCards', cards: player.hand });
      this.broadcastHandCounts(player);
      this.broadcastLog(`${player.name} 发动折跃，本回合可对任意距离角色出杀。`);
    }

    if (skillId === 'psychicblast' && player.heroId === 'kerrigan') {
      // Discard 1 spade card, randomly discard 1 card from target's hand
      if (!cardIds || cardIds.length < 1) return;
      const card = player.getCard(cardIds[0]);
      if (!card || card.suit !== 'spade') {
        player.send({ type: 'error', message: '需要弃一张黑桃牌。' });
        return;
      }
      const target = this.room.getPlayer(targetId);
      if (!target || !target.alive || target.hand.length === 0) return;
      player.removeCard(card.id);
      this.discardCard(card);
      // Randomly discard 1 card from target's hand
      const randIdx = Math.floor(Math.random() * target.hand.length);
      const discarded = target.hand.splice(randIdx, 1)[0];
      this.discardCard(discarded);
      player.send({ type: 'yourCards', cards: player.hand });
      target.send({ type: 'yourCards', cards: target.hand });
      this.broadcastHandCounts(player);
      this.broadcastHandCounts(target);
      this.broadcastLog(`${player.name} 发动灵能爆发，弃掉了 ${target.name} 的一张手牌（${discarded.name}）。`);
    }

    if (skillId === 'trample' && player.heroId === 'ultralisk') {
      // Discard 2 cards, deal 1 damage ignoring armor
      if (!cardIds || cardIds.length < 2) return;
      const c1 = player.getCard(cardIds[0]);
      const c2 = player.getCard(cardIds[1]);
      if (!c1 || !c2) return;
      const target = this.room.getPlayer(targetId);
      if (!target || !target.alive) return;
      player.removeCard(c1.id);
      player.removeCard(c2.id);
      this.discardCard(c1);
      this.discardCard(c2);
      player.send({ type: 'yourCards', cards: player.hand });
      this.broadcastHandCounts(player);
      this.broadcastLog(`${player.name} 发动践踏，对 ${target.name} 造成1点伤害（无视防具）。`);
      // Deal damage directly bypassing armor
      if (target.alive) {
        target.hp -= 1;
        this.broadcastHpChange(target);
        this.room.broadcast({ type: 'damageDealt', targetId: target.id, amount: 1, sourceId: player.id });
        this.broadcastLog(`${target.name} 受到了 1 点伤害，当前体力 ${target.hp}/${target.maxHp}。`);
        if (target.hp <= 0) {
          this.handleDying(target, player);
        }
      }
    }

    if (skillId === 'acidspore' && player.heroId === 'mutalisk') {
      // Discard 1 card, target cannot dodge this turn
      if (!cardIds || cardIds.length < 1) return;
      const card = player.getCard(cardIds[0]);
      if (!card) return;
      const target = this.room.getPlayer(targetId);
      if (!target || !target.alive) return;
      player.removeCard(card.id);
      this.discardCard(card);
      target.cannotDodge = true;
      player.send({ type: 'yourCards', cards: player.hand });
      this.broadcastHandCounts(player);
      this.broadcastLog(`${player.name} 发动腐蚀孢子，${target.name} 本回合不能使用闪。`);
    }
  }
}

// ============================================================
// SECTION 7: AI PLAYER LOGIC
// ============================================================
function aiPlayPhase(game, player) {
  if (game.gameOver || !player.alive || game.currentPhase !== 'play') return;
  if (game.turnPlayer.id !== player.id) return;

  // AI play logic with small delays between actions
  const actions = [];

  // Play 桃 when low hp
  if (player.hp < player.maxHp) {
    const peach = player.findCardBySubtype('peach');
    if (peach && player.hp <= player.maxHp - 1) {
      actions.push(() => game.playCard(player.id, peach.id, player.id));
    }
  }

  // Medic first aid: heal allies
  if (player.heroId === 'medic') {
    const redCards = player.hand.filter(c => isRedSuit(c.suit) && c.subtype !== 'peach');
    const wounded = game.players.filter(p => p.alive && p.hp < p.maxHp && p.id !== player.id);
    if (redCards.length > 0 && wounded.length > 0) {
      actions.push(() => game.useSkill(player.id, 'firstaid', wounded[0].id, [redCards[0].id]));
    }
  }

  // Play trick cards
  const draw2Cards = player.hand.filter(c => c.subtype === 'draw2');
  for (const c of draw2Cards) {
    actions.push(() => game.playCard(player.id, c.id));
  }

  // Play equipment
  const equipCards = player.hand.filter(c => c.type === 'equipment');
  for (const c of equipCards) {
    actions.push(() => game.playCard(player.id, c.id));
  }

  // Determine target based on identity
  function pickTarget() {
    const targets = game.players.filter(p => p.alive && p.id !== player.id);
    if (targets.length === 0) return null;

    if (player.identity === 'insurgent') {
      // Target commander
      const cmd = targets.find(p => p.identity === 'commander');
      if (cmd) return cmd;
    }
    if (player.identity === 'guardian' || player.identity === 'commander') {
      // Target non-commander, non-guardian
      const enemies = targets.filter(p => p.identity !== 'commander' && p.identity !== 'guardian');
      if (enemies.length > 0) return enemies[Math.floor(Math.random() * enemies.length)];
    }
    if (player.identity === 'spy') {
      // Target whoever has most cards (conservative play)
      return targets.sort((a, b) => b.hand.length - a.hand.length)[0];
    }
    return targets[Math.floor(Math.random() * targets.length)];
  }

  // Play 杀
  if (player.strikeCount < player.maxStrikes()) {
    const strike = player.findCardBySubtype('strike');
    if (strike) {
      const target = pickTarget();
      if (target && game.canStrike(player, target)) {
        actions.push(() => game.playCard(player.id, strike.id, target.id));
      }
    }
  }

  // Play AOE if we have one
  const barbarian = player.hand.find(c => c.subtype === 'barbarian');
  if (barbarian) {
    actions.push(() => game.playCard(player.id, barbarian.id));
  }
  const arrowrain = player.hand.find(c => c.subtype === 'arrowrain');
  if (arrowrain) {
    actions.push(() => game.playCard(player.id, arrowrain.id));
  }

  // Play duel
  const duel = player.hand.find(c => c.subtype === 'duel');
  if (duel) {
    const target = pickTarget();
    if (target) {
      actions.push(() => game.playCard(player.id, duel.id, target.id));
    }
  }

  // Play snatch/dismantle
  const snatch = player.hand.find(c => c.subtype === 'snatch');
  if (snatch) {
    const target = pickTarget();
    if (target && game.getDistance(player, target) <= 1) {
      actions.push(() => game.playCard(player.id, snatch.id, target.id));
    }
  }
  const dismantle = player.hand.find(c => c.subtype === 'dismantle');
  if (dismantle) {
    const target = pickTarget();
    if (target) {
      actions.push(() => game.playCard(player.id, dismantle.id, target.id));
    }
  }

  // Play delayed tricks
  const indulgence = player.hand.find(c => c.subtype === 'indulgence');
  if (indulgence) {
    const target = pickTarget();
    if (target && !target.delayedTricks.some(c => c.subtype === 'indulgence')) {
      actions.push(() => game.playCard(player.id, indulgence.id, target.id));
    }
  }
  const lightning = player.hand.find(c => c.subtype === 'lightning');
  if (lightning) {
    actions.push(() => game.playCard(player.id, lightning.id));
  }

  // Execute actions sequentially with delays
  function executeActions(idx) {
    if (game.gameOver || !player.alive || game.currentPhase !== 'play') return;
    // Wait if there's a pending response (someone needs to respond)
    if (game.pendingResponse) {
      setTimeout(() => executeActions(idx), 1000);
      return;
    }
    if (idx >= actions.length) {
      // End play phase
      game.discardPhase(player);
      return;
    }
    try {
      actions[idx]();
    } catch (e) { /* ignore errors in AI play */ }
    setTimeout(() => executeActions(idx + 1), 2500 + Math.random() * 1000);
  }

  if (actions.length > 0) {
    executeActions(0);
  } else {
    game.discardPhase(player);
  }
}

function aiDiscardPhase(game, player, toDiscard) {
  if (game.gameOver || !player.alive) return;
  // Discard lowest value cards
  const sorted = [...player.hand].sort((a, b) => {
    // Keep peach and dodge, discard strikes and low value cards first
    const priority = { peach: 10, dodge: 8, strike: 3 };
    const pa = priority[a.subtype] || 5;
    const pb = priority[b.subtype] || 5;
    if (pa !== pb) return pa - pb;
    return a.number - b.number;
  });

  const discardIds = sorted.slice(0, toDiscard).map(c => c.id);
  game.handleDiscard(player.id, discardIds);
}

function aiRespondDodge(game, player, factionCountered) {
  if (!game.pendingResponse || game.pendingResponse.targetPlayer.id !== player.id) return;
  const dodge = player.findCardBySubtype('dodge');
  if (dodge) {
    // If faction countered, need extra card
    if (factionCountered && player.hand.length <= 1) {
      // Only have the dodge, no extra card - still dodge, counter penalty handled in response
    }
    game.handleResponse(player.id, dodge.id, false);
  } else {
    game.handleResponse(player.id, null, true);
  }
}

function aiRespondAOE(game, player, neededSubtype) {
  if (!game.pendingResponse || game.pendingResponse.targetPlayer.id !== player.id) return;
  const card = player.findCardBySubtype(neededSubtype);
  if (card) {
    game.handleResponse(player.id, card.id, false);
  } else {
    game.handleResponse(player.id, null, true);
  }
}

function aiRespondDuel(game, player) {
  if (!game.pendingResponse || game.pendingResponse.targetPlayer.id !== player.id) return;
  const strike = player.findCardBySubtype('strike');
  if (strike) {
    game.handleResponse(player.id, strike.id, false);
  } else {
    game.handleResponse(player.id, null, true);
  }
}

// ============================================================
// SECTION 8: MESSAGE HANDLERS
// ============================================================
function handleMessage(ws, playerId, data) {
  let msg;
  try {
    msg = typeof data === 'string' ? JSON.parse(data) : data;
  } catch (e) {
    sendTo(ws, { type: 'error', message: 'Invalid message format.' });
    return;
  }

  switch (msg.type) {
    case 'createRoom': {
      const playerName = (msg.playerName || 'Player').slice(0, 20);
      const roomId = generateRoomId();
      const room = new Room(roomId, playerId);
      rooms.set(roomId, room);
      const player = new Player(playerId, playerName, ws);
      room.addPlayer(player);
      playerRoomMap.set(playerId, roomId);
      sendTo(ws, { type: 'roomCreated', roomId, playerId });
      room.broadcastRoomUpdate();
      break;
    }

    case 'joinRoom': {
      const roomId = (msg.roomId || '').trim().toUpperCase();
      const room = rooms.get(roomId);
      if (!room) {
        sendTo(ws, { type: 'error', message: `房间 ${roomId} 不存在。/ Room not found.` });
        return;
      }
      if (room.game && room.game.gameStarted) {
        sendTo(ws, { type: 'error', message: '游戏已经开始。/ Game already started.' });
        return;
      }
      if (room.players.length >= 8) {
        sendTo(ws, { type: 'error', message: '房间已满。/ Room is full.' });
        return;
      }
      const playerName = (msg.playerName || 'Player').slice(0, 20);
      const player = new Player(playerId, playerName, ws);
      room.addPlayer(player);
      playerRoomMap.set(playerId, roomId);
      sendTo(ws, { type: 'joinSuccess', roomId, playerId });
      room.broadcastRoomUpdate();
      break;
    }

    case 'ready': {
      const roomId = playerRoomMap.get(playerId);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room) return;
      const player = room.getPlayer(playerId);
      if (!player) return;
      player.ready = !player.ready;
      room.broadcastRoomUpdate();
      break;
    }

    case 'addAI': {
      const roomId = playerRoomMap.get(playerId);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room) return;
      if (room.players.length >= 8) {
        sendTo(ws, { type: 'error', message: '房间已满。' });
        return;
      }
      const aiId = generatePlayerId();
      const aiNames = ['AI-陆战队员', 'AI-狂热者', 'AI-刺蛇', 'AI-幽灵特工', 'AI-追猎者', 'AI-蟑螂', 'AI-维京战机'];
      const aiCount = room.players.filter(p => p.isAI).length;
      const aiName = aiNames[aiCount % aiNames.length];
      const aiPlayer = new Player(aiId, aiName, null, true);
      aiPlayer.ready = true;
      room.addPlayer(aiPlayer);
      room.broadcastRoomUpdate();
      break;
    }

    case 'removeAI': {
      const roomId = playerRoomMap.get(playerId);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room) return;
      if (room.creatorId !== playerId) {
        sendTo(ws, { type: 'error', message: '只有房主可以移除AI。' });
        return;
      }
      const aiIdx = room.players.findIndex(p => p.isAI);
      if (aiIdx === -1) {
        sendTo(ws, { type: 'error', message: '没有AI可以移除。' });
        return;
      }
      room.players.splice(aiIdx, 1);
      room.broadcastRoomUpdate();
      break;
    }

    case 'startGame': {
      const roomId = playerRoomMap.get(playerId);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room) return;
      if (room.creatorId !== playerId) {
        sendTo(ws, { type: 'error', message: '只有房主可以开始游戏。' });
        return;
      }
      if (room.players.length < 2) {
        sendTo(ws, { type: 'error', message: '至少需要2名玩家。' });
        return;
      }
      const allReady = room.players.every(p => p.ready || p.id === playerId);
      if (!allReady) {
        sendTo(ws, { type: 'error', message: '不是所有玩家都准备好了。' });
        return;
      }

      const game = new GameEngine(room);
      room.game = game;
      game.assignIdentities();
      game.startHeroSelection();
      break;
    }

    case 'selectHero': {
      const roomId = playerRoomMap.get(playerId);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room || !room.game) return;
      room.game.selectHero(playerId, msg.heroId);
      break;
    }

    case 'rerollHeroes': {
      const roomId = playerRoomMap.get(playerId);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room || !room.game) return;
      const game = room.game;
      // Check if player hasn't selected yet
      const player = room.getPlayer(playerId);
      if (!player || player.heroId) return; // Already selected
      const pool = game.heroPool;
      if (!pool || pool.length < 3) return;
      // Generate 3 new random choices
      const usedIds = new Set();
      const oldChoices = game.heroSelections.get(playerId) || [];
      for (const h of oldChoices) usedIds.add(h.id);
      // Also exclude heroes already chosen by other players
      for (const p of game.players) {
        if (p.heroId) usedIds.add(p.heroId);
      }
      const available = HEROES.filter(h => !usedIds.has(h.id));
      if (available.length < 3) {
        sendTo(ws, { type: 'error', message: '没有更多英雄可供选择了。' });
        return;
      }
      shuffle(available);
      const newChoices = available.slice(0, 3);
      game.heroSelections.set(playerId, newChoices);
      player.send({
        type: 'heroSelect',
        heroes: newChoices.map(h => ({
          id: h.id, name: h.name, faction: h.faction, hp: h.hp,
          skills: h.skills.map(s => ({ id: s.id, name: s.name, desc: s.desc }))
        }))
      });
      break;
    }

    case 'playCard': {
      const roomId = playerRoomMap.get(playerId);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room || !room.game) return;
      room.game.playCard(playerId, msg.cardId, msg.targetId, msg.extraCardIds);
      room.lastActivity = Date.now();
      break;
    }

    case 'respond': {
      const roomId = playerRoomMap.get(playerId);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room || !room.game) return;
      room.game.handleResponse(playerId, msg.cardId, msg.pass);
      room.lastActivity = Date.now();
      break;
    }

    case 'discardCards': {
      const roomId = playerRoomMap.get(playerId);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room || !room.game) return;
      room.game.handleDiscard(playerId, msg.cardIds);
      room.lastActivity = Date.now();
      break;
    }

    case 'useSkill': {
      const roomId = playerRoomMap.get(playerId);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room || !room.game) return;
      room.game.useSkill(playerId, msg.skillId, msg.targetId, msg.cardIds);
      room.lastActivity = Date.now();
      break;
    }

    case 'chat': {
      const roomId = playerRoomMap.get(playerId);
      if (!roomId) return;
      const room = rooms.get(roomId);
      if (!room) return;
      const player = room.getPlayer(playerId);
      if (!player) return;
      const text = (msg.text || '').slice(0, 200);
      room.broadcast({ type: 'chat', from: player.name, text });
      break;
    }

    default:
      sendTo(ws, { type: 'error', message: `Unknown message type: ${msg.type}` });
  }
}

// ============================================================
// SECTION 9: HTTP SERVER & WEBSOCKET SETUP
// ============================================================
// ---- HTTP Server for static files ----
const server = http.createServer((req, res) => {
  // Health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', rooms: rooms.size, connections: wss ? wss.clients.size : 0 }));
    return;
  }

  let filePath = path.join(__dirname, 'public', req.url === '/' ? 'index.html' : req.url);
  filePath = decodeURIComponent(filePath);

  // Prevent directory traversal
  if (!filePath.startsWith(path.join(__dirname, 'public'))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

// ---- WebSocket Server ----
const wss = new WebSocket.Server({ server });

// ---- Ping/Pong heartbeat to keep connections alive through proxies ----
const HEARTBEAT_INTERVAL = 25000; // 25 seconds (Railway proxy timeout is ~60s)
function heartbeat() { this.isAlive = true; }

const pingTimer = setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) {
      console.log('Terminating dead WebSocket connection');
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, HEARTBEAT_INTERVAL);

wss.on('close', () => { clearInterval(pingTimer); });

wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  ws.on('pong', heartbeat);

  const playerId = generatePlayerId();
  console.log(`Player connected: ${playerId} from ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}`);

  ws.on('message', (data) => {
    try {
      handleMessage(ws, playerId, data.toString());
    } catch (e) {
      console.error('Error handling message:', e);
      sendTo(ws, { type: 'error', message: 'Server error processing your request.' });
    }
  });

  ws.on('close', () => {
    console.log(`Player disconnected: ${playerId}`);
    const roomId = playerRoomMap.get(playerId);
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        const player = room.getPlayer(playerId);
        if (player) {
          player.ws = null;
          // If game hasn't started, remove player
          if (!room.game || !room.game.gameStarted) {
            room.removePlayer(playerId);
            room.broadcastRoomUpdate();
          } else {
            // Mark as disconnected but keep in game
            room.broadcast({ type: 'log', text: `${player.name} 断开了连接。` });
          }
        }
        // Remove empty rooms
        if (room.players.filter(p => !p.isAI).length === 0) {
          rooms.delete(roomId);
        }
      }
      playerRoomMap.delete(playerId);
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
  });

  sendTo(ws, { type: 'connected', playerId });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`StarCraft San Guo Sha server running on port ${PORT}`);
  console.log(`Serving static files from ${path.join(__dirname, 'public')}`);
});

