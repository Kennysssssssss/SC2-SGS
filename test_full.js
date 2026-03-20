const WebSocket = require('ws');

function connect(name) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:8080');
    let playerId = null;
    const messages = [];
    ws.on('open', () => console.log(`[${name}] 已连接`));
    ws.on('message', (data) => {
      const msg = JSON.parse(data);
      messages.push(msg);
      if (msg.type === 'connected') playerId = msg.playerId;
    });
    ws.on('error', (e) => reject(e));
    const check = setInterval(() => {
      if (playerId) { clearInterval(check); resolve({ ws, playerId, messages }); }
    }, 100);
    setTimeout(() => { clearInterval(check); reject(new Error(`${name} timeout`)); }, 5000);
  });
}

function waitForMsg(client, type, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const existing = client.messages.find(m => m.type === type);
    if (existing) return resolve(existing);
    const t = setTimeout(() => reject(new Error(`Timeout waiting for ${type}`)), timeout);
    const handler = (data) => {
      const msg = JSON.parse(data);
      if (msg.type === type) {
        clearTimeout(t);
        client.ws.removeListener('message', handler);
        resolve(msg);
      }
    };
    client.ws.on('message', handler);
  });
}

async function test() {
  console.log('=== 全流程测试 ===\n');

  const p1 = await connect('玩家1');
  console.log(`[玩家1] ID: ${p1.playerId}`);

  // Create room
  const roomP = waitForMsg(p1, 'roomCreated');
  p1.ws.send(JSON.stringify({ type: 'createRoom', playerName: '测试玩家' }));
  const room = await roomP;
  console.log(`[玩家1] 创建房间: ${room.roomId}`);

  // Add AI
  p1.ws.send(JSON.stringify({ type: 'addAI' }));
  await new Promise(r => setTimeout(r, 500));

  // Start game
  const heroP = waitForMsg(p1, 'heroSelect');
  p1.ws.send(JSON.stringify({ type: 'startGame' }));
  const heroes = await heroP;
  console.log(`[英雄选择] 可选: ${heroes.heroes.map(h => h.name).join(', ')}`);
  console.log(`[英雄技能] ${heroes.heroes[0].name}: ${heroes.heroes[0].skills.map(s => s.name + '-' + s.desc).join(' | ')}`);

  // Select hero
  const gameP = waitForMsg(p1, 'gameStart');
  p1.ws.send(JSON.stringify({ type: 'selectHero', heroId: heroes.heroes[0].id }));
  const game = await gameP;
  console.log(`\n[游戏开始]`);
  console.log(`  身份: ${game.yourIdentity}`);
  console.log(`  手牌: ${game.yourCards.map(c => c.name + '(' + c.description + ')').join(', ')}`);
  console.log(`  玩家列表:`);
  game.players.forEach(p => console.log(`    - ${p.name} [${p.heroName}] ${p.faction} HP:${p.hp}/${p.maxHp}`));

  // Wait for game to progress a bit
  console.log('\n等待游戏进行...');
  await new Promise(r => setTimeout(r, 8000));

  // Check logs
  const logs = p1.messages.filter(m => m.type === 'log');
  console.log(`\n[最近日志] (${logs.length}条):`);
  logs.slice(-8).forEach(l => console.log(`  ${l.text}`));

  console.log('\n=== 测试通过 ===');
  p1.ws.close();
  process.exit(0);
}

test().catch(e => { console.error('测试失败:', e.message); process.exit(1); });
