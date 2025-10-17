(() => {
      'use strict';

      const DATA_URL = new URL('../data/products.json', location.href).toString();
      const GRID_ID = 'like-grid';


      const fmtUZS = n => new Intl.NumberFormat('uz-UZ', {
        style: 'currency', currency: 'UZS', maximumFractionDigits: 0
      }).format(n);

      const esc = s => (window.CSS && CSS.escape) ? CSS.escape(s)
        : String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');

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

      async function ensureImages(srcs, placeholder = '../img/placeholder.png') {
        if (!Array.isArray(srcs)) return [placeholder];
        const checks = await Promise.all(
          srcs.map(src => new Promise(res => {
            const im = new Image();
            im.onload = () => res(src);
            im.onerror = () => res(null);
            im.src = src;
          }))
        );
        const ok = checks.filter(Boolean);
        return ok.length ? ok : [placeholder];
      }

      async function loadProducts() {
        const res = await fetch(DATA_URL, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        return Array.isArray(data) ? data : (data.products || []);
      }

      const KEY = 'favs';
      const getFavs = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } };
      const setFavs = (arr) => { localStorage.setItem(KEY, JSON.stringify(arr)); updateLikeCount(); };

      function isFav(id) { return getFavs().includes(id); }
      function addFav(id) { if (!isFav(id)) setFavs([...getFavs(), id]); }
      function removeFav(id) { setFavs(getFavs().filter(x => x !== id)); }

      function updateLikeCount() {
        const n = getFavs().length;
        const badge = document.getElementById('likeCount');
        if (badge) badge.textContent = n;
        const navIcon = document.querySelector('.nav__like i');
        if (navIcon) {
          navIcon.classList.toggle('fa-solid', n > 0);
          navIcon.classList.toggle('fa-regular', n === 0);
        }
      }

      function syncLikeButtons() {
        document.querySelectorAll('.like-btn[data-id]').forEach(btn => {
          const on = isFav(btn.dataset.id);
          btn.setAttribute('aria-pressed', on ? 'true' : 'false');
          const icon = btn.querySelector('i');
          if (icon) {
            icon.classList.toggle('fa-regular', !on);
            icon.classList.toggle('fa-solid', on);
          }
        });
      }
      function createCard(p) {
        const wrap = document.createElement('article');
        wrap.className = 'card';
        const carouselId = uid('owl', p.id);

        wrap.innerHTML = `
      <button class="like-btn" data-id="${p.id}" aria-pressed="${isFav(p.id) ? 'true' : 'false'}" title="Sevimli">
        <i class="fa-${isFav(p.id) ? 'solid' : 'regular'} fa-heart"></i>
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
          const $el = $(wrap).find(`#${esc(carouselId)}`);
          initOwlWhenReady($el, {
            items: 1, loop: true, dots: true, nav: false,
            autoplay: true, autoplayTimeout: 3000, autoplayHoverPause: true
          });
        });

        return wrap;
      }

      function renderEmpty() {
        const grid = document.getElementById(GRID_ID);
        grid.innerHTML = `
      <div class="empty" style="grid-column:1/-1">
        <img class="empty__img" src="img/empty-favs.png" alt="Sevimlilar bo'sh" onerror="this.style.display='none'">
        <h3 class="empty__title">Sevimli mahsulotlar yo‘q</h3>
        <p class="empty__text muted">Mahsulot kartasidagi yurakni bosing va bu yerda ko‘rishingiz mumkin.</p>
        <div class="empty__actions">
          <a class="btn" href="../pages/products.html"><i class="fa-solid fa-shop"></i> Mahsulotlarni ko‘rish</a>
        </div>
      </div>
    `;
      }

      function removeCardFromDOM(id) {
        const grid = document.getElementById(GRID_ID);
        const btn = grid.querySelector(`.like-btn[data-id="${CSS.escape(id)}"]`);
        const card = btn ? btn.closest('.card') : null;
        if (card) card.remove();
      }

      function computeStats(list) {
        const n = list.length;
        const sum = list.reduce((s, p) => s + (+p.price || 0), 0);
        const avgR = n ? (list.reduce((s, p) => s + (+p.rating || 0), 0) / n) : 0;
        return { n, sum, avgR: Math.round(avgR * 10) / 10 };
      }
      function applySort(list, mode) {
        const a = list.slice();
        if (mode === 'az') a.sort((x, y) => (x.title || '').localeCompare(y.title || ''));
        if (mode === 'za') a.sort((x, y) => (y.title || '').localeCompare(x.title || ''));
        if (mode === 'priceAsc') a.sort((x, y) => (x.price || 0) - (y.price || 0));
        if (mode === 'priceDesc') a.sort((x, y) => (y.price || 0) - (x.price || 0));
        if (mode === 'rating') a.sort((x, y) => (y.rating || 0) - (x.rating || 0));
        if (mode === 'brand') a.sort((x, y) => (x.brand || '').localeCompare(y.brand || ''));
        return a;
      }
      function updateStatsUI(stats) {
        const { n, sum, avgR } = stats;
        const $c = document.getElementById('statCount');
        const $s = document.getElementById('statSum');
        const $r = document.getElementById('statRating');
        if ($c) $c.textContent = n;
        if ($s) $s.textContent = fmtUZS(sum);
        if ($r) $r.textContent = avgR;
      }


      let all = [];
      let favIds = [];

      async function main() {
        updateLikeCount();
        favIds = getFavs();

        const grid = document.getElementById(GRID_ID);
        if (!favIds.length) { renderEmpty(); updateStatsUI({ n: 0, sum: 0, avgR: 0 }); return; }

        try {
          all = await loadProducts();
          const byId = all.reduce((m, p) => (m[p.id] = p, m), {});
          const validIds = favIds.filter(id => !!byId[id]);

          if (!validIds.length) { setFavs([]); renderEmpty(); updateStatsUI({ n: 0, sum: 0, avgR: 0 }); return; }

          renderList(validIds.map(id => byId[id]));

          const clearBtn = document.getElementById('clearAll');
          if (clearBtn) {
            clearBtn.onclick = () => {
              if (!confirm('Sevimlilar ro‘yxatini tozalaysizmi?')) return;
              setFavs([]); updateLikeCount(); renderEmpty(); updateStatsUI({ n: 0, sum: 0, avgR: 0 });
            };
          }

          document.addEventListener('click', (e) => {
            const btn = e.target.closest('.like-btn[data-id]');
            if (!btn) return;
            const id = btn.dataset.id;
            if (isFav(id)) {
              removeFav(id);
              updateLikeCount();
              removeCardFromDOM(id);
              const listNow = getFavs().map(x => all.find(p => p.id === x)).filter(Boolean);
              if (!listNow.length) { renderEmpty(); updateStatsUI({ n: 0, sum: 0, avgR: 0 }); }
              else { updateStatsUI(computeStats(listNow)); }
            } else {
              addFav(id);
              updateLikeCount();
              syncLikeButtons();
            }
          });


          const sortSel = document.getElementById('sortLikes');
          if (sortSel) {
            sortSel.onchange = () => {
              const listNow = getFavs().map(x => all.find(p => p.id === x)).filter(Boolean);
              renderList(listNow, sortSel.value);
            };
          }

        } catch (err) {
          console.error(err);
          grid.innerHTML = '<p class="muted">Xatolik yuz berdi.</p>';
        }
      }

      function renderList(list, sort = 'default') {
        const grid = document.getElementById(GRID_ID);
        const items = sort === 'default' ? list.slice() : applySort(list, sort);

        grid.innerHTML = '';
        items.forEach(p => {
          const copy = { ...p };
          (async () => {
            copy.images = await ensureImages(copy.images, 'img/placeholder.png');
            grid.appendChild(createCard(copy));
          })();
        });


        updateStatsUI(computeStats(items));

        queueMicrotask(syncLikeButtons);
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
