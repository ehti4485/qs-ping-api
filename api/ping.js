// QuickShare Hub — Ping API (Vercel + Upstash Redis)
// Uses Upstash REST API directly — no SDK needed

const ADMIN_KEY = process.env.ADMIN_KEY || 'quickshare-admin-2026';
const UPSTASH_URL = process.env.KV_REST_API_URL;
const UPSTASH_TOKEN = process.env.KV_REST_API_TOKEN;

async function redis(command, ...args) {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    console.error('[Ping] Missing Upstash env vars');
    return null;
  }
  try {
    const res = await fetch(`${UPSTASH_URL}/${[command, ...args].join('/')}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    const data = await res.json();
    return data.result;
  } catch (e) {
    console.error('[Ping] Redis error:', e.message);
    return null;
  }
}

function todayKey() {
  return `qs_today_${new Date().toISOString().slice(0, 10)}`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action;

  if (action === 'start') {
    await redis('incr', 'qs_active');
    await redis('incr', 'qs_alltime');
    await redis('incr', todayKey());
    // Today key expire in 48 hours
    await redis('expire', todayKey(), '172800');
    return res.status(200).json({ ok: true });
  }

  if (action === 'stop') {
    const current = await redis('get', 'qs_active');
    const val = parseInt(current) || 0;
    if (val > 0) await redis('decr', 'qs_active');
    return res.status(200).json({ ok: true });
  }

  if (action === 'admin') {
    if (req.query.key !== ADMIN_KEY) {
      return res.status(401).json({ error: 'Wrong key' });
    }
    const active  = parseInt(await redis('get', 'qs_active'))       || 0;
    const alltime = parseInt(await redis('get', 'qs_alltime'))      || 0;
    const today   = parseInt(await redis('get', todayKey()))        || 0;
    return res.status(200).json({ active, today, alltime });
  }

  // Debug: check env vars are present (without exposing values)
  if (action === 'debug') {
    return res.status(200).json({
      has_url:   !!UPSTASH_URL,
      has_token: !!UPSTASH_TOKEN,
      url_prefix: UPSTASH_URL ? UPSTASH_URL.slice(0, 30) + '...' : 'MISSING'
    });
  }

  return res.status(400).json({ error: 'Invalid action' });
};
