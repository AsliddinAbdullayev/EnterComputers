// Demo uchun — xohlasangiz fetch('/api/faq') qilasiz
const FAQ = [
    { id: 'q1', cat: 'buyurtma', q: 'Buyurtmani qanday joylash mumkin?', a: 'Mahsulot kartasidagi “Sotib olish” tugmasi orqali savatchaga qo‘shasiz, “Checkout”da ma’lumotlarni to‘ldirib tasdiqlaysiz.' },
    { id: 'q2', cat: 'to‘lov', q: 'Qanday to‘lov usullari mavjud?', a: 'Naqd, karta (UZCARD/HUMO), onlayn to‘lov (Payme/Click) hamda korporativ to‘lovlar qabul qilinadi.' },
    { id: 'q3', cat: 'yetkazib', q: 'Yetkazib berish muddati qancha?', a: 'Toshkentda odatda 24 soat ichida. Viloyatlarga 2–3 ish kuni.' },
    { id: 'q4', cat: 'qaytarish', q: 'Mahsulotni qaytarish shartlari qanday?', a: 'Qadoq saqlangan bo‘lishi va 14 kun ichida murojaat qiling. Kafolatdagi nosozliklar servis markazida ko‘rib chiqiladi.' },
    { id: 'q5', cat: 'boshqa', q: 'Rassrochka (bo‘lib to‘lash) bormi?', a: 'Ha, hamkor banklar orqali 3–12 oyga bo‘lib to‘lash imkoniyati mavjud.' }
];

const $list = document.getElementById('list');
const $q = document.getElementById('q');
const $cat = document.getElementById('cat');
const $empty = document.getElementById('empty');
const $toggleAll = document.getElementById('toggleAll');
const $sign = $toggleAll.querySelector('.sign');
const $txt = $toggleAll.querySelector('.txt');

const escapeHtml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function render(items) {
    $list.innerHTML = '';
    if (!items.length) { $empty.classList.add('show'); return; }
    $empty.classList.remove('show');

    items.forEach((it, idx) => {
        const card = document.createElement('article');
        card.className = 'item';
        card.id = it.id;
        card.setAttribute('aria-expanded', 'false');

        card.innerHTML = `
          <button class="head" aria-controls="${it.id}-a" aria-expanded="false">
            <span class="left">
              <span class="bubble">?</span>
              <span class="title">${escapeHtml(it.q)}</span>
            </span>
            <svg class="rchev" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M7 10l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <div class="body" id="${it.id}-a" role="region" aria-labelledby="${it.id}">
            <p style="margin:0">${escapeHtml(it.a)}</p>
          </div>
        `;

        const head = card.querySelector('.head');
        const body = card.querySelector('.body');
        head.addEventListener('click', () => toggle(card, body, head));
        $list.appendChild(card);
    });
 
    if (location.hash) {
        const t = document.getElementById(location.hash.slice(1));
        if (t) {
            open(t, t.querySelector('.body'), t.querySelector('.head'), false);
            t.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}
 
function toggle(card, body, head) {
    const isOpen = card.getAttribute('aria-expanded') === 'true';
    isOpen ? close(card, body, head) : open(card, body, head, true);
}
function open(card, body, head, collapseOthers) {
    if (collapseOthers) {
        document.querySelectorAll('.item[aria-expanded="true"]').forEach(x => {
            if (x !== card) close(x, x.querySelector('.body'), x.querySelector('.head'));
        });
    }
    card.setAttribute('aria-expanded', 'true');
    head.setAttribute('aria-expanded', 'true');
    
    body.style.maxHeight = body.scrollHeight + 'px';
    body.style.opacity = '1';
    body.style.paddingTop = '6px';
    body.style.paddingBottom = '18px';
    history.replaceState(null, '', '#' + card.id);
}
function close(card, body, head) {
    card.setAttribute('aria-expanded', 'false');
    head.setAttribute('aria-expanded', 'false');
    body.style.maxHeight = '0px';
    body.style.opacity = '0';
    body.style.paddingTop = '0';
    body.style.paddingBottom = '0';
    if (location.hash.slice(1) === card.id) {
        history.replaceState(null, '', location.pathname + location.search);
    }
}
 
function applyFilter() {
    const term = ($q.value || '').trim().toLowerCase();
    const cat = $cat.value;
    const filtered = FAQ.filter(x => {
        const okCat = !cat || x.cat === cat;
        const okTerm = !term || x.q.toLowerCase().includes(term) || x.a.toLowerCase().includes(term);
        return okCat && okTerm;
    });
    render(filtered);
}
$q.addEventListener('input', debounce(applyFilter, 140));
$cat.addEventListener('change', applyFilter);
 
window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== $q) { e.preventDefault(); $q.focus(); }
});
 
$toggleAll.addEventListener('click', () => {
    const anyOpen = document.querySelector('.item[aria-expanded="true"]');
    if (anyOpen) {
        document.querySelectorAll('.item[aria-expanded="true"]').forEach(x => {
            close(x, x.querySelector('.body'), x.querySelector('.head'));
        });
        $sign.textContent = '+';
        $txt.textContent = 'Barchasini ochish';
    } else {
        document.querySelectorAll('.item').forEach(x => {
            open(x, x.querySelector('.body'), x.querySelector('.head'), false);
        });
        $sign.textContent = '–';
        $txt.textContent = 'Barchasini yopish';
    }
});

function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn.apply(null, a), ms); }; }

render(FAQ);