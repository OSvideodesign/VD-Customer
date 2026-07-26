// ══ quotes.js — הצעות מחיר (Quotes) ══

import { uid, today, fmtD, avClr, ini, toast } from './utils.js';
import { openM, closeM } from './nav.js';
import { addLog } from './log.js';

let _eQuote = null;   // id של הצעה בעריכה (null = חדשה)

const VAT_RATE = 0.18; // מע"מ 18%

const ST_LBL = { draft: '📝 טיוטה', sent: '📤 נשלחה', approved: '✅ אושרה', rejected: '❌ נדחתה' };
const ST_CLS = { draft: 'bb', sent: 'by', approved: 'bg', rejected: 'br' };

// ── מספר הצעה הבא ────────────────────────────────────────────────────────────
function _nextQuoteNumber() {
  let max = 0;
  (window.quotes || []).forEach(q => {
    const n = parseInt(String(q.number || '').replace(/\D/g, ''), 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return 'Q-' + String(max + 1).padStart(4, '0');
}

// ── שורות פריטים ─────────────────────────────────────────────────────────────
export function addQuoteItemRow(desc, qty, price) {
  const list = document.getElementById('q-items-list');
  if (!list) return;
  const row = document.createElement('div');
  row.className = 'q-item-row';
  row.style.cssText = 'display:flex;gap:8px;margin-bottom:6px;align-items:center';
  row.innerHTML =
    `<input class="finp q-it-desc" placeholder="תיאור פריט / עבודה" value="${(desc || '').replace(/"/g, '&quot;')}" style="flex:3">` +
    `<input class="finp q-it-qty" type="number" min="1" placeholder="כמות" value="${qty || ''}" style="flex:1;min-width:60px" oninput="window.wqRecalc()">` +
    `<input class="finp q-it-price" type="number" min="0" placeholder="מחיר ₪" value="${price != null && price !== '' ? price : ''}" style="flex:1;min-width:80px" oninput="window.wqRecalc()">` +
    `<button type="button" class="btn bd btn-sm" onclick="this.parentElement.remove();window.wqRecalc()" style="flex-shrink:0">✕</button>`;
  list.appendChild(row);
}
window.addQuoteItemRow = addQuoteItemRow;

function _readItems() {
  return [...document.querySelectorAll('#q-items-list .q-item-row')]
    .map(r => ({
      desc:      r.querySelector('.q-it-desc').value.trim(),
      qty:       parseFloat(r.querySelector('.q-it-qty').value) || 0,
      unitPrice: parseFloat(r.querySelector('.q-it-price').value) || 0,
    }))
    .filter(it => it.desc || it.qty || it.unitPrice);
}

function _calcTotals(items, hasVat) {
  const subtotal = items.reduce((s, it) => s + (it.qty || 0) * (it.unitPrice || 0), 0);
  const vatAmount = hasVat ? subtotal * VAT_RATE : 0;
  const total = subtotal + vatAmount;
  return {
    subtotal:  Math.round(subtotal * 100) / 100,
    vatAmount: Math.round(vatAmount * 100) / 100,
    total:     Math.round(total * 100) / 100,
  };
}

// ── חישוב חי במודל ───────────────────────────────────────────────────────────
export function wqRecalc() {
  const items = _readItems();
  const hasVat = document.getElementById('q-vat')?.checked;
  const t = _calcTotals(items, hasVat);
  const el = document.getElementById('q-total-disp');
  if (!el) return;
  el.innerHTML =
    `<div style="display:flex;justify-content:space-between"><span>סכום ביניים:</span><b>₪${t.subtotal.toLocaleString('he-IL')}</b></div>` +
    (hasVat ? `<div style="display:flex;justify-content:space-between"><span>מע"מ 18%:</span><b>₪${t.vatAmount.toLocaleString('he-IL', { maximumFractionDigits: 2 })}</b></div>` : '') +
    `<div style="display:flex;justify-content:space-between;font-size:15px;color:var(--acc);border-top:1px dashed var(--brd2);margin-top:4px;padding-top:4px"><span>סה"כ:</span><b>₪${t.total.toLocaleString('he-IL')}</b></div>`;
}
window.wqRecalc = wqRecalc;

// ── בורר לקוח ────────────────────────────────────────────────────────────────
function _fillQCustSelect(selected) {
  if (window.setCustPicker) window.setCustPicker('PICK-q-cust', selected || '');
  else { const h = document.getElementById('q-cust'); if (h) h.value = selected || ''; }
}

export function qToggleGuest() {
  const v = document.getElementById('q-cust').value;
  document.getElementById('q-guest-fields').style.display = v === '__guest__' ? 'block' : 'none';
}
window.qToggleGuest = qToggleGuest;

// ── תצוגת רשימה ──────────────────────────────────────────────────────────────
export function renderQuotes() {
  const q = (document.getElementById('q-quotes')?.value || '').toLowerCase();
  const fStat = document.getElementById('q-filter-status')?.value || '';

  let list = (window.quotes || []).filter(r => {
    if (fStat && (r.status || 'draft') !== fStat) return false;
    const c = window.custs.find(x => x.id === r.custId);
    const name = c ? c.name : (r.guestName || '');
    if (q && !name.toLowerCase().includes(q) && !String(r.number || '').toLowerCase().includes(q)) return false;
    return true;
  }).sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0));

  const cnt = document.getElementById('cnt-quotes');
  if (cnt) cnt.textContent = list.length + ' הצעות';

  const el = document.getElementById('list-quotes');
  if (!el) return;

  if (!list.length) {
    el.innerHTML = '<div style="text-align:center;padding:50px;color:var(--tx3)">📄<br><br>אין הצעות מחיר להצגה</div>';
    return;
  }

  el.innerHTML = '<div class="fg-grid">' + list.map(r => {
    const c = window.custs.find(x => x.id === r.custId);
    const custName = c ? c.name : (r.guestName ? r.guestName + ' (מזדמן)' : 'לקוח מזדמן');
    const st = r.status || 'draft';
    const itemsCount = (r.items || []).length;
    return `<div class="fc" style="border-right:3px solid #AD8A44" onclick="window.editQuoteById('${r.id}')">
      <div class="fch"><div class="ci">
        <div class="av" style="background:#AD8A44;color:#16233F;width:28px;height:28px;font-size:10px">${ini(custName)}</div>
        <div>
          <div style="font-weight:700;font-size:13px">${custName}</div>
          <div style="font-size:11px;color:var(--tx3)">${r.number || ''} · ${fmtD(r.date)}</div>
        </div></div>
        <span class="badge ${ST_CLS[st]}">${ST_LBL[st]}</span>
      </div>
      <div style="font-size:11px;color:var(--tx2);margin:6px 0">${itemsCount} פריטים${r.convertedFaultId ? ' · 🔧 הומר למשימה' : ''}</div>
      <div class="fmeta" style="margin-top:6px;display:flex;justify-content:space-between;align-items:center;gap:6px">
        <span style="font-weight:700;color:#AD8A44">₪${Number(r.total || 0).toLocaleString('he-IL')}</span>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="btn bs btn-sm" onclick="event.stopPropagation();window.editQuoteById('${r.id}')" title="ערוך">✏️</button>
          <button class="btn bs btn-sm" onclick="event.stopPropagation();window.exportQuotePDF('${r.id}')" title="PDF">🖨️</button>
          <button class="btn bd btn-sm" onclick="event.stopPropagation();window.delQuoteById('${r.id}')" title="מחק">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('') + '</div>';
}

// ── פתיחת הצעה חדשה ──────────────────────────────────────────────────────────
export function openNewQuote(preCustId) {
  _eQuote = null;
  document.getElementById('M-quote-title').textContent = 'הצעת מחיר חדשה';
  document.getElementById('q-del').style.display = 'none';
  document.getElementById('q-convert').style.display = 'none';

  _fillQCustSelect(preCustId || '');
  document.getElementById('q-guest-fields').style.display = 'none';
  document.getElementById('q-guest-name').value  = '';
  document.getElementById('q-guest-phone').value = '';
  document.getElementById('q-subject').value = '';
  document.getElementById('q-number').value = _nextQuoteNumber();
  document.getElementById('q-date').value = today();
  document.getElementById('q-valid').value = '';
  document.getElementById('q-status').value = 'draft';
  document.getElementById('q-vat').checked = true;
  document.getElementById('q-notes').value = '';
  document.getElementById('q-includes').value = '';
  document.getElementById('q-items-list').innerHTML = '';
  addQuoteItemRow('', '', '');

  openM('M-quote');
  setTimeout(wqRecalc, 60);
}
window.openNewQuote = openNewQuote;

// ── עריכת הצעה ───────────────────────────────────────────────────────────────
export function editQuoteById(id) {
  const r = (window.quotes || []).find(x => x.id === id);
  if (!r) return;
  _eQuote = id;
  document.getElementById('M-quote-title').textContent = 'עריכת ' + (r.number || 'הצעת מחיר');
  document.getElementById('q-del').style.display = '';
  document.getElementById('q-convert').style.display = r.convertedFaultId ? 'none' : '';

  const isGuest = !r.custId && r.guestName;
  _fillQCustSelect(isGuest ? '__guest__' : (r.custId || ''));
  document.getElementById('q-guest-fields').style.display = isGuest ? 'block' : 'none';
  document.getElementById('q-guest-name').value  = r.guestName  || '';
  document.getElementById('q-guest-phone').value = r.guestPhone || '';
  document.getElementById('q-subject').value = r.subject || '';
  document.getElementById('q-number').value = r.number || _nextQuoteNumber();
  document.getElementById('q-date').value = r.date || today();
  document.getElementById('q-valid').value = r.validUntil || '';
  document.getElementById('q-status').value = r.status || 'draft';
  document.getElementById('q-vat').checked = r.hasVat !== false;
  document.getElementById('q-notes').value = r.notes || '';
  document.getElementById('q-includes').value = r.includes || '';

  const list = document.getElementById('q-items-list');
  list.innerHTML = '';
  if (r.items && r.items.length) r.items.forEach(it => addQuoteItemRow(it.desc, it.qty, it.unitPrice));
  else addQuoteItemRow('', '', '');

  openM('M-quote');
  setTimeout(wqRecalc, 60);
}
window.editQuoteById = editQuoteById;

// ── שמירה ────────────────────────────────────────────────────────────────────
export function saveQuote() {
  const custVal = document.getElementById('q-cust').value;
  const isGuest = custVal === '__guest__';
  const guestName  = isGuest ? document.getElementById('q-guest-name').value.trim()  : '';
  const guestPhone = isGuest ? document.getElementById('q-guest-phone').value.trim() : '';
  const items = _readItems();

  if (!custVal && !isGuest) { toast('בחר לקוח', 'err'); return; }
  if (isGuest && !guestName) { toast('הזן שם לקוח מזדמן', 'err'); return; }
  if (!items.length) { toast('הוסף לפחות פריט אחד', 'err'); return; }

  const hasVat = document.getElementById('q-vat').checked;
  const t = _calcTotals(items, hasVat);
  const existing = _eQuote ? (window.quotes || []).find(x => x.id === _eQuote) : null;

  const r = {
    id:         _eQuote || uid(),
    subject:    document.getElementById('q-subject').value.trim(),
    number:     document.getElementById('q-number').value.trim() || _nextQuoteNumber(),
    custId:     isGuest ? '' : custVal,
    guestName:  isGuest ? guestName  : '',
    guestPhone: isGuest ? guestPhone : '',
    date:       document.getElementById('q-date').value || today(),
    validUntil: document.getElementById('q-valid').value,
    status:     document.getElementById('q-status').value || 'draft',
    items,
    hasVat,
    subtotal:   t.subtotal,
    vatAmount:  t.vatAmount,
    total:      t.total,
    notes:      document.getElementById('q-notes').value.trim(),
    includes:   document.getElementById('q-includes').value.trim(),
    convertedFaultId: existing ? (existing.convertedFaultId || '') : '',
    updatedBy:  window._currentUser || '',
    created:    existing ? existing.created : today(),
    createdAt:  existing ? (existing.createdAt || Date.now()) : Date.now(),
  };

  if (_eQuote) window.quotes = (window.quotes || []).map(x => x.id === _eQuote ? r : x);
  else         (window.quotes = window.quotes || []).push(r);

  if (window._dbSaveQuotes) window._dbSaveQuotes([r]);

  const cName = isGuest ? guestName : (window.custs.find(c => c.id === custVal)?.name || '');
  addLog('quote', _eQuote ? 'עדכון הצעת מחיר' : 'הצעת מחיר חדשה', (r.number || '') + ' · ' + cName);

  closeM('M-quote');
  renderQuotes();
  toast(_eQuote ? 'הצעה עודכנה ✅' : 'הצעת מחיר נשמרה ✅');
}
window.saveQuote = saveQuote;

// ── מחיקה ────────────────────────────────────────────────────────────────────
export async function delQuote() {
  if (!_eQuote) return;
  await _doDeleteQuote(_eQuote, true);
}
window.delQuote = delQuote;

// מחיקה ישירה מכרטיס ברשימה (בלי לפתוח את המודל)
export async function delQuoteById(id) {
  await _doDeleteQuote(id, false);
}
window.delQuoteById = delQuoteById;

async function _doDeleteQuote(id, fromModal) {
  const r = (window.quotes || []).find(x => x.id === id);
  if (!r) return;
  if (!confirm('למחוק הצעת מחיר ' + (r.number || '') + '?')) return;
  if (fromModal) closeM('M-quote');
  toast('מוחק...');
  if (window._dbDel) await window._dbDel('quotes', id);
  window.quotes = (window.quotes || []).filter(x => x.id !== id);
  addLog('quote', 'מחיקת הצעת מחיר', r.number || id);
  renderQuotes();
  toast('הצעה נמחקה ✅');
}

// ── המרה למשימה ──────────────────────────────────────────────────────────────
export function convertQuoteToFault() {
  if (!_eQuote) return;
  const r = (window.quotes || []).find(x => x.id === _eQuote);
  if (!r) return;
  if (r.convertedFaultId) { toast('כבר הומר למשימה', 'warn'); return; }
  if (!confirm('ליצור משימה חדשה מהצעת מחיר זו?')) return;

  const desc = 'לפי הצעת מחיר ' + (r.number || '') +
    (r.items && r.items.length ? ': ' + r.items.map(i => i.desc).filter(Boolean).join(', ') : '');

  const fault = {
    id:         uid(),
    custId:     r.custId || '',
    guestName:  r.guestName || '',
    guestPhone: r.guestPhone || '',
    desc:       desc.slice(0, 300),
    type:       'installation',
    priority:   'medium',
    color:      '',
    status:     'open',
    date:       '',
    time:       '',
    amount:     r.total || 0,
    baseAmount: r.subtotal || 0,
    hasVat:     r.hasVat || false,
    paid:       'no',
    notes:      'נוצר אוטומטית מהצעת מחיר ' + (r.number || ''),
    updatedBy:  window._currentUser || '',
    created:    today(),
    createdAt:  Date.now(),
    archivedHidden: false,
  };

  (window.faults = window.faults || []).push(fault);
  if (window._dbSaveFaults) window._dbSaveFaults([fault]);

  r.status = 'approved';
  r.convertedFaultId = fault.id;
  if (window._dbSaveQuotes) window._dbSaveQuotes([r]);

  addLog('quote', 'הצעת מחיר הומרה למשימה', r.number || '');
  closeM('M-quote');
  renderQuotes();
  if (window.renderFaults) window.renderFaults();
  if (window.renderDash) window.renderDash();
  toast('נוצרה משימה מההצעה ✅');
}
window.convertQuoteToFault = convertQuoteToFault;

// ── ייצוא PDF ────────────────────────────────────────────────────────────────
export function exportQuotePDF(id) {
  const r = (window.quotes || []).find(x => x.id === id);
  if (!r) { toast('הצעה לא נמצאה', 'err'); return; }

  const cfg = window.cfg || {};
  const c = window.custs.find(x => x.id === r.custId);
  const custName  = c ? c.name : (r.guestName || 'לקוח מזדמן');
  const logo = (cfg.logos && (cfg.logos.header || cfg.logos.login)) || '';
  const company = cfg.company || 'וידאו דיזיין';
  const tagline = cfg.tagline || 'תכנון וביצוע בתים חכמים';
  const signerName = cfg.signerName || company;
  const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
  const money = n => Number(n || 0).toLocaleString('he-IL', { maximumFractionDigits: 2 });

  // ── NAVY(#16233F) / GOLD(#AD8A44) / CREAM(#E8DFC8) / LGRAY(#F6F5F2) — תבנית מותג "וידאו דיזיין" ──
  // מבנה תואם לדוגמת ייחוס (הצעת מחיר שמעון אקהויז): כותרת+נושא, לקוח+תאריך בלבד, טבלה, סיכום,
  // "ההצעה כוללת", שורת תוקף, וסיום ב"בברכה + שם" — ללא חתימות/אזהרה מתחת (הוסרו לפי הדוגמה).
  const includesSrc = (r.includes && r.includes.trim())
    || cfg.quoteIncludes
    || 'אספקה והתקנה של כל הציוד המפורט\nהגדרה ובדיקת תקינות מלאה בשטח\nהדרכת שימוש למשתמש הקצה';
  const includesRows = includesSrc.split('\n').map(s => s.trim()).filter(Boolean)
    .map(line => `<div class="inc-row"><span class="dash">—</span>${esc(line)}</div>`).join('');

  const validityLine = r.validUntil
    ? `<div class="validity">תוקף ההצעה עד ${fmtD(r.validUntil)}.</div>`
    : '<div class="validity">תוקף ההצעה: 14 ימים מיום הפקתה.</div>';

  const itemRows = (r.items || []).length
    ? r.items.map((it, i) => {
        const line = (it.qty || 0) * (it.unitPrice || 0);
        return `<tr style="background:${i % 2 ? '#F6F5F2' : '#FFFFFF'}">
          <td style="text-align:center">${i + 1}</td>
          <td style="text-align:right">${esc(it.desc)}</td>
          <td style="text-align:center">${it.qty || 0}</td>
          <td style="text-align:center">${money(it.unitPrice)}</td>
          <td style="text-align:center;font-weight:700">${money(line)}</td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="5" style="text-align:center;color:#888">אין פריטים</td></tr>';

  const html = `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8">
<title>הצעת מחיר ${esc(r.number || '')} — ${esc(custName)}</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:Arial,'Heebo',sans-serif; color:#262626; font-size:14px; line-height:1.5; }
  .topbar { background:#16233F; padding:16px 32px; }
  .topbar .co { color:#FFFFFF; font-size:15pt; font-weight:700; }
  .topbar .tag { color:#E8DFC8; font-size:9pt; margin-top:2px; }
  .topbar img { max-height:60px; max-width:200px; }
  .wrap { padding:24px 32px; }
  .doc-title { text-align:center; font-size:22pt; font-weight:700; color:#262626; }
  .doc-sub { text-align:center; font-size:12pt; color:#6B6B6B; margin-top:4px; margin-bottom:16px; }
  .grid2 { display:flex; gap:10px; margin-bottom:18px; background:#F6F5F2; border-radius:8px; padding:14px 16px; }
  .gcell { flex:1; }
  .gcell + .gcell { border-right:1px solid #E5E1D6; padding-right:14px; }
  .glabel { font-size:10pt; color:#6B6B6B; }
  .gval { font-size:13pt; font-weight:700; color:#262626; margin-top:2px; }
  .sec-title { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
  .sec-title span.t { font-size:13.5pt; font-weight:700; color:#262626; white-space:nowrap; }
  .sec-title span.l { flex:1; height:2px; background:#AD8A44; }
  table.items { width:100%; border-collapse:collapse; margin-bottom:14px; font-size:10pt; border:1px solid #E5E1D6; }
  table.items th { background:#16233F; color:#FFFFFF; font-weight:500; padding:8px 6px; border:1px solid #2E3F60; }
  table.items td { padding:7px 6px; border:1px solid #E5E1D6; }
  table.totals { width:100%; border-collapse:collapse; margin-bottom:16px; font-size:10pt; border:1px solid #E5E1D6; }
  table.totals td { padding:7px 12px; border:1px solid #E5E1D6; background:#F6F5F2; }
  table.totals td.tv { text-align:center; font-weight:700; width:90px; }
  table.totals tr.grand td { background:#16233F; color:#FFFFFF; font-size:12.5pt; font-weight:700; border-color:#16233F; }
  .inc-block { font-size:10.5pt; color:#262626; margin:14px 0; }
  .inc-block .h { font-weight:700; margin-bottom:6px; }
  .inc-row { padding:2px 0; }
  .inc-row .dash { color:#AD8A44; font-weight:700; margin-left:6px; }
  .validity { font-size:10pt; color:#6B6B6B; font-style:italic; margin-bottom:14px; }
  .signoff { border-top:1px solid #AD8A44; padding-top:12px; margin-top:6px; font-size:10pt; color:#262626; }
  .signoff .name { font-size:13pt; font-weight:700; margin-top:2px; }
  @media print { .wrap { padding:12px 18px; } @page { margin:10mm; } }
</style></head><body>
  <div class="topbar" style="display:flex;justify-content:space-between;align-items:center">
    <div>
      <div class="co">${esc(company)}</div>
      <div class="tag">${esc(tagline)}</div>
    </div>
    ${logo ? `<img src="${logo}" alt="logo">` : ''}
  </div>

  <div class="wrap">
    <div class="doc-title">הצעת מחיר</div>
    ${r.subject ? `<div class="doc-sub">${esc(r.subject)}</div>` : ''}

    <div class="grid2">
      <div class="gcell">
        <div class="glabel">לקוח</div>
        <div class="gval">${esc(custName)}</div>
      </div>
      <div class="gcell">
        <div class="glabel">תאריך</div>
        <div class="gval">${fmtD(r.date)}</div>
      </div>
    </div>

    <div class="sec-title"><span class="t">פירוט הצעת המחיר</span><span class="l"></span></div>
    <table class="items">
      <thead><tr>
        <th style="width:34px">מס׳</th><th style="text-align:right">תיאור הפריט</th>
        <th style="width:50px">כמות</th><th style="width:90px">מחיר ליחידה (₪)</th><th style="width:90px">סה"כ (₪)</th>
      </tr></thead>
      <tbody>${itemRows}</tbody>
    </table>

    <table class="totals">
      <tr><td style="text-align:right">סה"כ לפני מע"מ</td><td class="tv">${money(r.subtotal)} ₪</td></tr>
      ${r.hasVat ? `<tr><td style="text-align:right">מע"מ (18%)</td><td class="tv">${money(r.vatAmount)} ₪</td></tr>` : ''}
      <tr class="grand"><td style="text-align:right">סה"כ כולל מע"מ</td><td class="tv">${money(r.total)} ₪</td></tr>
    </table>

    <div class="inc-block"><div class="h">ההצעה כוללת</div>${includesRows}</div>

    ${r.notes ? `<div class="inc-block"><div class="h">הערות</div><div style="white-space:pre-wrap">${esc(r.notes)}</div></div>` : ''}

    ${validityLine}

    <div class="signoff">בברכה,<div class="name">${esc(signerName)}</div></div>
  </div>
</body></html>`;

  window.openPrintPreview(html);
}
window.exportQuotePDF = exportQuotePDF;
