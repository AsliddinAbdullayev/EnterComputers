const CONTACT = {
    phones: [
        { label: "Savdo bo‘limi", number: "+998 33 000 34 34" },
        { label: "Qo‘llab-quvvatlash", number: "+988 93 529 34 34" },
    ],
     
    place: {
        title: "Enter Computers",
        address: "Toshkent shahri, Chilonzor t., Qatortol ko‘chasi, 12-uy",
        lat: 41.311081, 
        lon: 69.240562   
    }
 
};
 
(function renderPhones() {
    const box = document.getElementById('phones');
    CONTACT.phones.forEach((p, i) => {
        const tel = 'tel:' + p.number.replace(/\s+/g, '');
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML = `
          <div class="l">
            <i class="fa-solid fa-phone"></i>
            <div>
              <div><b>${escapeHtml(p.label)}</b></div>
              <div class="muted">${escapeHtml(p.number)}</div>
            </div>
          </div>
          <div class="r">
            <a class="btn primary" href="${tel}"><i class="fa-solid fa-phone"></i> Qo‘ng‘iroq</a>
            <button class="btn copy" data-num="${escapeHtml(p.number)}"><i class="fa-regular fa-copy"></i></button>
          </div>
        `;
        box.appendChild(row);
    });

    box.addEventListener('click', (e) => {
        const b = e.target.closest('.copy[data-num]');
        if (!b) return;
        const num = b.dataset.num;
        navigator.clipboard.writeText(num).then(() => {
            b.innerHTML = '<i class="fa-solid fa-check"></i>';
            setTimeout(() => b.innerHTML = '<i class="fa-regular fa-copy"></i>', 1200);
        });
    });
})();


(function () {
    const t = document.getElementById('addressTitle');
    const a = document.getElementById('addressText');
    if (CONTACT.place?.title) t.innerHTML = '<b>' + escapeHtml(CONTACT.place.title) + '</b>';
    if (CONTACT.place?.address) a.textContent = CONTACT.place.address;

    const yLink = document.getElementById('yandexLink');
    const { lat, lon } = CONTACT.place;
     

})();
 


function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }