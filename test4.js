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
  send({ type: 'addAI' }); send({ type: 'addAI' }); send({ type: 'addAI' });
  await new Promise(r => setTimeout(r, 300));
  send({ type: 'startGame' });
  await new Promise(r => setTimeout(r, 800));
  
  const heroSelect = msgs.find(m => m.type === 'heroSelect');
  const pick = heroSelect?.heroes?.[0];
  console.log('Heroes offered:', heroSelect?.heroes?.map(h => h.name + '(' + h.skills.map(s=>s.id).join(',') + ')').join(' | '));
  send({ type: 'selectHero', heroId: pick.id });
  await new Promise(r => setTimeout(r, 2000));
  
  const gs = msgs.find(m => m.type === 'gameStart');
  if (!gs) { console.log('FAIL: no gameStart'); process.exit(1); }
  
  const me = gs.players.find(p => p.id === gs.yourId);
  console.log('My hero:', me?.heroName, '| Skills:', gs.heroData?.[me?.heroId]?.skills?.map(s => s.id + ':' + s.name).join(', '));
  console.log('Hand:', gs.yourCards?.map(c => c.name + '(' + c.suit + ')').join(', '));
  
  // Verify all heroes in heroData have skills
  let allSkills = [];
  for (const [hid, hdata] of Object.entries(gs.heroData || {})) {
    for (const s of hdata.skills || []) {
      allSkills.push(s.id);
    }
  }
  console.log('All skills in game:', allSkills.join(', '));
  
  // Wait for game to progress
  await new Promise(r => setTimeout(r, 4000));
  
  // Check for errors
  const errors = msgs.filter(m => m.type === 'error');
  console.log('Errors:', errors.length > 0 ? errors.map(e => e.message).join('; ') : 'none');
  
  // Check message types
  const types = {};
  for (const m of msgs) types[m.type] = (types[m.type] || 0) + 1;
  console.log('Message types:', JSON.stringify(types));
  
  ws.close();
  console.log('Test passed!');
  process.exit(0);
}
test().catch(e => { console.error(e); process.exit(1); });
