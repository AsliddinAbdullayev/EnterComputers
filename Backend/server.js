const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

try { require('dotenv').config(); } catch {}

const app = express();

/* ================== Config ================== */
const HOST = '0.0.0.0'; // tashqi so‘rovlarni ham qabul qiladi
const PORT = Number(process.env.PORT || 3000);

// Telegram
const BOT_TOKEN = process.env.BOT_TOKEN || process.env.TG_BOT_TOKEN || '<PUT_TELEGRAM_BOT_TOKEN>';
const CHAT_ID   = process.env.CHAT_ID   || process.env.TG_CHAT_ID   || '<PUT_CHAT_ID>';

// Frontend origins (CORS)
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.replace(/\/$/, '').trim()) // oxiridagi slashni olib tashlaydi
  .filter(Boolean);

// products.json yo‘li
const PRODUCTS_FILE = process.env.PRODUCTS_FILE
  || path.join(__dirname, 'data', 'products.json');

/* ================== Middlewares ================== */
app.use(express.json({ limit: '1mb' }));

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // Postman yoki ichki so‘rovlar
    const cleanOrigin = origin.replace(/\/$/, '');
    if (ALLOWED_ORIGINS.includes(cleanOrigin)) {
      return cb(null, true);
    }
    console.log('❌ CORS bloklandi:', origin);
    cb(new Error('Not allowed by CORS: ' + origin));
  },
  methods: ['GET','POST','OPTIONS'],
  credentials: true
}));

app.options('*', (req, res) => res.sendStatus(204));

// Oddiy log
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

/* ================== Helpers ================== */
const safeStr = s => (s == null ? '' : String(s));
const normId  = s => String(s || '').trim().toLowerCase();

function fmtUZS(n) {
  const val = Math.round(Number(n) || 0);
  try {
    return new Intl.NumberFormat('uz-UZ').format(val) + ' soʻm';
  } catch {
    return String(val).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' soʻm';
  }
}

/* ================== Products cache ================== */
let products = [];
try {
  const raw = fs.readFileSync(PRODUCTS_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  products = Array.isArray(parsed) ? parsed : (parsed.products || []);
  console.log(`📚 Products loaded: ${products.length} (from ${PRODUCTS_FILE})`);
} catch (e) {
  console.error('❌ products.json o‘qishda xatolik:', e.message);
  products = [];
}

// ID -> product
const PRODUCTS_BY_ID = new Map(
  products.map(p => [normId(p.id), p])
);

console.log('🔎 ID samples:', Array.from(PRODUCTS_BY_ID.keys()).slice(0, 5));

/* ================== Message builder ================== */
function buildOrderMessage(payload) {
  const {
    items = [],
    name = '-',
    phone = '-',
    comment = '',
    originUrl = '',
    createdAt = new Date()
  } = payload || {};

  let lines = [];
  let total = 0;

  items.forEach((it, idx) => {
    const id = safeStr(it?.id);
    const key = normId(id);
    const qty = Math.max(1, Number(it.qty) || 1);
    const prod = PRODUCTS_BY_ID.get(key);
    const title = safeStr(prod?.title ?? it.title ?? '(nomi topilmadi)');
    const unitPrice = Number(prod?.price ?? it.price ?? 0);
    const lineTotal = unitPrice * qty;
    total += lineTotal;

    lines.push(`${idx + 1}) ${title} x${qty}${lineTotal>0 ? ` — ${fmtUZS(lineTotal)}` : ''} (ID: ${id})`);
  });

  const listBlock = lines.join('\n');
  const totalLine = fmtUZS(total);
  const ts = new Date(createdAt).toLocaleString('en-US', { hour12: false });

  return (
`🛒 Yangi buyurtma
━━━━━━━━━━━━━━
${listBlock}
━━━━━━━━━━━━━━
💵 Jami: ${totalLine}

👤 Mijoz: ${safeStr(name) || '-'}
📱 Telefon: ${safeStr(phone) || '-'}
📝 Izoh: ${safeStr(comment) || '-'}
🔗 ${safeStr(originUrl) || '-'}
⌚️ ${ts}`
  );
}

/* ================== Telegram ================== */
async function sendToTelegram(text) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.warn('⚠️ BOT_TOKEN yoki CHAT_ID yo‘q — xabar yuborilmadi.');
    return { ok: false, skipped: true };
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      disable_web_page_preview: true
    })
  });
  const data = await res.json();
  if (!data.ok) {
    console.error('❌ Telegram error:', data);
    throw new Error('Telegram send failed');
  }
  return data;
}

/* ================== Routes ================== */
app.get('/', (_req, res) => res.type('text').send('Order API is running'));
app.get('/health', (_req, res) => res.json({ ok: true, products: products.length }));

app.post('/api/order', async (req, res) => {
  try {
    const payload = req.body || {};
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      return res.status(400).json({ ok:false, error:'items bo‘sh' });
    }

    const msg = buildOrderMessage({
      items: payload.items,
      name: payload.name,
      phone: payload.phone,
      comment: payload.comment,
      originUrl: payload.originUrl,
      createdAt: new Date()
    });

    await sendToTelegram(msg);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error:'Order send failed' });
  }
});

/* ================== Start ================== */
app.listen(PORT, HOST, () => {
  console.log(`🚀 Order API ready on http://${HOST}:${PORT}`);
  console.log(`📄 products file: ${PRODUCTS_FILE}`);
  console.log(`🌐 CORS allow: ${ALLOWED_ORIGINS.join(', ')}`);
});
