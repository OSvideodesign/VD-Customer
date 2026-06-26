// ══ custpicker.js — בורר לקוח חכם עם חיפוש (שם/טלפון) ══
// מחליף את ה-<select> הרגיל בתיבת חיפוש + רשימה נפתחת מסוננת.
// השדה הנסתר (.cp-value) שומר על ה-id המקורי, כך שקריאות getElementById(id).value ממשיכות לעבוד.

const REG = {};

function _custList() {
  return [...(window.custs || [])].sort((a, b) => a.name.localeCompare(b.name, 'he'));
}

function _renderDrop(reg, q) {
  q = (q || '').trim().toLowerCase();
  const items = [];
  if (reg.opts.includeNone)  items.push({ value: '',          label: '— ללא קישור —', icon: '🚫' });
  if (reg.opts.includeGuest) items.push({ value: '__guest__', label: 'לקוח מזדמן',     icon: '👤' });

  _custList().forEach(c => {
    const hay = (c.name + ' ' + (c.phone || '') + ' ' + (c.city || '')).toLowerCase();
    if (!q || hay.includes(q)) items.push({ value: c.id, label: c.name, sub: c.phone || '', icon: '🧑' });
  });

  const shown = items.slice(0, 60);
  reg.drop.innerHTML = shown.length
    ? shown.map(it => `<div class="cp-item" data-val="${it.value}">
        <span class="cp-ic">${it.icon || ''}</span>
        <div class="cp-tx"><div class="cp-nm">${it.label}</div>${it.sub ? `<div class="cp-sb">${it.sub}</div>` : ''}</div>
      </div>`).join('')
    : '<div class="cp-empty">לא נמצאו לקוחות</div>';
}

function _labelFor(reg, value) {
  if (value === '__guest__') return 'לקוח מזדמן';
  if (value === '' || value == null) return reg.opts.includeNone ? '— ללא קישור —' : '';
  const c = (window.custs || []).find(x => x.id === value);
  return c ? c.name : '';
}

export function setCustPicker(wrapId, value) {
  const reg = REG[wrapId]; if (!reg) return;
  reg.hidden.value = (value == null ? '' : value);
  reg.input.value  = _labelFor(reg, reg.hidden.value);
  reg.drop.classList.remove('open');
}
window.setCustPicker = setCustPicker;

export function getCustPicker(wrapId) {
  const reg = REG[wrapId]; if (!reg) return '';
  return reg.hidden.value || '';
}
window.getCustPicker = getCustPicker;

export function initCustPicker(wrapId, opts = {}) {
  const wrap = document.getElementById(wrapId); if (!wrap) return;
  if (REG[wrapId]) return; // כבר אותחל
  const input  = wrap.querySelector('.cp-input');
  const drop   = wrap.querySelector('.cp-drop');
  const hidden = wrap.querySelector('.cp-value');
  if (!input || !drop || !hidden) return;

  const reg = { wrap, input, drop, hidden, opts };
  REG[wrapId] = reg;

  const open = (q) => { _renderDrop(reg, q); drop.classList.add('open'); };

  input.addEventListener('focus', () => { try { input.select(); } catch (e) {} open(''); });
  input.addEventListener('input', () => { hidden.value = ''; open(input.value); });
  input.addEventListener('blur', () => {
    setTimeout(() => {
      drop.classList.remove('open');
      input.value = _labelFor(reg, hidden.value); // החזרת הטקסט המוצג לערך הנבחר (התעלמות מטקסט חופשי שלא נבחר)
    }, 170);
  });

  // pointerdown יורה לפני blur — מאפשר בחירה בעכבר ובמגע
  drop.addEventListener('pointerdown', (e) => {
    const it = e.target.closest('.cp-item'); if (!it) return;
    e.preventDefault();
    const val = it.dataset.val;
    setCustPicker(wrapId, val);
    input.blur();
    if (typeof opts.onChange === 'function') opts.onChange(val);
  });
}
window.initCustPicker = initCustPicker;
