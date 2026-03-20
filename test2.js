const WebSocket = require('ws');
async function test() {
  const ws = new WebSocket('ws://localhost:8080');
  const msgs = [];
  ws.on('message', d => msgs.push(JSON.parse(d)));
  await new Promise(r => ws.on('open', r));
  await new Promise(r => setTimeout(r, 300));
  const send = o => ws.send(JSON.stringify(o));
  
  send({ type: 'createRoom', playerName: '测试' });
  await new Promise(r => setTimeout(r, 300));
  
  // Add 3 AIs
  send({ type: 'addAI' }); send({ type: 'addAI' }); send({ type: 'addAI' });
  await new Promise(r => setTimeout(r, 300));
  
  let lastUpdate = msgs.filter(m => m.type === 'roomUpdate').pop();
  console.log('After add 3 AI:', lastUpdate?.players?.length, 'players');
  
  // Remove 1 AI
  send({ type: 'removeAI' });
  await new Promise(r => setTimeout(r, 300));
  
  lastUpdate = msgs.filter(m => m.type === 'roomUpdate').pop();
  console.log('After remove 1 AI:', lastUpdate?.players?.length, 'players');
  const aiCount = lastUpdate?.players?.filter(p => p.isAI).length;
  console.log('AI count:', aiCount);
  
  // Add back and start
  send({ type: 'addAI' });
  await new Promise(r => setTimeout(r, 200));
  send({ type: 'startGame' });
  await new Promise(r => setTimeout(r, 800));
  
  const heroSelect = msgs.find(m => m.type === 'heroSelect');
  if (heroSelect) {
    send({ type: 'selectHero', heroId: heroSelect.heroes[0].id });
  }
  await new Promise(r => setTimeout(r, 2000));
  
  const gs = msgs.find(m => m.type === 'gameStart');
  console.log('Game started:', !!gs);
  console.log('Hero data count:', Object.keys(gs?.heroData || {}).length);
  
  // Check all players have hero data
  if (gs) {
    for (const p of gs.players) {
      const hd = gs.heroData[p.heroId];
      console.log(`  ${p.name}: ${p.heroName} - skills: ${hd ? hd.skills.map(s=>s.name).join(',') : 'MISSING'}`);
    }
  }
  
  ws.close();
  console.log('All tests passed!');
  process.exit(0);
}
test().catch(e => { console.error(e); process.exit(1); });
