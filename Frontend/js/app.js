
(() => {
  'use strict';

  const DATA_URL = new URL('/data/products.json', location.href).toString();
  const fmtUZS = n => new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', maximumFractionDigits: 0 }).format(n);
  const esc = s => (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  const uid = (prefix, id) => `${prefix}-${id}-${Math.random().toString(36).slice(2, 7)}`;

  function initOwlWhenReady($el, opts) {
    const run = () => $el.owlCarousel(opts);
    const imgs = $el.find('img').toArray();
    if (!imgs.length) return run();
    let left = imgs.length;
    imgs.forEach(img => {
      const done = () => (--left === 0 && run());
      if (img.complete) done();
      else { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); }
    });
  }

  function createCard(p) {
    const card = document.createElement('article');
    card.className = 'card';
    const carouselId = uid('owl', p.id);

    card.innerHTML = `
      <button class="like-btn" data-id="${p.id}" aria-pressed="false" title="Sevimli">
        <i class="fa-regular fa-heart"></i>
      </button>
      <div id="${carouselId}" class="owl-carousel owl-theme">
        ${p.images.map(src => `<div class="item"><img src="${src}" alt="${p.title}"></div>`).join('')}
      </div>
      <div class="row" style="margin-top:8px">
        <h3 class="title">${p.title}</h3>
        <span class="brand-chip">${p.brand || ''}</span>
      </div>
      <div class="price">${fmtUZS(p.price)}</div>
      <a class="btn" href="../pages/product.html?id=${encodeURIComponent(p.id)}">Batafsil</a>
    `;

    queueMicrotask(() => {
      const $el = $(card).find(`#${esc(carouselId)}`);
      initOwlWhenReady($el, {
        items: 1, loop: true, dots: true, nav: false,
        autoplay: true, autoplayTimeout: 3000, autoplayHoverPause: true
      });
    });

    return card;
  }

  function renderGrid(gridEl, ids, map) {
    gridEl.innerHTML = '';
    ids.forEach(id => {
      const p = map[id];
      if (!p) return;
      gridEl.appendChild(createCard(p));
    });
  }

  function renderCategoryTiles(tiles) {
    const wrap = document.getElementById('cat-tiles');
    if (!wrap) return;
    if (!tiles || !tiles.length) { wrap.innerHTML = '<p class="muted">Kategoriyalar topilmadi.</p>'; return; }

    wrap.innerHTML = tiles.map(t => `
      <a class="cat-tile" href="../pages/catalog.html?cat=${encodeURIComponent(t.id)}" title="${t.title}">
        <div class="cat-tile__img"><img src="${t.image}" alt="${t.title}"></div>
        <div class="cat-tile__title">${t.title} <span>→</span></div>
      </a>
    `).join('');

    const prev = document.getElementById('catPrev');
    const next = document.getElementById('catNext');
    if (prev && next) {
      prev.onclick = () => wrap.scrollBy({ left: -360, behavior: 'smooth' });
      next.onclick = () => wrap.scrollBy({ left: 360, behavior: 'smooth' });
    }
  }

  const indexById = arr => arr.reduce((m, p) => (m[p.id] = p, m), {});

  async function main() {
    const newGrid = document.getElementById('new-grid');
    const bestGrid = document.getElementById('best-grid');
    if (newGrid) newGrid.textContent = 'Yuklanmoqda...';
    if (bestGrid) bestGrid.textContent = 'Yuklanmoqda...';

    try {
      const res = await fetch(DATA_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const products = Array.isArray(data) ? data : (data.products || []);
      const categories = Array.isArray(data) ? {} : (data.categories || {});
      const tiles = Array.isArray(data) ? [] : (data.categoryTiles || []);

      renderCategoryTiles(tiles);

      const map = indexById(products);
      const newIds = categories.new && categories.new.length ? categories.new : products.map(p => p.id);
      const bestIds = categories.best && categories.best.length ? categories.best : products.slice().reverse().map(p => p.id);

      if (newGrid) renderGrid(newGrid, newIds, map);
      if (bestGrid) renderGrid(bestGrid, bestIds, map);
    } catch (e) {
      console.error(e);
      if (newGrid) newGrid.innerHTML = '<p class="muted">Xatolik.</p>';
      if (bestGrid) bestGrid.innerHTML = '<p class="muted">Xatolik.</p>';
    }
  }

  document.addEventListener('DOMContentLoaded', main);
})();


(function () {
  const ORDER_KEY = 'orderItems';

  function getOrderCount() {
    try {
      const arr = JSON.parse(localStorage.getItem(ORDER_KEY) || '[]');
      return arr.reduce((s, x) => s + (Number(x.qty) || 1), 0);
    } catch { return 0; }
  }

  function updateCartBadge() {
    const n = getOrderCount();
    const badge = document.getElementById('cartCount');
    const ico = document.querySelector('.nav__cart i');

    if (badge) {
      badge.textContent = n > 99 ? '99+' : String(n);
    }
    if (ico) {
      ico.classList.toggle('fa-solid', n > 0);
      ico.classList.toggle('fa-regular', n === 0);
    }
  }

  document.addEventListener('DOMContentLoaded', updateCartBadge);

  window.addEventListener('storage', (e) => {
    if (e.key === ORDER_KEY) updateCartBadge();
  });

  const _setItem = localStorage.setItem;
  localStorage.setItem = function (k, v) {
    _setItem.apply(this, arguments);
    if (k === ORDER_KEY) updateCartBadge();
  };

  updateCartBadge();
})();

