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
    return `<div class="fc" onclick="window.editQuoteById('${r.id}')">
      <div class="fch"><div class="ci">
        <div class="av" style="background:${avClr(custName)};width:28px;height:28px;font-size:10px">${ini(custName)}</div>
        <div>
          <div style="font-weight:700;font-size:13px">${custName}</div>
          <div style="font-size:11px;color:var(--tx3)">${r.number || ''} · ${fmtD(r.date)}</div>
        </div></div>
        <span class="badge ${ST_CLS[st]}">${ST_LBL[st]}</span>
      </div>
      <div style="font-size:11px;color:var(--tx2);margin:6px 0">${itemsCount} פריטים${r.convertedFaultId ? ' · 🔧 הומר למשימה' : ''}</div>
      <div class="fmeta" style="margin-top:6px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:700;color:var(--acc)">₪${Number(r.total || 0).toLocaleString('he-IL')}</span>
        <button class="btn bs btn-sm" onclick="event.stopPropagation();window.exportQuotePDF('${r.id}')">🖨️ PDF</button>
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
  document.getElementById('q-number').value = _nextQuoteNumber();
  document.getElementById('q-date').value = today();
  document.getElementById('q-valid').value = '';
  document.getElementById('q-status').value = 'draft';
  document.getElementById('q-vat').checked = true;
  document.getElementById('q-notes').value = '';
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
  document.getElementById('q-number').value = r.number || _nextQuoteNumber();
  document.getElementById('q-date').value = r.date || today();
  document.getElementById('q-valid').value = r.validUntil || '';
  document.getElementById('q-status').value = r.status || 'draft';
  document.getElementById('q-vat').checked = r.hasVat !== false;
  document.getElementById('q-notes').value = r.notes || '';

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
  if (!confirm('למחוק הצעת מחיר זו?')) return;
  const id = _eQuote;
  closeM('M-quote');
  toast('מוחק...');
  if (window._dbDel) await window._dbDel('quotes', id);
  window.quotes = (window.quotes || []).filter(x => x.id !== id);
  addLog('quote', 'מחיקת הצעת מחיר', id);
  renderQuotes();
}
window.delQuote = delQuote;

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
  const custPhone = c ? (c.phone || '') : (r.guestPhone || '');
  const custAddr  = c ? [c.address, c.city].filter(Boolean).join(', ') : '';
  const logo = (cfg.logos && (cfg.logos.header || cfg.logos.login)) || '';
  const company = cfg.company || 'וידאו דיזיין';
  const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

  const itemRows = (r.items || []).length
    ? r.items.map((it, i) => {
        const line = (it.qty || 0) * (it.unitPrice || 0);
        return `<tr>
          <td style="text-align:center">${i + 1}</td>
          <td>${esc(it.desc)}</td>
          <td style="text-align:center">${it.qty || 0}</td>
          <td style="text-align:left">₪${Number(it.unitPrice || 0).toLocaleString('he-IL')}</td>
          <td style="text-align:left">₪${line.toLocaleString('he-IL')}</td>
        </tr>`;
      }).join('')
    : '<tr><td colspan="5" style="text-align:center;color:#888">אין פריטים</td></tr>';

  const html = `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8">
<title>הצעת מחיר ${esc(r.number || '')} — ${esc(custName)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;800&display=swap');
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Heebo',Arial,sans-serif; color:#1e293b; padding:28px 32px; font-size:14px; line-height:1.5; }
  .head { display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #3b82f6; padding-bottom:14px; }
  .head img { max-height:70px; max-width:220px; }
  .head .co h1 { font-size:22px; color:#3b82f6; font-weight:800; }
  .head .co div { font-size:12px; color:#64748b; }
  .doc-title { text-align:center; font-size:20px; font-weight:800; margin:16px 0 2px; }
  .doc-sub { text-align:center; font-size:13px; color:#64748b; margin-bottom:18px; }
  .grid2 { display:flex; gap:16px; margin-bottom:16px; }
  .card { flex:1; border:1px solid #e2e8f0; border-radius:10px; padding:12px 14px; background:#f8fafc; }
  .card h3 { font-size:12px; color:#3b82f6; margin-bottom:8px; }
  .row { display:flex; justify-content:space-between; padding:3px 0; font-size:13px; }
  .row span:first-child { color:#64748b; }
  .row span:last-child { font-weight:600; }
  table { width:100%; border-collapse:collapse; margin-bottom:14px; }
  th { background:#eef2f7; font-size:12px; padding:8px; border:1px solid #e2e8f0; }
  td { padding:8px; border:1px solid #e2e8f0; font-size:13px; }
  .totals { max-width:300px; margin-right:auto; border:1px solid #e2e8f0; border-radius:8px; padding:12px 14px; background:#f0f9ff; }
  .totals .row { font-size:14px; }
  .grand { font-size:17px; font-weight:800; color:#1e293b; border-top:1px dashed #94a3b8; margin-top:6px; padding-top:6px; }
  .notes { margin-top:16px; border:1px solid #e2e8f0; border-radius:8px; padding:12px 14px; white-space:pre-wrap; font-size:13px; }
  .sign-area { display:flex; justify-content:space-between; margin-top:36px; gap:30px; }
  .sign-box { flex:1; }
  .sign-box .line { border-top:1.5px solid #1e293b; margin-top:40px; padding-top:4px; font-size:12px; color:#64748b; }
  .footer { margin-top:28px; text-align:center; font-size:11px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:10px; }
  @media print { body { padding:14px 18px; } @page { margin:12mm; } }
</style></head><body>
  <div class="head">
    ${logo ? `<img src="${logo}" alt="logo">` : `<h1 style="color:#3b82f6;font-weight:800">${esc(company)}</h1>`}
    <div class="co">
      <h1>${esc(company)}</h1>
      ${cfg.phone ? `<div>📞 ${esc(cfg.phone)}</div>` : ''}
      ${cfg.email ? `<div>✉ ${esc(cfg.email)}</div>` : ''}
    </div>
  </div>
  <div class="doc-title">הצעת מחיר</div>
  <div class="doc-sub">${esc(r.number || '')} · תאריך: ${fmtD(r.date)}${r.validUntil ? ' · בתוקף עד: ' + fmtD(r.validUntil) : ''}</div>

  <div class="grid2">
    <div class="card">
      <h3>לכבוד</h3>
      <div class="row"><span>שם:</span><span>${esc(custName)}</span></div>
      ${custPhone ? `<div class="row"><span>טלפון:</span><span>${esc(custPhone)}</span></div>` : ''}
      ${custAddr ? `<div class="row"><span>כתובת:</span><span>${esc(custAddr)}</span></div>` : ''}
    </div>
    <div class="card">
      <h3>פרטי ההצעה</h3>
      <div class="row"><span>מספר:</span><span>${esc(r.number || '')}</span></div>
      <div class="row"><span>תאריך:</span><span>${fmtD(r.date)}</span></div>
      ${r.validUntil ? `<div class="row"><span>בתוקף עד:</span><span>${fmtD(r.validUntil)}</span></div>` : ''}
    </div>
  </div>

  <table>
    <thead><tr><th style="width:40px">#</th><th>תיאור</th><th style="width:60px">כמות</th><th style="width:90px">מחיר יח'</th><th style="width:90px">סה"כ</th></tr></thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="totals">
    <div class="row"><span>סכום ביניים:</span><span>₪${Number(r.subtotal || 0).toLocaleString('he-IL')}</span></div>
    ${r.hasVat ? `<div class="row"><span>מע"מ 18%:</span><span>₪${Number(r.vatAmount || 0).toLocaleString('he-IL', { maximumFractionDigits: 2 })}</span></div>` : ''}
    <div class="row grand"><span>סה"כ לתשלום:</span><span>₪${Number(r.total || 0).toLocaleString('he-IL')}</span></div>
  </div>

  ${r.notes ? `<div class="notes"><b>הערות:</b><br>${esc(r.notes)}</div>` : ''}

  <div class="sign-area">
    <div class="sign-box"><div class="line">חתימת הלקוח (אישור הזמנה)</div></div>
    <div class="sign-box"><div class="line">חתימת ${esc(company)}</div></div>
  </div>

  <div class="footer">הצעת מחיר זו אינה מהווה חשבונית · הופק ממערכת ${esc(company)} · ${fmtD(today())}</div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 350); };<\/script>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) { toast('חסום ע"י חוסם חלונות קופצים', 'err'); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
window.exportQuotePDF = exportQuotePDF;
