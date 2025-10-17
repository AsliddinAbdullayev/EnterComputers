 
(() => {
  'use strict';

  const DATA_URL = new URL('/data/products.json', location.href).toString();
  const params = new URLSearchParams(location.search);
  const CAT = params.get('cat');
  const PAGE_SIZE = 12;

  const fmtUZS = n => new Intl.NumberFormat('uz-UZ', { style:'currency', currency:'UZS', maximumFractionDigits:0 }).format(n);
  const esc = s => (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  const uid = (prefix,id) => `${prefix}-${id}-${Math.random().toString(36).slice(2,7)}`;

  function initOwlWhenReady($el, opts){
    const run = ()=> $el.owlCarousel(opts);
    const imgs = $el.find('img').toArray();
    if (!imgs.length) return run();
    let left = imgs.length;
    imgs.forEach(img=>{
      const done = ()=> (--left===0 && run());
      if (img.complete) done();
      else { img.addEventListener('load', done, {once:true}); img.addEventListener('error', done, {once:true}); }
    });
  }

  function createCard(p){
    const wrap = document.createElement('article');
    wrap.className = 'card';
    const id = uid('owl', p.id);
    wrap.innerHTML = `
      <button class="like-btn" data-id="${p.id}" aria-pressed="false" title="Sevimli">
        <i class="fa-regular fa-heart"></i>
      </button>
      <div id="${id}" class="owl-carousel owl-theme">
        ${p.images.map(s=>`<div class="item"><img src="${s}" alt="${p.title}"></div>`).join('')}
      </div>
      <div class="row" style="margin-top:8px">
        <h3 class="title">${p.title}</h3>
        <span class="brand-chip">${p.brand || ''}</span>
      </div>
      <div class="price">${fmtUZS(p.price)}</div>
      <a class="btn" href="../pages/product.html?id=${encodeURIComponent(p.id)}">Batafsil</a>
    `;
    queueMicrotask(()=>{
      const $el = $(wrap).find(`#${esc(id)}`);
      initOwlWhenReady($el, {
        items:1, loop:true, dots:true, nav:false,
        autoplay:true, autoplayTimeout:3000, autoplayHoverPause:true
      });
    });
    return wrap;
  }

  function buildBrands(products){
    const brands = [...new Set(products.map(p=>p.brand).filter(Boolean))].sort();
    const box = document.getElementById('brandList');
    box.innerHTML = brands.map(b => `
      <label class="check">
        <input type="checkbox" value="${b}">
        <span>${b}</span>
      </label>
    `).join('');
  }
  function applyFilters(products){
    const min = +document.getElementById('minPrice').value || 0;
    const maxV = document.getElementById('maxPrice').value;
    const max = maxV === '' ? Infinity : +maxV;
    const checked = [...document.querySelectorAll('#brandList input:checked')].map(i=>i.value);
    return products.filter(p => p.price >= min && p.price <= max && (checked.length ? checked.includes(p.brand) : true));
  }
  function sortProducts(arr){
    const v = document.getElementById('sortSel').value;
    const a = arr.slice();
    if (v === 'az') a.sort((x,y)=>x.title.localeCompare(y.title));
    if (v === 'za') a.sort((x,y)=>y.title.localeCompare(x.title));
    if (v === 'priceAsc') a.sort((x,y)=>x.price - y.price);
    if (v === 'priceDesc') a.sort((x,y)=>y.price - x.price);
    if (v === 'rating') a.sort((x,y)=>(y.rating||0)-(x.rating||0));
    return a;
  }
  function renderPager(container, page, total, onGo){
    const el = document.getElementById(container);
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const btn = (label, to, dis=false)=>`<button ${dis?'disabled':''} data-to="${to}">${label}</button>`;
    let html = btn('←', page-1, page<=1);
    for (let i=1;i<=pages;i++) html += `<button ${i===page?'class="is-active"':''} data-to="${i}">${i}</button>`;
    html += btn('→', page+1, page>=pages);
    el.innerHTML = html;
    el.onclick = (e)=>{
      const to = +(e.target.dataset.to||0);
      if(!to || to===page) return;
      onGo(to); window.scrollTo({top:0, behavior:'smooth'});
    };
  }

  (async function main(){
    const res = await fetch(DATA_URL, {cache:'no-store'});
    const data = await res.json();
    const all = (Array.isArray(data) ? data : (data.products || [])).filter(p=> !CAT || p.category === CAT);

    buildBrands(all);

    let page = 1;
    const rerender = ()=>{
      const filtered = applyFilters(all);
      const sorted = sortProducts(filtered);
      const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
      page = Math.min(page, pages);
      const start = (page-1)*PAGE_SIZE;
      const slice = sorted.slice(start, start+PAGE_SIZE);

      const grid = document.getElementById('listGrid');
      grid.innerHTML = '';
      slice.forEach(p => grid.appendChild(createCard(p)));

      renderPager('pagerTop', page, sorted.length, (to)=>{ page = to; rerender(); });
      renderPager('pagerBottom', page, sorted.length, (to)=>{ page = to; rerender(); });
    };

    document.getElementById('sortSel').onchange = rerender;
    document.getElementById('minPrice').oninput = rerender;
    document.getElementById('maxPrice').oninput = rerender;
    document.getElementById('brandList').onchange = rerender;

    rerender();
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

  // 1) Sahifa yuklanganda
  document.addEventListener('DOMContentLoaded', updateCartBadge);

  // 2) Boshqa tablarda o'zgarish bo'lsa
  window.addEventListener('storage', (e) => {
    if (e.key === ORDER_KEY) updateCartBadge();
  });

  // 3) Shu tabda ham avtomatik yangilanishi uchun setItem hook
  const _setItem = localStorage.setItem;
  localStorage.setItem = function (k, v) {
    _setItem.apply(this, arguments);
    if (k === ORDER_KEY) updateCartBadge();
  };
 
  updateCartBadge();
})();