const WebSocket = require('ws');
const URL = 'ws://localhost:8080';

function connect(name) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(URL);
    const msgs = [];
    ws.on('open', () => {
      ws.on('message', d => {
        const m = JSON.parse(d);
        msgs.push(m);
        if (m.type === 'connected') resolve({ ws, id: m.playerId, msgs, send: o => ws.send(JSON.stringify(o)) });
      });
    });
    ws.on('error', reject);
  });
}

async function test() {
  // Connect player 1
  const p1 = await connect('测试玩家1');
  console.log('P1 connected:', p1.id);
  
  // Create room
  p1.send({ type: 'createRoom', playerName: '测试玩家1' });
  await new Promise(r => setTimeout(r, 500));
  
  const roomMsg = p1.msgs.find(m => m.type === 'roomCreated');
  if (!roomMsg) { console.log('FAIL: no roomCreated'); process.exit(1); }
  console.log('Room created:', roomMsg.roomId);
  
  // Add 3 AIs
  p1.send({ type: 'addAI' });
  p1.send({ type: 'addAI' });
  p1.send({ type: 'addAI' });
  await new Promise(r => setTimeout(r, 500));
  
  // Check room update
  const roomUpdates = p1.msgs.filter(m => m.type === 'roomUpdate');
  const lastUpdate = roomUpdates[roomUpdates.length - 1];
  console.log('Players in room:', lastUpdate?.players?.length || 0);
  
  // Start game
  p1.send({ type: 'startGame' });
  await new Promise(r => setTimeout(r, 1000));
  
  // Check hero select
  const heroSelect = p1.msgs.find(m => m.type === 'heroSelect');
  if (heroSelect) {
    console.log('Hero choices:', heroSelect.heroes.map(h => h.name).join(', '));
    // Select first hero
    p1.send({ type: 'selectHero', heroId: heroSelect.heroes[0].id });
    console.log('Selected hero:', heroSelect.heroes[0].name);
  }
  
  await new Promise(r => setTimeout(r, 2000));
  
  // Check game start
  const gameStart = p1.msgs.find(m => m.type === 'gameStart');
  if (gameStart) {
    console.log('Game started!');
    console.log('My identity:', gameStart.yourIdentity, gameStart.yourIdentityName);
    console.log('My cards:', gameStart.yourCards?.length || 0);
    console.log('Players:', gameStart.players?.map(p => `${p.name}(${p.heroName})`).join(', '));
    console.log('Hero data keys:', Object.keys(gameStart.heroData || {}).join(', '));
    console.log('Hero data sample:', JSON.stringify(Object.values(gameStart.heroData || {})[0]?.skills?.[0] || 'none'));
  } else {
    console.log('No gameStart yet, checking msgs:', p1.msgs.map(m => m.type).join(', '));
  }
  
  // Wait for some gameplay
  await new Promise(r => setTimeout(r, 5000));
  
  // Check game events
  const types = {};
  for (const m of p1.msgs) {
    types[m.type] = (types[m.type] || 0) + 1;
  }
  console.log('\nMessage types received:', JSON.stringify(types, null, 2));
  
  // Check for errors
  const errors = p1.msgs.filter(m => m.type === 'error');
  if (errors.length > 0) console.log('ERRORS:', errors.map(e => e.message).join('; '));
  else console.log('No errors!');
  
  p1.ws.close();
  console.log('\nTest complete!');
  process.exit(0);
}

test().catch(e => { console.error(e); process.exit(1); });
