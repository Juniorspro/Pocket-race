// Pocket Race - servidor WebSocket multijugador (quickplay)
// Para Render.com (free tier) + UptimeRobot keepalive

const http = require('http');
const WebSocket = require('ws');

const rooms = new Map();
const MAX_PLAYERS = 4;
const AUTO_START_DELAY_MS = 8000; // 8 sec para empezar tras el 2do jugador
const RESULTS_DISPLAY_MS = 4500;  // mostrar resultados antes de cerrar conexiones
const RACE_TIMEOUT_MS = 90000;    // si nadie cruza meta en 90s, fuerza fin

// ===== HTTP server (health check para UptimeRobot) =====
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.url === '/health' || req.url === '/' || req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      rooms: rooms.size,
      players: Array.from(rooms.values()).reduce((s, r) => s + r.players.size, 0),
      timestamp: Date.now(),
      uptime: Math.floor(process.uptime()),
    }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const wss = new WebSocket.Server({ server });

function makeId() { return Math.random().toString(36).slice(2, 9); }
function makeRoomId() { return Math.random().toString(36).slice(2, 8); }
function send(ws, msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try { ws.send(JSON.stringify(msg)); } catch (e) {}
  }
}
function broadcast(room, msg) {
  const data = JSON.stringify(msg);
  for (const p of room.players.values()) {
    if (p.ws.readyState === WebSocket.OPEN) {
      try { p.ws.send(data); } catch (e) {}
    }
  }
}
function broadcastLobby(room) {
  broadcast(room, {
    type: 'lobby',
    state: room.state,
    players: Array.from(room.players.values()).map(p => ({
      id: p.id, name: p.name, slot: p.slot,
    })),
  });
}

function findOrCreateRoom() {
  // Buscar sala existente en lobby con cupo
  for (const room of rooms.values()) {
    if (room.state === 'lobby' && room.players.size < MAX_PLAYERS) {
      return room;
    }
  }
  // No hay → crear nueva
  const id = makeRoomId();
  const room = {
    id,
    players: new Map(),
    state: 'lobby',           // 'lobby' | 'racing' | 'ended'
    finishOrder: [],
    startTimer: null,
    raceTimeout: null,
  };
  rooms.set(id, room);
  return room;
}

function startRace(room) {
  if (room.state !== 'lobby') return;
  if (room.players.size < 2) return;
  if (room.startTimer) {
    clearTimeout(room.startTimer);
    room.startTimer = null;
  }
  room.state = 'racing';
  room.finishOrder = [];
  const levelIdx = Math.floor(Math.random() * 7);
  
  const playersList = Array.from(room.players.values()).map(p => ({
    id: p.id, name: p.name, slot: p.slot,
  }));
  
  broadcast(room, {
    type: 'startMatch',
    levelIdx,
    players: playersList,
  });
  
  room.raceTimeout = setTimeout(() => endRace(room), RACE_TIMEOUT_MS);
}

function endRace(room) {
  if (room.state !== 'racing') return;
  room.state = 'ended';
  if (room.raceTimeout) {
    clearTimeout(room.raceTimeout);
    room.raceTimeout = null;
  }
  
  const players = Array.from(room.players.values());
  const standings = players.slice().sort((a, b) => {
    const ai = room.finishOrder.indexOf(a.id);
    const bi = room.finishOrder.indexOf(b.id);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return (b.state.x || 0) - (a.state.x || 0);
  });
  
  broadcast(room, {
    type: 'matchEnd',
    standings: standings.map(p => ({ id: p.id, name: p.name })),
  });
  
  // Cerrar la sala después de mostrar resultados
  setTimeout(() => {
    for (const p of room.players.values()) {
      try { p.ws.close(); } catch (e) {}
    }
    rooms.delete(room.id);
  }, RESULTS_DISPLAY_MS);
}

wss.on('connection', (ws) => {
  let playerId = null;
  let myRoom = null;
  
  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch (e) { return; }
    
    if (msg.type === 'quickplay') {
      myRoom = findOrCreateRoom();
      playerId = makeId();
      
      const usedSlots = new Set(Array.from(myRoom.players.values()).map(p => p.slot));
      let slot = 0;
      for (let i = 0; i < MAX_PLAYERS; i++) {
        if (!usedSlots.has(i)) { slot = i; break; }
      }
      
      const name = (msg.name || 'P' + (slot + 1)).toString().substring(0, 8).toUpperCase();
      myRoom.players.set(playerId, {
        id: playerId, ws, name, slot,
        state: { x: 0, y: 0, vx: 0, vy: 0, face: 1, onGround: true },
      });
      
      send(ws, { type: 'joined', id: playerId, slot });
      broadcastLobby(myRoom);
      
      // Si se llenó la sala → empieza ya
      if (myRoom.players.size >= MAX_PLAYERS) {
        if (myRoom.startTimer) {
          clearTimeout(myRoom.startTimer);
          myRoom.startTimer = null;
        }
        startRace(myRoom);
      } else if (myRoom.players.size >= 2 && !myRoom.startTimer) {
        myRoom.startTimer = setTimeout(() => startRace(myRoom), AUTO_START_DELAY_MS);
        broadcast(myRoom, { type: 'autoStartCountdown', seconds: Math.floor(AUTO_START_DELAY_MS / 1000) });
      }
    }
    else if (msg.type === 'state' && myRoom && myRoom.state === 'racing') {
      const p = myRoom.players.get(playerId);
      if (p) {
        p.state = {
          x: msg.x | 0, y: msg.y | 0,
          vx: +(msg.vx || 0).toFixed(2), vy: +(msg.vy || 0).toFixed(2),
          face: msg.face || 1, onGround: !!msg.onGround,
          boostT: msg.boostT || 0, springT: msg.springT || 0,
          shieldT: msg.shieldT || 0, invulnT: msg.invulnT || 0,
        };
      }
    }
    else if (msg.type === 'finished' && myRoom && myRoom.state === 'racing') {
      if (!myRoom.finishOrder.includes(playerId)) {
        myRoom.finishOrder.push(playerId);
        broadcast(myRoom, {
          type: 'playerFinished',
          id: playerId,
          position: myRoom.finishOrder.length,
        });
        if (myRoom.finishOrder.length >= myRoom.players.size) {
          endRace(myRoom);
        }
      }
    }
  });
  
  ws.on('close', () => {
    if (myRoom && playerId) {
      myRoom.players.delete(playerId);
      
      if (myRoom.players.size === 0) {
        if (myRoom.startTimer) clearTimeout(myRoom.startTimer);
        if (myRoom.raceTimeout) clearTimeout(myRoom.raceTimeout);
        rooms.delete(myRoom.id);
      } else {
        if (myRoom.state === 'racing') {
          if (myRoom.finishOrder.length >= myRoom.players.size) {
            endRace(myRoom);
          }
        }
        if (myRoom.state === 'lobby' && myRoom.players.size < 2 && myRoom.startTimer) {
          clearTimeout(myRoom.startTimer);
          myRoom.startTimer = null;
          broadcast(myRoom, { type: 'autoStartCancel' });
        }
        if (myRoom.state === 'lobby') broadcastLobby(myRoom);
      }
    }
  });
  
  ws.on('error', () => {});
});

// Broadcast loop ~15Hz
setInterval(() => {
  for (const room of rooms.values()) {
    if (room.state === 'racing') {
      const states = [];
      for (const p of room.players.values()) {
        states.push({ id: p.id, ...p.state });
      }
      if (states.length) broadcast(room, { type: 'state', players: states });
    }
  }
}, 67);

// Cleanup salas vacías
setInterval(() => {
  for (const [id, room] of rooms.entries()) {
    if (room.players.size === 0) rooms.delete(id);
  }
}, 60000);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Pocket Race server listening on port ${PORT}`);
});
