// server.js
// ──────────────────────────────────────────────────────────────────────────────
// Minimal, lekin prodga mos: CORS normalization, health check, /api/order,
// Telegramga yuborish, products.json o‘qish.
// Node >=18 (global fetch mavjud).
// ──────────────────────────────────────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// ── ENV
const HOST = process.env.HOST?.trim() || '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);

const PRODUCTS_FILE = process.env.PRODUCTS_FILE?.trim() || path.join(process.cwd(), 'data', 'products.json');
const TG_BOT_TOKEN = process.env.TG_BOT_TOKEN?.trim();
const TG_CHAT_ID   = process.env.TG_CHAT_ID?.trim();

if (!TG_BOT_TOKEN || !TG_CHAT_ID) {
  console.warn('⚠️  TG_BOT_TOKEN yoki TG_CHAT_ID .env faylida topilmadi. Telegram xabarlari yuborilmaydi.');
}

// ── CORS: .env dagi ALLOWED_ORIGINS trailing slash’larni tozalaymiz
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    // Postman/cURL yoki origin yo‘qligida ruxsat beramiz
    if (!origin) return cb(null, true);
    const cleaned = origin.replace(/\/$/, '');
    if (ALLOWED_ORIGINS.includes(cleaned)) return cb(null, true);
    cb(new Error('Not allowed by CORS: ' + origin));
  },
  credentials: false,
}));

app.use(express.json());

// ── Productsni yuklash
let products = [];
try {
  const raw = fs.readFileSync(PRODUCTS_FILE, 'utf8');
  products = JSON.parse(raw);
  console.log(`📚 Products loaded: ${products.length} (from ${PRODUCTS_FILE})`);
  if (products[0]?.id) {
    console.log('🔎 ID sample:', products.slice(0, 5).map(p => p.id));
  }
} catch (e) {
  console.error('❌ PRODUCTS_FILE o‘qishda xato:', e.message);
}

// ── Healthcheck
app.get('/health', (req, res) => {
  res.json({ ok: true, products: products.length });
});

// ── Buyurtma qabul qilish
app.post('/api/order', async (req, res) => {
  try {
    const {
      name = '',
      phone = '',
      productId = '',
      quantity = 1,
      cart = [],           // ixtiyoriy: [{id, title, price, qty}, ...]
      note = '',
      originUrl = '',      // frontdan yuboramiz
    } = req.body || {};

    // Minimal validatsiya
    if (!name || !phone || (!productId && (!cart || cart.length === 0))) {
      return res.status(400).json({ ok: false, error: 'name, phone va product/cart talab qilinadi' });
    }

    // Product nomini aniqlashga urinib ko‘ramiz
    let title = '';
    if (productId) {
      const p = products.find(x => String(x.id) === String(productId));
      title = p?.title || productId;
    }

    // Telegram xabari
    const lines = [];
    lines.push('🛒 *Yangi buyurtma*');
    lines.push(`👤 *Ism:* ${escapeMd(name)}`);
    lines.push(`📞 *Telefon:* ${escapeMd(phone)}`);

    if (productId) {
      lines.push(`📦 *Product:* ${escapeMd(title)} (${escapeMd(String(productId))})`);
      lines.push(`🔢 *Soni:* ${escapeMd(String(quantity))}`);
    }

    if (Array.isArray(cart) && cart.length > 0) {
      lines.push('');
      lines.push('*Savatcha:*');
      cart.forEach((c, i) => {
        lines.push(`${i + 1}) ${escapeMd(c.title || c.id)} — ${escapeMd(String(c.qty || 1))} dona`);
      });
    }

    if (note) {
      lines.push('');
      lines.push(`📝 *Izoh:* ${escapeMd(note)}`);
    }

    if (originUrl) {
      lines.push('');
      lines.push(`🔗 *Sahifa:* ${escapeMd(originUrl)}`);
    }

    const text = lines.join('\n');

    // Telegramga yuborish (agar sozlangan bo‘lsa)
    if (TG_BOT_TOKEN && TG_CHAT_ID) {
      const tgUrl = `https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`;
      const resp = await fetch(tgUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TG_CHAT_ID,
          text,
          parse_mode: 'MarkdownV2',
          disable_web_page_preview: true,
        }),
      });
      if (!resp.ok) {
        const errText = await safeText(resp);
        console.warn('⚠️ Telegram sendMessage failed:', resp.status, errText);
      }
    }

    res.json({ ok: true });

  } catch (err) {
    console.error('❌ /api/order xato:', err);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
});

// ── Serverni ko‘tarish
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server listening on http://${HOST}:${PORT}`);
});

// ── Yordamchi
function escapeMd(s = '') {
  // MarkdownV2 escaping
  return String(s).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

async function safeText(r) {
  try { return await r.text(); } catch { return '<no-text>'; }
}
