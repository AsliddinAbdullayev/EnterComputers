
const API_URL = 'http://127.0.0.1:3000/api/order';
const DATA_URL = '/data/products.json';
const ORDER_KEY = 'orderItems';  

const $cart = document.getElementById('cart');
const $openForm = document.getElementById('openForm');
const $form = document.getElementById('coForm');
const $status = document.getElementById('status');

const $countLabel = document.getElementById('countLabel');
const $sItems = document.getElementById('s-items');
const $sSum = document.getElementById('s-sum');
const $sGrand = document.getElementById('s-grand');
const $empty = document.getElementById('empty');

const fmtUZS = n => new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', maximumFractionDigits: 0 }).format(+n || 0);
const phoneOK = v => /^\+?998[-\s]?\d{2}[-\s]?\d{3}[-\s]?\d{2}[-\s]?\d{2}$/.test(String(v || '').trim());

function getOrder() { try { return JSON.parse(localStorage.getItem(ORDER_KEY) || '[]') } catch { return [] } }
function setOrder(a) { localStorage.setItem(ORDER_KEY, JSON.stringify(a)); }

async function loadProducts() {
  try {
    const r = await fetch(DATA_URL, { cache: 'no-store' });
    const d = await r.json();
    return Array.isArray(d) ? d : (d.products || []);
  } catch { return []; }
}
function merge(order, products) {
  return order.map(it => {
    const p = products.find(x => x.id === it.id) || {};
    return {
      id: it.id,
      qty: Math.max(1, Number(it.qty) || 1),
      title: it.title || p.title || '-',
      model: it.model || p.model || '',
      price: Number(it.price != null ? it.price : p.price) || 0,
      images: p.images || []
    };
  });
}

function rowHTML(it) {
  return `
    <div class="row-card" data-id="${it.id}">
      <div class="thumb"><img src="${(it.images[0] || 'img/placeholder.png')}" alt=""></div>
      <div>
        <div class="title">${it.title}</div>
        ${it.model ? `<div class="muted under">Model: <b>${it.model}</b></div>` : ''}
      </div>
      <div class="price">
        ${fmtUZS(it.price)}
        <span class="unit">${fmtUZS(it.price)} / 1 dona</span>
      </div>
      <div style="display:flex;gap:10px;align-items:center;justify-self:end">
        <button class="trash" data-act="del" title="O‘chirish"><i class="fa-regular fa-trash-can"></i></button>
        <div class="qty">
          <button data-act="dec" aria-label="Kamaytirish">−</button>
          <input class="qty-input" type="number" min="1" value="${it.qty}">
          <button data-act="inc" aria-label="Ko‘paytirish">+</button>
        </div>
      </div>
    </div>
  `;
}

function recalcUI(items) {
  const count = items.reduce((s, x) => s + x.qty, 0);
  const sum = items.reduce((s, x) => s + x.price * x.qty, 0);
  $countLabel.textContent = `${count} ta mahsulot`;
  $sItems.textContent = `${count} ta mahsulot`;
  $sSum.textContent = fmtUZS(sum);
  $sGrand.textContent = fmtUZS(sum);
  if ($openForm) $openForm.disabled = items.length === 0;
}

function render(items) {
  if (!items.length) {
    $cart.innerHTML = '';
    $empty.style.display = 'grid';
    recalcUI(items);
    return;
  }
  $empty.style.display = 'none';
  $cart.innerHTML = items.map(rowHTML).join('');
  recalcUI(items);
}

function sendOrder(payload) {
  return fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(r => r.ok);
}

(async function main() {
  const products = await loadProducts();
  let order = merge(getOrder(), products);
  render(order);
 
  $cart.addEventListener('click', (e) => {
    const row = e.target.closest('.row-card'); if (!row) return;
    const id = row.dataset.id;
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    const ix = order.findIndex(x => x.id === id); if (ix < 0) return;

    if (act === 'del') {
      order.splice(ix, 1);
    } else if (act === 'dec') {
      order[ix].qty = Math.max(1, order[ix].qty - 1);
      row.querySelector('.qty-input').value = order[ix].qty;
    } else if (act === 'inc') {
      order[ix].qty = order[ix].qty + 1;
      row.querySelector('.qty-input').value = order[ix].qty;
    }
    setOrder(order.map(x => ({ id: x.id, qty: x.qty, title: x.title, price: x.price, model: x.model })));
    render(order);
  });

  $cart.addEventListener('change', (e) => {
    const inp = e.target.closest('.qty-input'); if (!inp) return;
    const row = e.target.closest('.row-card'); if (!row) return;
    const id = row.dataset.id;
    const ix = order.findIndex(x => x.id === id); if (ix < 0) return;
    order[ix].qty = Math.max(1, Number(inp.value) || 1);
    setOrder(order.map(x => ({ id: x.id, qty: x.qty, title: x.title, price: x.price, model: x.model })));
    recalcUI(order);
  });

  // ✅ Forma ko'rsatish
  if ($openForm) {
    $openForm.addEventListener('click', () => {
      $form.hidden = false;
      $openForm.disabled = true;
      $form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
 
  $form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!order.length) { alert('Savatcha bo‘sh'); return; }
    const fd = new FormData($form);
    const name = (fd.get('name') || '').trim();
    const phone = (fd.get('phone') || '').trim();
    const comment = (fd.get('comment') || '').trim();
    if (!phoneOK(phone)) { alert('Telefon formati xato. +998 XX XXX XX XX'); return; }

    const payload = {
      name, phone, comment,
      sourceUrl: location.href,
      items: order.map(x => ({ id: x.id, qty: x.qty })),    
      totalPrice: order.reduce((s, x) => s + x.price * x.qty, 0)
    };

    try {
      const ok = await sendOrder(payload);
      $status.style.display = 'block';
      $status.style.color = ok ? '#26ce2c' : '#e11d48';
      $status.textContent = ok ? 'Buyurtma yuborildi! Tez orada bog‘lanamiz.' : 'Xatolik! Keyinroq urinib ko‘ring.';
      if (ok) {
        localStorage.removeItem(ORDER_KEY);
        setTimeout(() => location.href = '../index.html', 900);
      }
    } catch {
      $status.style.display = 'block';
      $status.style.color = '#e11d48';
      $status.textContent = 'Xatolik! Internetni tekshiring.';
    }
  });
})();
