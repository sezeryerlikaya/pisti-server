const express = require('express');
const cors    = require('cors');
const Ably    = require('ably');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Ably lazy init — key yoksa startup'ta crash olmaz, sadece /token call'da hata verir
let _ably = null;
function getAbly() {
  if (_ably) return _ably;
  const key = process.env.ABLY_API_KEY;
  if (!key || !key.includes(':')) {
    throw new Error('ABLY_API_KEY eksik. Railway Variables bölümüne ekle.');
  }
  _ably = new Ably.Rest(key);
  return _ably;
}

// Health check
app.get('/', (req, res) => {
  const key = process.env.ABLY_API_KEY;
  res.json({
    status:  'ok',
    service: 'Pisti Game Server',
    ably:    (key && key.includes(':')) ? 'key_ok' : 'KEY_EKSIK',
    rooms:   rooms.size,
  });
});

// Token endpoint — Ably key sunucuda kalır, client'a gitmez
app.get('/token', async (req, res) => {
  try {
    const ably     = getAbly();
    const clientId = 'player_' + Math.random().toString(36).slice(2, 10);
    const tokenRequest = await ably.auth.createTokenRequest({
      clientId,
      capability: { '*': ['publish', 'subscribe', 'presence'] },
      ttl: 3600000,
    });
    res.json({ tokenRequest, clientId });
  } catch (err) {
    console.error('Token error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Oda yönetimi
const rooms = new Map();

app.post('/room/create', (req, res) => {
  const { target } = req.body;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  while (rooms.has(code)) {
    code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  }
  rooms.set(code, { target: target || 51, createdAt: Date.now() });
  setTimeout(() => rooms.delete(code), 7200000);
  res.json({ code, target: rooms.get(code).target });
});

app.get('/room/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: 'Oda bulunamadi. Kodu kontrol et.' });
  res.json({ code, target: room.target });
});

app.delete('/room/:code', (req, res) => {
  rooms.delete(req.params.code.toUpperCase());
  res.json({ ok: true });
});

// Eski odaları temizle
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.createdAt > 7200000) rooms.delete(code);
  }
}, 1800000);

app.listen(PORT, () => {
  console.log('Pisti server running on port ' + PORT);
  console.log('ABLY_API_KEY:', process.env.ABLY_API_KEY ? 'SET' : 'MISSING!');
});
