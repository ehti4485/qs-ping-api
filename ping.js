// ============================================================
// QuickShare Hub — Ping API (Vercel)
// File: api/ping.js
// ============================================================
// HOW IT WORKS:
// App starts → sends GET /api/ping?action=start
// App stops  → sends GET /api/ping?action=stop  
// Admin      → sends GET /api/ping?action=admin&key=YOUR_KEY
// ============================================================

const ADMIN_KEY = process.env.ADMIN_KEY || 'quickshare-admin-2026';
const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;

async function kvGet(key) {
  if (!KV_REST_API_URL) return 0;
  try {
    const r = await fetch(`${KV_REST_API_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }
    });
    const data = await r.json();
    return data.result ? parseInt(data.result) : 0;
  } catch { return 0; }
}

async function kvIncr(key) {
  if (!KV_REST_API_URL) return 0;
  try {
    const r = await fetch(`${KV_REST_API_URL}/incr/${key}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }
    });
    const data = await r.json();
    return data.result || 0;
  } catch { return 0; }
}

async function kvDecr(key) {
  if (!KV_REST_API_URL) return 0;
  try {
    const r = await fetch(`${KV_REST_API_URL}/decr/${key}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }
    });
    const data = await r.json();
    return Math.max(0, data.result || 0);
  } catch { return 0; }
}

async function kvSet(key, value) {
  if (!KV_REST_API_URL) return;
  try {
    await fetch(`${KV_REST_API_URL}/set/${key}/${value}`, {
      headers: { Authorization: `Bearer ${KV_REST_API_TOKEN}` }
    });
  } catch {}
}

function todayKey() {
  return `today_${new Date().toISOString().slice(0,10)}`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action;

  if (action === 'start') {
    await kvIncr('qs_active');
    await kvIncr('qs_alltime');
    await kvIncr(todayKey());
    return res.status(200).json({ ok: true });
  }

  if (action === 'stop') {
    const active = await kvDecr('qs_active');
    if (active < 0) await kvSet('qs_active', 0);
    return res.status(200).json({ ok: true });
  }

  if (action === 'admin') {
    if (req.query.key !== ADMIN_KEY) {
      return res.status(401).json({ error: 'Wrong key' });
    }
    const active  = await kvGet('qs_active');
    const alltime = await kvGet('qs_alltime');
    const today   = await kvGet(todayKey());
    return res.status(200).json({ active, today, alltime });
  }

  return res.status(400).json({ error: 'Invalid action' });
};
