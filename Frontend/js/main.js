(function () {
    var saved = localStorage.getItem('theme');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-theme', saved || (prefersDark ? 'dark' : 'light'));
})();


document.getElementById('y').textContent = new Date().getFullYear();

(function () {
    const KEY = 'favs';
    const get = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch (e) { return [] } };
    const set = a => { localStorage.setItem(KEY, JSON.stringify(a)); count() };
    const has = id => get().includes(id);
    function toggle(id) { let f = get(); f = has(id) ? f.filter(x => x !== id) : f.concat(id); set(f); sync(); }
    function sync() {
        document.querySelectorAll('.like-btn[data-id]').forEach(b => {
            const on = has(b.dataset.id);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
            const i = b.querySelector('i'); if (i) { i.classList.toggle('fa-regular', !on); i.classList.toggle('fa-solid', on); }
        });
    }
    function count() {
        const n = get().length, badge = document.getElementById('likeCount'), navIcon = document.querySelector('.nav__like i');
        if (badge) badge.textContent = n;
        if (navIcon) { navIcon.classList.toggle('fa-solid', n > 0); navIcon.classList.toggle('fa-regular', n === 0); }
    }
    document.addEventListener('click', e => { const b = e.target.closest('.like-btn[data-id]'); if (b) toggle(b.dataset.id); });
    document.addEventListener('DOMContentLoaded', () => { sync(); count(); });
})();

(function () {
    var root = document.documentElement, btn = document.getElementById('themeToggle');
    function ico() { btn.textContent = (root.getAttribute('data-theme') === 'dark') ? '☀️' : '🌙' }
    if (btn) btn.onclick = function () { var t = root.getAttribute('data-theme') || 'light'; var n = t === 'dark' ? 'light' : 'dark'; root.setAttribute('data-theme', n); localStorage.setItem('theme', n); ico(); };
    ico();
})();


var Tawk_API = Tawk_API || {}, Tawk_LoadStart = new Date();
(function () {
    var s1 = document.createElement("script"), s0 = document.getElementsByTagName("script")[0];
    s1.async = true;
    s1.src = 'https://embed.tawk.to/68e8d7e5c312bc194e49b928/1j76ommid';
    s1.charset = 'UTF-8';
    s1.setAttribute('crossorigin', '*');
    s0.parentNode.insertBefore(s1, s0);
})();

 
(function () {
    const openBtn = document.getElementById('mnavOpen');
    const closeBtn = document.getElementById('mnavClose');
    const drawer = document.getElementById('mnav');
    const shroud = document.getElementById('mnavShroud');

    if (!openBtn || !drawer || !shroud) return;

    const open = () => {
        drawer.classList.add('is-open');
        shroud.hidden = false;
        requestAnimationFrame(() => shroud.classList.add('is-visible'));
        document.body.classList.add('mnav-open');
        openBtn?.setAttribute('aria-expanded', 'true');
        drawer?.setAttribute('aria-hidden', 'false');
    };

    const close = () => {
        drawer.classList.remove('is-open');
        shroud.classList.remove('is-visible');
        document.body.classList.remove('mnav-open');
        openBtn?.setAttribute('aria-expanded', 'false');
        drawer?.setAttribute('aria-hidden', 'true');
        setTimeout(() => { shroud.hidden = true; }, 200);
    };

    openBtn.addEventListener('click', open);
    closeBtn?.addEventListener('click', close);
    shroud.addEventListener('click', close);

     
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawer.classList.contains('is-open')) close();
    });
 
    drawer.addEventListener('click', (e) => {
        const a = e.target.closest('a');
        if (a) close();
    });

    
    let startX = null;
    drawer.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    drawer.addEventListener('touchmove', (e) => {
        if (startX == null) return;
        const dx = e.touches[0].clientX - startX;
        if (dx < -50) { close(); startX = null; }
    }, { passive: true });
})();
