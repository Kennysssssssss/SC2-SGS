const WebSocket = require('ws');

function connect(name) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:8080');
    let playerId = null;
    ws.on('open', () => console.log(`[${name}] Connected`));
    ws.on('message', (data) => {
      const msg = JSON.parse(data);
      console.log(`[${name}] Received: ${msg.type}`, msg.type === 'roomUpdate' ? `players=${msg.players?.length}` : '');
      if (msg.type === 'connected') {
        playerId = msg.playerId;
      }
      if (msg.type === 'connected' || msg.type === 'roomCreated' || msg.type === 'joinSuccess' || msg.type === 'roomUpdate') {
        // pass
      }
    });
    ws.on('error', (e) => reject(e));
    // resolve once we get playerId
    const check = setInterval(() => {
      if (playerId) { clearInterval(check); resolve({ ws, playerId }); }
    }, 100);
    setTimeout(() => { clearInterval(check); reject(new Error(`${name} timeout waiting for connected`)); }, 5000);
  });
}

async function test() {
  console.log('=== Cross-Browser Join Test ===\n');
  
  // Player 1 (Safari) connects and creates room
  const p1 = await connect('Safari');
  console.log(`[Safari] Got playerId: ${p1.playerId}`);
  
  // Create room
  const roomCreated = new Promise((resolve) => {
    p1.ws.on('message', (data) => {
      const msg = JSON.parse(data);
      if (msg.type === 'roomCreated') resolve(msg);
    });
  });
  p1.ws.send(JSON.stringify({ type: 'createRoom', playerName: 'Player1_Safari' }));
  const room = await roomCreated;
  console.log(`[Safari] Room created: ${room.roomId}\n`);
  
  // Player 2 (Chrome) connects and joins
  const p2 = await connect('Chrome');
  console.log(`[Chrome] Got playerId: ${p2.playerId}`);
  
  // Join room
  const joinResult = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Chrome join timeout')), 5000);
    p2.ws.on('message', (data) => {
      const msg = JSON.parse(data);
      if (msg.type === 'joinSuccess') { clearTimeout(timeout); resolve(msg); }
      if (msg.type === 'error') { clearTimeout(timeout); reject(new Error(msg.message)); }
    });
  });
  p2.ws.send(JSON.stringify({ type: 'joinRoom', roomId: room.roomId, playerName: 'Player2_Chrome' }));
  const joined = await joinResult;
  console.log(`[Chrome] Join success! Room: ${joined.roomId}\n`);
  
  // Wait for room updates
  await new Promise(r => setTimeout(r, 500));
  
  // Check room has 2 players via a third connection
  const p3 = await connect('Observer');
  const roomCheck = new Promise((resolve) => {
    p3.ws.on('message', (data) => {
      const msg = JSON.parse(data);
      if (msg.type === 'joinSuccess' || msg.type === 'roomUpdate') {
        if (msg.players && msg.players.length >= 3) resolve(msg);
      }
    });
  });
  p3.ws.send(JSON.stringify({ type: 'joinRoom', roomId: room.roomId, playerName: 'Player3_Observer' }));
  const finalRoom = await roomCheck;
  
  console.log(`\n=== RESULT ===`);
  console.log(`Room ${room.roomId} has ${finalRoom.players.length} players:`);
  finalRoom.players.forEach(p => console.log(`  - ${p.name} (${p.id})`));
  console.log(`\n✓ Cross-browser join test PASSED!`);
  
  p1.ws.close();
  p2.ws.close();
  p3.ws.close();
}

test().catch(e => {
  console.error('TEST FAILED:', e.message);
  process.exit(1);
});
