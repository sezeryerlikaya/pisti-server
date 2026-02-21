const express = require('express');
const cors    = require('cors');
const Ably    = require('ably');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Ably client (server-side, key stays here) ───────────────────────────────
const ably = new Ably.Rest(process.env.ABLY_API_KEY);

app.use(cors());
app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Pişti Game Server' });
});

// ─── Token endpoint ───────────────────────────────────────────────────────────
// Client calls this to get a short-lived Ably token.
// Key never leaves the server.
app.get('/token', async (req, res) => {
  try {
    const clientId = 'player_' + Math.random().toString(36).slice(2, 10);

    const tokenRequest = await ably.auth.createTokenRequest({
      clientId,
      capability: { 'pisti-*': ['publish', 'subscribe', 'presence'] },
      ttl: 3600000, // 1 hour
    });

    res.json({ tokenRequest, clientId });
  } catch (err) {
    console.error('Token error:', err);
    res.status(500).json({ error: 'Token oluşturulamadı' });
  }
});

// ─── Room validation (optional, for extra security) ───────────────────────────
// Keeps track of active rooms so random codes can't be guessed.
const rooms = new Map(); // code → { target, createdAt }

// Create room (host calls this)
app.post('/room/create', (req, res) => {
  const { target } = req.body;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];

  // Ensure unique
  while (rooms.has(code)) {
    code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  }

  rooms.set(code, { target: target || 51, createdAt: Date.now() });

  // Auto-cleanup after 2 hours
  setTimeout(() => rooms.delete(code), 7200000);

  res.json({ code, target: rooms.get(code).target });
});

// Check room exists (guest calls this before joining)
app.get('/room/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Oda bulunamadı. Kodu kontrol et.' });
  }
  res.json({ code, target: room.target });
});

// Close room (when game ends or host leaves)
app.delete('/room/:code', (req, res) => {
  rooms.delete(req.params.code.toUpperCase());
  res.json({ ok: true });
});

// ─── Cleanup stale rooms every 30 min ────────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.createdAt > 7200000) rooms.delete(code);
  }
}, 1800000);

app.listen(PORT, () => {
  console.log(`Pişti server running on port ${PORT}`);
});
