// checkout.js
// ──────────────────────────────────────────────────────────────────────────────
// Front: buyurtma yuborish. API endpoint to‘g‘rilandi: /api/order.
// IP/hostga qarab avtomatik tanlaydi. Istasangiz bevosita absolute URL qo‘ying.
// ──────────────────────────────────────────────────────────────────────────────

(function () {
  // Dev/Lokal vs Prod autodetect:
  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
  const API_URL = isLocal
    ? 'http://127.0.0.1:3000/api/order'
    : 'http://65.108.241.44:3000/api/order'; // kerak bo‘lsa domeningni yoz

  // Form: #checkoutForm (name, phone, productId, quantity, note ixtiyoriy)
  // Agar savatcha bilan yuborilsa, window.__CART__ dan yoki localStorage’dan olasiz.
  const form = document.querySelector('#checkoutForm');
  if (!form) {
    console.warn('checkout.js: #checkoutForm topilmadi — form bilan ishlamadi.');
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = form.querySelector('[type="submit"]');
    const name     = (form.querySelector('[name="name"]')     || {}).value?.trim();
    const phone    = (form.querySelector('[name="phone"]')    || {}).value?.trim();
    const productId= (form.querySelector('[name="productId"]')|| {}).value?.trim();
    const quantity = Number((form.querySelector('[name="quantity"]') || {}).value) || 1;
    const note     = (form.querySelector('[name="note"]')     || {}).value?.trim();

    // Agar savatcha yubormoqchi bo‘lsangiz, shu yerda to‘ldiring:
    // const cart = JSON.parse(localStorage.getItem('CART') || '[]');
    const cart = Array.isArray(window.__CART__) ? window.__CART__ : [];

    const payload = {
      name,
      phone,
      productId,       // product page bo‘lsa shu yetarli
      quantity,
      cart,            // products page/checkout bo‘lsa shu foydali
      note,
      originUrl: location.href,
    };

    lock(btn, true);

    try {
      const ok = await sendOrder(API_URL, payload);
      if (ok) {
        toast('✅ Buyurtma jo‘natildi! Tez orada bog‘lanamiz.');
        form.reset();
      } else {
        toast('❌ Xatolik: buyurtma jo‘natilmadi.');
      }
    } catch (err) {
      console.error(err);
      toast('🌐 Internetni tekshiring yoki birozdan so‘ng urinib ko‘ring.');
    } finally {
      lock(btn, false);
    }
  });

  function sendOrder(url, data) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.ok);
  }

  function lock(btn, state) {
    if (!btn) return;
    btn.disabled = !!state;
    btn.dataset.loading = state ? '1' : '';
  }

  function toast(msg) {
    // Minimal xabar. O‘zingning UI’ga moslab almashtirib ol.
    alert(msg);
  }
})();
