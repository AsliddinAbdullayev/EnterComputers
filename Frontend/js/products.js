 
(() => {
  'use strict';

  const DATA_URL  = new URL('../data/products.json', location.href).toString();
  const PAGE_SIZE = 12;
  const ORDER_KEY = 'orderItems';

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
 
  function getOrder(){ try { return JSON.parse(localStorage.getItem(ORDER_KEY)||'[]'); } catch { return []; } }
  function setOrder(a){ localStorage.setItem(ORDER_KEY, JSON.stringify(a)); }
  function addToOrder(id, qty=1){
    qty = Math.max(1, Number(qty)||1);
    const cur = getOrder();
    const ix = cur.findIndex(x => x.id === id);
    if (ix >= 0) cur[ix].qty = Math.max(1, Number(cur[ix].qty||1) + qty);
    else cur.push({ id, qty });
    setOrder(cur);
  }
  function goCheckout(){ location.href = '../pages/checkout.html'; }

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
      <div class="row" style="gap:8px">
        <a class="btn" href="../pages/product.html?id=${encodeURIComponent(p.id)}">Batafsil</a>
        <button class="btn btn--primary buy-now" data-id="${p.id}" type="button">Sotib olish</button>
      </div>
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

  function buildCategories(products){
    const sel = document.getElementById('catSel');
    const counts = {};
    products.forEach(p => { if(p.category) counts[p.category] = (counts[p.category]||0)+1; });
    const cats = Object.keys(counts).sort();
    sel.innerHTML = `<option value="">— Barchasi —</option>` + cats.map(c => `<option value="${c}">${c} (${counts[c]})</option>`).join('');
  }
  function buildBrands(products){
    const box = document.getElementById('brandList');
    const brands = [...new Set(products.map(p=>p.brand).filter(Boolean))].sort();
    box.innerHTML = brands.map(b => `
      <label class="check" data-brand="${b.toLowerCase()}">
        <input type="checkbox" value="${b}">
        <span>${b}</span>
      </label>
    `).join('');
  }
  function filterBrandList(term){
    const s=(term||'').trim().toLowerCase();
    document.querySelectorAll('#brandList .check').forEach(l=>{
      const b=l.dataset.brand||''; l.style.display=(s && !b.includes(s))?'none':'';
    });
  }

  function readFilters(){
    const q = (document.getElementById('q').value || '').trim().toLowerCase();
    const cat = document.getElementById('catSel').value || '';
    const inStock = document.getElementById('inStockOnly').checked;
    const min = +document.getElementById('minPrice').value || 0;
    const maxVal = document.getElementById('maxPrice').value;
    const max = maxVal === '' ? Infinity : +maxVal;
    const brands = [...document.querySelectorAll('#brandList input:checked')].map(i=>i.value);
    const sort = document.getElementById('sortSel').value;
    return { q, cat, inStock, min, max, brands, sort };
  }
  function applyFilters(items, f){
    return items.filter(p => {
      if (f.q && !(p.title || '').toLowerCase().includes(f.q)) return false;
      if (f.cat && p.category !== f.cat) return false;
      if (f.inStock && p.availability === 'out_of_stock') return false;
      if (p.price < f.min || p.price > f.max) return false;
      if (f.brands.length && !f.brands.includes(p.brand)) return false;
      return true;
    });
  }
  function sortProducts(arr, mode){
    const a = arr.slice();
    if (mode === 'az') a.sort((x,y)=> (x.title||'').localeCompare(y.title||''));
    if (mode === 'za') a.sort((x,y)=> (y.title||'').localeCompare(x.title||''));
    if (mode === 'priceAsc') a.sort((x,y)=> (x.price||0) - (y.price||0));
    if (mode === 'priceDesc') a.sort((x,y)=> (y.price||0) - (x.price||0));
    if (mode === 'rating') a.sort((x,y)=> (y.rating||0) - (x.rating||0));
    return a;
  }
  function renderPager(container, page, total, onGo){
    const el = document.getElementById(container);
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const btn = (label, to, disabled=false) => `<button ${disabled?'disabled':''} data-to="${to}">${label}</button>`;
    let html = btn('←', page-1, page<=1);
    for (let i=1;i<=pages;i++){ html += `<button ${i===page?'class="is-active"':''} data-to="${i}">${i}</button>`; }
    html += btn('→', page+1, page>=pages);
    el.innerHTML = html;
    el.onclick = (e)=>{
      const to = +(e.target.dataset.to||0);
      if(!to || to===page) return;
      onGo(to);
      window.scrollTo({top:0, behavior:'smooth'});
    };
  }
  function renderChips(f){
    const box = document.getElementById('activeChips');
    const fmt = n => new Intl.NumberFormat('uz-UZ',{style:'currency',currency:'UZS',maximumFractionDigits:0}).format(n);
    const chips = [];
    if (f.q) chips.push(`<span class="chip" data-k="q">Qidiruv: <b>${f.q}</b> ×</span>`);
    if (f.cat) chips.push(`<span class="chip" data-k="cat">Kategoriya: <b>${f.cat}</b> ×</span>`);
    if (f.inStock) chips.push(`<span class="chip" data-k="inStock">Mavjud ×</span>`);
    if (f.min) chips.push(`<span class="chip" data-k="min">Min: <b>${fmt(f.min)}</b> ×</span>`);
    if (isFinite(f.max) && f.max) chips.push(`<span class="chip" data-k="max">Max: <b>${fmt(f.max)}</b> ×</span>`);
    if (f.brands.length) chips.push(...f.brands.map(b=>`<span class="chip" data-k="brand" data-v="${b}">${b} ×</span>`));
    box.innerHTML = chips.join('') || '';
    box.onclick = (e)=>{
      const chip = e.target.closest('.chip'); if(!chip) return;
      const k = chip.dataset.k;
      if (k === 'q') document.getElementById('q').value='';
      if (k === 'cat') document.getElementById('catSel').value='';
      if (k === 'inStock') document.getElementById('inStockOnly').checked=false;
      if (k === 'min') document.getElementById('minPrice').value='';
      if (k === 'max') document.getElementById('maxPrice').value='';
      if (k === 'brand') {
        const v = chip.dataset.v;
        const box = document.querySelector(`#brandList input[value="${v}"]`);
        if (box) box.checked = false;
      }
      rerender();
    };
  }
  function renderEmpty(){
    return `
      <div class="empty">
        <img class="empty__img" src="img/empty-state.png" alt="Empty" onerror="this.style.display='none'">
        <h3 class="empty__title">Hech narsa topilmadi</h3>
        <p class="empty__text muted">Filtrlarni o'zgartiring yoki tozalang.</p>
        <div class="empty__actions">
          <button class="btn btn--ghost" id="emptyClear">Filtrlarni tozalash</button>
          <a class="btn" href="../index.html">Bosh sahifa</a>
        </div>
      </div>
    `;
  }
  function updateResultCount(n){
    const el = document.getElementById('resultCount');
    if (el) el.textContent = n;
  }

  let all = [];
  let page = 1;

  async function main(){
    const res = await fetch(DATA_URL, {cache:'no-store'});
    const data = await res.json();
    all = Array.isArray(data) ? data : (data.products || []);

    buildCategories(all);
    buildBrands(all);

    document.getElementById('q').oninput = debounce(rerender, 200);
    document.getElementById('catSel').onchange = rerender;
    document.getElementById('inStockOnly').onchange = rerender;
    document.getElementById('minPrice').oninput = debounce(rerender, 200);
    document.getElementById('maxPrice').oninput = debounce(rerender, 200);
    document.getElementById('brandList').onchange = rerender;
    document.getElementById('sortSel').onchange = rerender;
    document.getElementById('brandSearch').oninput = (e)=> filterBrandList(e.target.value);

    document.getElementById('clearFilters').onclick = ()=>{
      document.getElementById('q').value='';
      document.getElementById('catSel').value='';
      document.getElementById('inStockOnly').checked=false;
      document.getElementById('minPrice').value='';
      document.getElementById('maxPrice').value='';
      document.getElementById('brandSearch').value='';
      filterBrandList('');
      [...document.querySelectorAll('#brandList input:checked')].forEach(i=> i.checked=false);
      rerender();
    };
 
    document.getElementById('listGrid').addEventListener('click', (e)=>{
      const btn = e.target.closest('.buy-now[data-id]');
      if (!btn) return;
      const id = btn.dataset.id;
      addToOrder(id, 1);
      goCheckout();
    });

    rerender();
  }
  function debounce(fn, ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn.apply(null,a), ms); }; }

  function rerender(){
    const f = readFilters();
    renderChips(f);

    const filtered = applyFilters(all, f);
    const sorted = sortProducts(filtered, f.sort);
    updateResultCount(sorted.length);

    const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    page = Math.min(page, pages);

    const start = (page-1) * PAGE_SIZE;
    const slice = sorted.slice(start, start+PAGE_SIZE);

    const grid = document.getElementById('listGrid');
    if (!slice.length) {
      grid.innerHTML = renderEmpty();
      const clearBtn = document.getElementById('emptyClear');
      if (clearBtn) clearBtn.onclick = ()=> document.getElementById('clearFilters').click();
    } else {
      grid.innerHTML = '';
      slice.forEach(p => grid.appendChild(createCard(p)));
    }

    renderPager('pagerBottom', page, sorted.length, (to)=>{ page = to; rerender(); });
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