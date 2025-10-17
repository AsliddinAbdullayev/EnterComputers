 
(() => {
  'use strict';
 
  const DATA_URL  = new URL('/data/products.json', location.href).toString();
  const ORDER_KEY = 'orderItems'; 
  const params    = new URLSearchParams(location.search);

  const fmtUZS = n => new Intl.NumberFormat('uz-UZ', { style:'currency', currency:'UZS', maximumFractionDigits:0 }).format(n);

  const $detail = document.getElementById('detail');
  const $about  = document.getElementById('about');

  function showError(msg) {
    if ($detail) $detail.innerHTML = `<p class="muted" style="padding:16px">${msg}</p>`;
  }

  async function ensureImages(srcs, placeholder = 'img/placeholder.png') {
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

  
  const LIKE_KEY = 'favs';
  const getFavs = () => { try { return JSON.parse(localStorage.getItem(LIKE_KEY) || '[]'); } catch { return []; } };
  const setFavs = (arr) => { localStorage.setItem(LIKE_KEY, JSON.stringify(arr)); updateLikeCount(); };
  const isFav   = (id) => getFavs().includes(id);

  function toggleFav(id) {
    let f = getFavs();
    f = f.includes(id) ? f.filter(x=>x!==id) : f.concat(id);
    setFavs(f); syncLikeButtons();
  }
  function syncLikeButtons() {
    document.querySelectorAll('.like-btn[data-id]').forEach(btn=>{
      const on = isFav(btn.dataset.id);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      const icon = btn.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-regular', !on);
        icon.classList.toggle('fa-solid',  on);
      }
    });
  }
  function updateLikeCount() {
    const n = getFavs().length;
    const badge  = document.getElementById('likeCount');
    const navIco = document.querySelector('.nav__like i');
    if (badge)  badge.textContent = n;
    if (navIco) {
      navIco.classList.toggle('fa-solid',  n > 0);
      navIco.classList.toggle('fa-regular', n === 0);
    }
  }
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('.like-btn[data-id]');
    if (btn) toggleFav(btn.dataset.id);
  });

 
  function getOrder(){ try { return JSON.parse(localStorage.getItem(ORDER_KEY) || '[]'); } catch { return []; } }
  function setOrder(a){ localStorage.setItem(ORDER_KEY, JSON.stringify(a)); }
  function addToOrder(id, qty=1) {
    qty = Math.max(1, Number(qty)||1);
    const cur = getOrder();
    const ix = cur.findIndex(x => x.id === id);
    if (ix >= 0) cur[ix].qty = Math.max(1, Number(cur[ix].qty||1) + qty);
    else cur.push({ id, qty });
    setOrder(cur);
  }
  function goCheckout(){ location.href = '../pages/checkout.html'; }

  
  function renderDetail(p) {
    $detail.innerHTML = `
      <div class="gallery" style="position:relative">
        <button class="like-btn" data-id="${p.id}" aria-pressed="${isFav(p.id) ? 'true' : 'false'}" title="Sevimli" style="top:14px; right:14px; z-index:2">
          <i class="fa-${isFav(p.id) ? 'solid' : 'regular'} fa-heart"></i>
        </button>

        <div id="detail-owl" class="owl-carousel owl-theme">
          ${p.images.map(src => `<div class="item"><img src="${src}" alt="${p.title}"></div>`).join('')}
        </div>

        <div class="thumbs-wrap">
          <button class="thumb-nav" id="thumb-prev" type="button">←</button>
          <div id="thumbs" class="thumbs owl-carousel owl-theme">
            ${p.images.map((src, i) => `
              <div class="item ${i === 0 ? 'is-active' : ''}" data-i="${i}">
                <img src="${src}" alt="thumb ${i + 1}">
              </div>`).join('')}
          </div>
          <button class="thumb-nav" id="thumb-next" type="button">→</button>
        </div>
      </div>

      <aside class="buybox">
        <div class="muted"><span class="dot dot--green"></span>${p.availability === 'out_of_stock' ? 'Sotuvda yo‘q' : (p.availability === 'preorder' ? 'Oldindan buyurtma' : 'Mavjud')}</div>
        <h1 class="title" style="font-size:22px;margin:8px 0">${p.title}</h1>
        <div class="muted" style="margin-bottom:6px">Brend: ${p.brand || '-'}</div>
        <div class="price">${fmtUZS(p.price)}</div>
        <!-- 2) Savatchaga qo'shish (ham darhol checkout) -->
        <button class="btn-big" type="button" data-act="add-and-go" data-id="${p.id}">🛒 Savatchaga qo‘shish</button>
      </aside>
    `;

    // About
    $about.innerHTML = `
      <div class="about-block">
        <h2>Mahsulot haqida</h2>
        <p>${p.about || ''}</p>
        ${
          Array.isArray(p.specs) && p.specs.length
            ? `<ul class="specs">` + p.specs.map(s => `<li><span class="k">${s.k}</span><span>${s.v}</span></li>`).join('') + `</ul>`
            : ''
        }
      </div>
    `;
 
    $detail.addEventListener('click', (e)=>{
      const btn = e.target.closest('[data-act][data-id]');
      if (!btn) return;
      const id = btn.dataset.id;
      if (btn.dataset.act === 'buy-now' || btn.dataset.act === 'add-and-go') {
        addToOrder(id, 1);
        goCheckout();
      }
    });
  }

  function initCarousels(p) {
    if (typeof $.fn.owlCarousel !== 'function') return;

    const $main = $('#detail-owl').owlCarousel({
      items:1, loop:true, dots:false, nav:false,
      autoplay:true, autoplayTimeout:3200, autoplayHoverPause:true
    });

    const $thumbs = $('#thumbs').owlCarousel({ items:5, margin:8, dots:false, nav:false, loop:false });

    const setActiveThumb = (i)=>{
      $('#thumbs .item').removeClass('is-active');
      $(`#thumbs .item[data-i="${i}"]`).addClass('is-active');
      const idx = $('#thumbs .item').index($(`#thumbs .item[data-i="${i}"]`));
      $thumbs.trigger('to.owl.carousel', [Math.max(0, idx-2), 200, true]);
    };

    $('#thumbs').on('click', '.item', function(){ const i = +this.dataset.i; $main.trigger('to.owl.carousel', [i, 200, true]); setActiveThumb(i); });

    $main.on('changed.owl.carousel', function (ev) {
      let i = 0;
      if (ev && ev.relatedTarget && typeof ev.relatedTarget.relative === 'function') {
        i = ev.relatedTarget.relative(ev.item.index);
      } else {
        const len = p.images.length;
        const clones = ev.relatedTarget ? ev.relatedTarget._clones.length : 0;
        const real   = (ev.item.index - clones/2) % len;
        i = (real + len) % len;
      }
      setActiveThumb(i);
    });

    document.getElementById('thumb-prev')?.addEventListener('click', ()=> $main.trigger('prev.owl.carousel'));
    document.getElementById('thumb-next')?.addEventListener('click', ()=> $main.trigger('next.owl.carousel'));

    $main.trigger('refresh.owl.carousel');
    $thumbs.trigger('refresh.owl.carousel');
  }

   
  (async () => {
    const id = params.get('id') || localStorage.getItem('selectedId') || '';
    if (!id) { showError('ID topilmadi. Havola: product.html?id=...'); return; }

    try {
      const list  = await loadProducts();
      const found = list.find(x => x.id === id);
      if (!found) { showError(`"${id}" JSON ichida topilmadi`); return; }

      const validImages = await ensureImages(found.images, 'img/placeholder.png');
      const product = { ...found, images: validImages };

      renderDetail(product);
      initCarousels(product);
      syncLikeButtons(); updateLikeCount();
    } catch (err) {
      console.error(err);
      showError('Maʼlumotlarni olishda xatolik.');
    }
  })();

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
