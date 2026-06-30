// ══ workreports.js — דוחות עבודה (Work Reports) ══

import { uid, today, fmtD, avClr, ini, toast } from './utils.js';
import { openM, closeM } from './nav.js';
import { addLog } from './log.js';

let _eWR        = null;   // id של דוח בעריכה (null = חדש)
let _sigCtx     = null;   // canvas context לחתימה
let _sigDrawing = false;
let _sigHasInk  = false;

// ── חישוב סה"כ שעות מתוך שעת התחלה/סיום ──────────────────────────────────────
function _calcHours(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;           // חצה חצות
  return Math.round((mins / 60) * 100) / 100;
}

function _fmtHours(h) {
  if (!h) return '—';
  const whole = Math.floor(h);
  const mins  = Math.round((h - whole) * 60);
  if (mins === 0) return whole + ' שע\'';
  return whole + ' שע\' ' + mins + ' דק\'';
}

// ── עדכון תצוגת סה"כ שעות במודל (נקרא ב-oninput) ─────────────────────────────
export function wrUpdateHours() {
  const start = document.getElementById('wr-start').value;
  const end   = document.getElementById('wr-end').value;
  const h = _calcHours(start, end);
  const el = document.getElementById('wr-hours-disp');
  if (el) el.textContent = h ? ('סה"כ: ' + _fmtHours(h)) : '';
}
window.wrUpdateHours = wrUpdateHours;

// ── רשימת ציוד דינמית ───────────────────────────────────────────────────────
export function addEquipRow(name, qty) {
  const list = document.getElementById('wr-equip-list');
  if (!list) return;
  const row = document.createElement('div');
  row.className = 'wr-equip-row';
  row.style.cssText = 'display:flex;gap:8px;margin-bottom:6px;align-items:center';
  row.innerHTML =
    `<input class="finp wr-eq-name" placeholder="שם פריט (לדוגמה: מצלמה 4MP)" value="${(name || '').replace(/"/g, '&quot;')}" style="flex:3">` +
    `<input class="finp wr-eq-qty" type="number" min="1" placeholder="כמות" value="${qty || ''}" style="flex:1;min-width:70px">` +
    `<button type="button" class="btn bd btn-sm" onclick="this.parentElement.remove()" style="flex-shrink:0">✕</button>`;
  list.appendChild(row);
}
window.addEquipRow = addEquipRow;

function _readEquip() {
  return [...document.querySelectorAll('#wr-equip-list .wr-equip-row')]
    .map(r => ({
      name: r.querySelector('.wr-eq-name').value.trim(),
      qty:  parseInt(r.querySelector('.wr-eq-qty').value) || 1,
    }))
    .filter(e => e.name);
}

// ── חתימה דיגיטלית (canvas) ──────────────────────────────────────────────────
function _initSigPad() {
  const cv = document.getElementById('wr-sig');
  if (!cv) return;
  // התאמת רזולוציה לרוחב בפועל
  const ratio = window.devicePixelRatio || 1;
  const w = cv.clientWidth || 300;
  const h = 140;
  cv.width  = w * ratio;
  cv.height = h * ratio;
  _sigCtx = cv.getContext('2d');
  _sigCtx.scale(ratio, ratio);
  _sigCtx.lineWidth = 2.2;
  _sigCtx.lineCap = 'round';
  _sigCtx.lineJoin = 'round';
  _sigCtx.strokeStyle = '#0f172a';
  _sigHasInk = false;

  const pos = (e) => {
    const r = cv.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  };
  const start = (e) => { e.preventDefault(); _sigDrawing = true; const p = pos(e); _sigCtx.beginPath(); _sigCtx.moveTo(p.x, p.y); };
  const move  = (e) => { if (!_sigDrawing) return; e.preventDefault(); const p = pos(e); _sigCtx.lineTo(p.x, p.y); _sigCtx.stroke(); _sigHasInk = true; };
  const end   = () => { _sigDrawing = false; };

  // ניקוי מאזינים קודמים ע"י שכפול הקנבס היה מסבך — נשתמש בדגלים פשוטים
  cv.onmousedown  = start;  cv.onmousemove = move;  cv.onmouseup = end;  cv.onmouseleave = end;
  cv.ontouchstart = start;  cv.ontouchmove = move;  cv.ontouchend = end;
}

export function clearSig() {
  const cv = document.getElementById('wr-sig');
  if (cv && _sigCtx) { _sigCtx.clearRect(0, 0, cv.width, cv.height); _sigHasInk = false; }
}
window.clearSig = clearSig;

function _loadSigImage(dataUrl) {
  const cv = document.getElementById('wr-sig');
  if (!cv || !_sigCtx || !dataUrl) return;
  const img = new Image();
  img.onload = () => { _sigCtx.drawImage(img, 0, 0, cv.clientWidth || 300, 140); _sigHasInk = true; };
  img.src = dataUrl;
}

function _getSigData() {
  const cv = document.getElementById('wr-sig');
  if (!cv || !_sigHasInk) return '';
  return cv.toDataURL('image/png');
}

// ── רשימת בחירת לקוח ─────────────────────────────────────────────────────────
function _fillWRCustSelect(selected) {
  // בורר הלקוח החכם (PICK-wr-cust) מאותחל ב-main.js; כאן רק קובעים את הערך הנבחר
  if (window.setCustPicker) window.setCustPicker('PICK-wr-cust', selected || '');
  else { const h = document.getElementById('wr-cust'); if (h) h.value = selected || ''; }
}

export function wrToggleGuest() {
  const v = document.getElementById('wr-cust').value;
  document.getElementById('wr-guest-fields').style.display = v === '__guest__' ? 'block' : 'none';
}
window.wrToggleGuest = wrToggleGuest;

function _teamUsers() {
  return (window.cfg && window.cfg.users && window.cfg.users.length)
    ? window.cfg.users : [{ name: 'אופיר' }, { name: 'רז' }, { name: 'גלאל' }, { name: 'מוטי' }];
}

// ── מילוי בורר טכנאי ─────────────────────────────────────────────────────────
function _fillTechSelect(selected) {
  const sel = document.getElementById('wr-tech');
  if (!sel) return;
  const users = _teamUsers();
  sel.innerHTML = users.map(u => `<option value="${u.name}">${u.name}</option>`).join('');
  sel.value = selected || window._currentUser || users[0]?.name || '';
}

// ── מילוי תיבות סימון של עובדים נוספים ───────────────────────────────────────
function _fillTeamChecks(selectedArr) {
  const box = document.getElementById('wr-team-list');
  if (!box) return;
  const sel = new Set(selectedArr || []);
  box.innerHTML = _teamUsers().map(u => `
    <label style="display:flex;align-items:center;gap:6px;font-size:13px;background:var(--sur2);padding:6px 10px;border-radius:8px;cursor:pointer">
      <input type="checkbox" class="wr-team-cb" value="${u.name}" ${sel.has(u.name) ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer">
      ${u.name}
    </label>`).join('');
}

function _readTeam() {
  return [...document.querySelectorAll('#wr-team-list .wr-team-cb:checked')].map(cb => cb.value);
}

// ── תצוגת רשימה ──────────────────────────────────────────────────────────────
export function renderWorkReports() {
  const q = (document.getElementById('q-wreports')?.value || '').toLowerCase();

  let list = (window.wreports || []).filter(r => {
    const c = window.custs.find(x => x.id === r.custId);
    const name = c ? c.name : (r.guestName || '');
    if (q && !name.toLowerCase().includes(q) && !(r.workDesc || '').toLowerCase().includes(q) && !(r.techName || '').toLowerCase().includes(q)) return false;
    return true;
  }).sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0));

  const cnt = document.getElementById('cnt-wreports');
  if (cnt) cnt.textContent = list.length + ' דוחות';

  const el = document.getElementById('list-wreports');
  if (!el) return;

  if (!list.length) {
    el.innerHTML = '<div style="text-align:center;padding:50px;color:var(--tx3)">📋<br><br>אין דוחות עבודה להצגה</div>';
    return;
  }

  el.innerHTML = '<div class="fg-grid">' + list.map(r => {
    const c = window.custs.find(x => x.id === r.custId);
    const custName = c ? c.name : (r.guestName ? r.guestName + ' (מזדמן)' : 'לקוח מזדמן');
    const eqCount = (r.equipment || []).length;
    const eqSummary = (r.equipment || []).slice(0, 3).map(e => `${e.name}${e.qty > 1 ? ' ×' + e.qty : ''}`).join(', ')
      + (eqCount > 3 ? ' …' : '');
    const paidCls = r.paid === 'yes' ? 'bg' : r.paid === 'partial' ? 'by' : 'br';
    const paidLbl = r.paid === 'yes' ? '✅ שולם' : r.paid === 'partial' ? '🟡 חלקי' : '🔴 לא שולם';

    return `<div class="fc" onclick="window.editWReportById('${r.id}')">
      <div class="fch"><div class="ci">
        <div class="av" style="background:${avClr(custName)};width:28px;height:28px;font-size:10px">${ini(custName)}</div>
        <div>
          <div style="font-weight:700;font-size:13px">${custName}</div>
          <div style="font-size:11px;color:var(--tx3)">📅 ${fmtD(r.date)}${r.hours ? ' · ⏱ ' + _fmtHours(r.hours) : ''}</div>
        </div></div>
        <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
          ${r.amount > 0 ? `<span class="badge ${paidCls}">₪${Number(r.amount).toLocaleString('he-IL')}</span>` : ''}
        </div>
      </div>
      <div class="fdesc" style="font-size:13px;margin-bottom:6px">${(r.workDesc || '').slice(0, 120) || '—'}</div>
      ${eqCount ? `<div style="font-size:11px;color:var(--tx2);background:rgba(0,0,0,0.15);padding:6px 10px;border-radius:6px;border-right:2px solid var(--acc)"><b>🔌 ציוד (${eqCount}):</b> ${eqSummary}</div>` : ''}
      <div class="fmeta" style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;gap:6px">
        <span style="font-size:11px;color:var(--tx3)">👷 ${r.techName || '—'}${(r.team && r.team.length) ? ' + ' + r.team.join(', ') : ''}${r.signature ? ' · ✍️ חתום' : ''}</span>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="btn bs btn-sm" onclick="event.stopPropagation();window.editWReportById('${r.id}')" title="ערוך">✏️</button>
          <button class="btn bs btn-sm" onclick="event.stopPropagation();window.exportWReportPDF('${r.id}')" title="PDF">🖨️</button>
          <button class="btn bd btn-sm" onclick="event.stopPropagation();window.delWReportById('${r.id}')" title="מחק">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('') + '</div>';
}

// ── פתיחת דוח חדש ────────────────────────────────────────────────────────────
export function openNewWReport(preCustId) {
  _eWR = null;
  document.getElementById('M-wreport-title').textContent = 'דוח עבודה חדש';
  document.getElementById('wr-del').style.display = 'none';

  _fillWRCustSelect(preCustId || '');
  _fillTechSelect('');
  _fillTeamChecks([]);
  document.getElementById('wr-guest-fields').style.display = 'none';
  document.getElementById('wr-guest-name').value  = '';
  document.getElementById('wr-guest-phone').value = '';
  document.getElementById('wr-date').value   = today();
  document.getElementById('wr-start').value  = '';
  document.getElementById('wr-end').value    = '';
  document.getElementById('wr-workdesc').value = '';
  document.getElementById('wr-amount').value = '';
  document.getElementById('wr-vat').checked  = false;
  document.getElementById('wr-paid').value   = 'no';
  document.getElementById('wr-signer').value = '';
  document.getElementById('wr-notes').value  = '';
  document.getElementById('wr-equip-list').innerHTML = '';
  addEquipRow('', '');

  openM('M-wreport');
  setTimeout(() => { _initSigPad(); clearSig(); wrUpdateHours(); }, 120);
}
window.openNewWReport = openNewWReport;

// ── עריכת דוח קיים ───────────────────────────────────────────────────────────
export function editWReportById(id) {
  const r = (window.wreports || []).find(x => x.id === id);
  if (!r) return;
  _eWR = id;
  document.getElementById('M-wreport-title').textContent = 'עריכת דוח עבודה';
  document.getElementById('wr-del').style.display = '';

  const isGuest = !r.custId && r.guestName;
  _fillWRCustSelect(isGuest ? '__guest__' : (r.custId || ''));
  _fillTechSelect(r.techName);
  _fillTeamChecks(r.team || []);
  document.getElementById('wr-guest-fields').style.display = isGuest ? 'block' : 'none';
  document.getElementById('wr-guest-name').value  = r.guestName  || '';
  document.getElementById('wr-guest-phone').value = r.guestPhone || '';
  document.getElementById('wr-date').value    = r.date  || today();
  document.getElementById('wr-start').value   = r.startTime || '';
  document.getElementById('wr-end').value     = r.endTime   || '';
  document.getElementById('wr-workdesc').value = r.workDesc || '';
  document.getElementById('wr-amount').value  = r.baseAmount !== undefined ? r.baseAmount : (r.amount || '');
  document.getElementById('wr-vat').checked   = r.hasVat || false;
  document.getElementById('wr-paid').value    = r.paid  || 'no';
  document.getElementById('wr-signer').value  = r.signerName || '';
  document.getElementById('wr-notes').value   = r.notes || '';

  const list = document.getElementById('wr-equip-list');
  list.innerHTML = '';
  if (r.equipment && r.equipment.length) r.equipment.forEach(e => addEquipRow(e.name, e.qty));
  else addEquipRow('', '');

  openM('M-wreport');
  setTimeout(() => { _initSigPad(); clearSig(); if (r.signature) _loadSigImage(r.signature); wrUpdateHours(); }, 120);
}
window.editWReportById = editWReportById;

// ── שמירה ────────────────────────────────────────────────────────────────────
export function saveWReport() {
  const custVal = document.getElementById('wr-cust').value;
  const isGuest = custVal === '__guest__';
  const workDesc = document.getElementById('wr-workdesc').value.trim();
  const guestName  = isGuest ? document.getElementById('wr-guest-name').value.trim()  : '';
  const guestPhone = isGuest ? document.getElementById('wr-guest-phone').value.trim() : '';

  if ((!custVal && !isGuest)) { toast('בחר לקוח', 'err'); return; }
  if (isGuest && !guestName)  { toast('הזן שם לקוח מזדמן', 'err'); return; }
  if (!workDesc)              { toast('תאר את העבודה שבוצעה', 'err'); return; }

  const startTime = document.getElementById('wr-start').value;
  const endTime   = document.getElementById('wr-end').value;
  const hours     = _calcHours(startTime, endTime);

  const baseAmount  = parseFloat(document.getElementById('wr-amount').value) || 0;
  const hasVat      = document.getElementById('wr-vat').checked;
  const finalAmount = hasVat ? parseFloat((baseAmount * 1.18).toFixed(2)) : baseAmount;

  const existing = _eWR ? (window.wreports || []).find(x => x.id === _eWR) : null;

  const r = {
    id:         _eWR || uid(),
    custId:     isGuest ? '' : custVal,
    guestName:  isGuest ? guestName  : '',
    guestPhone: isGuest ? guestPhone : '',
    date:       document.getElementById('wr-date').value || today(),
    startTime, endTime, hours,
    techName:   document.getElementById('wr-tech').value || '',
    team:       _readTeam(),
    workDesc,
    equipment:  _readEquip(),
    baseAmount, hasVat, amount: finalAmount,
    paid:       document.getElementById('wr-paid').value,
    signature:  _getSigData(),
    signerName: document.getElementById('wr-signer').value.trim(),
    notes:      document.getElementById('wr-notes').value.trim(),
    updatedBy:  window._currentUser || '',
    created:    existing ? existing.created : today(),
    createdAt:  existing ? (existing.createdAt || Date.now()) : Date.now(),
  };

  if (_eWR) window.wreports = (window.wreports || []).map(x => x.id === _eWR ? r : x);
  else      (window.wreports = window.wreports || []).push(r);

  if (window._dbSaveWReports) window._dbSaveWReports([r]);

  const cName = isGuest ? guestName : (window.custs.find(c => c.id === custVal)?.name || '');
  addLog('workreport', _eWR ? 'עדכון דוח עבודה' : 'דוח עבודה חדש', cName + ' · ' + fmtD(r.date));

  closeM('M-wreport');
  renderWorkReports();
  toast(_eWR ? 'דוח עודכן ✅' : 'דוח עבודה נשמר ✅');
}
window.saveWReport = saveWReport;

// ── מחיקה ────────────────────────────────────────────────────────────────────
export async function delWReport() {
  if (!_eWR) return;
  await _doDeleteWReport(_eWR, true);
}
window.delWReport = delWReport;

// מחיקה ישירה מכרטיס ברשימה (בלי לפתוח את המודל)
export async function delWReportById(id) {
  await _doDeleteWReport(id, false);
}
window.delWReportById = delWReportById;

async function _doDeleteWReport(id, fromModal) {
  const r = (window.wreports || []).find(x => x.id === id);
  if (!r) return;
  if (!confirm('למחוק דוח עבודה זה?')) return;
  if (fromModal) closeM('M-wreport');
  toast('מוחק...');
  if (window._dbDel) await window._dbDel('workreports', id);
  window.wreports = (window.wreports || []).filter(x => x.id !== id);
  addLog('workreport', 'מחיקת דוח עבודה', id);
  renderWorkReports();
  toast('דוח נמחק ✅');
}

// ── ייצוא PDF (דרך חלון הדפסה) ───────────────────────────────────────────────
export function exportWReportPDF(id) {
  const r = (window.wreports || []).find(x => x.id === id);
  if (!r) { toast('דוח לא נמצא', 'err'); return; }

  const cfg = window.cfg || {};
  const c = window.custs.find(x => x.id === r.custId);
  const custName  = c ? c.name : (r.guestName || 'לקוח מזדמן');
  const custPhone = c ? (c.phone || '') : (r.guestPhone || '');
  const custAddr  = c ? [c.address, c.city].filter(Boolean).join(', ') : '';
  const logo = (cfg.logos && (cfg.logos.header || cfg.logos.login)) || '';
  const company = cfg.company || 'וידאו דיזיין';

  const esc = s => String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));

  const equipRows = (r.equipment || []).length
    ? r.equipment.map((e, i) => `<tr><td style="text-align:center">${i + 1}</td><td>${esc(e.name)}</td><td style="text-align:center">${e.qty || 1}</td></tr>`).join('')
    : '<tr><td colspan="3" style="text-align:center;color:#888">לא הותקן ציוד</td></tr>';

  const hoursTxt = r.hours ? _fmtHours(r.hours) : '—';
  const timeRange = (r.startTime && r.endTime) ? `${r.startTime}–${r.endTime}` : '';
  const vatLine = r.amount > 0
    ? `<div class="amount-box">
         <div>סכום לפני מע"מ: <b>₪${Number(r.baseAmount || 0).toLocaleString('he-IL')}</b></div>
         ${r.hasVat ? `<div>מע"מ 18%: <b>₪${(Number(r.amount) - Number(r.baseAmount || 0)).toLocaleString('he-IL', { maximumFractionDigits: 2 })}</b></div>` : ''}
         <div class="amount-total">סה"כ לתשלום: ₪${Number(r.amount).toLocaleString('he-IL')}</div>
         <div class="paid-tag">${r.paid === 'yes' ? '✓ שולם' : r.paid === 'partial' ? 'שולם חלקית' : 'טרם שולם'}</div>
       </div>` : '';

  const html = `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8">
<title>דוח עבודה — ${esc(custName)} — ${fmtD(r.date)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;800&display=swap');
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Heebo',Arial,sans-serif; color:#1e293b; padding:28px 32px; font-size:14px; line-height:1.5; }
  .head { display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #3b82f6; padding-bottom:14px; margin-bottom:8px; }
  .head img { max-height:70px; max-width:220px; }
  .head .co { text-align:left; }
  .head .co h1 { font-size:22px; color:#3b82f6; font-weight:800; }
  .head .co div { font-size:12px; color:#64748b; }
  .doc-title { text-align:center; font-size:18px; font-weight:800; margin:14px 0 4px; letter-spacing:.5px; }
  .doc-sub { text-align:center; font-size:12px; color:#64748b; margin-bottom:18px; }
  .grid2 { display:flex; gap:16px; margin-bottom:16px; }
  .card { flex:1; border:1px solid #e2e8f0; border-radius:10px; padding:12px 14px; background:#f8fafc; }
  .card h3 { font-size:12px; color:#3b82f6; margin-bottom:8px; text-transform:uppercase; letter-spacing:.5px; }
  .row { display:flex; justify-content:space-between; padding:3px 0; font-size:13px; }
  .row span:first-child { color:#64748b; }
  .row span:last-child { font-weight:600; }
  .section { margin-bottom:16px; }
  .section h2 { font-size:14px; font-weight:700; padding:6px 12px; background:#3b82f6; color:#fff; border-radius:8px 8px 0 0; }
  .section .body { border:1px solid #e2e8f0; border-top:none; border-radius:0 0 8px 8px; padding:12px 14px; white-space:pre-wrap; }
  table { width:100%; border-collapse:collapse; }
  table th { background:#eef2f7; font-size:12px; padding:8px; border:1px solid #e2e8f0; }
  table td { padding:7px 8px; border:1px solid #e2e8f0; font-size:13px; }
  .amount-box { border:1px solid #e2e8f0; border-radius:8px; padding:12px 14px; background:#f0f9ff; max-width:280px; margin-right:auto; }
  .amount-box div { padding:2px 0; font-size:13px; }
  .amount-total { font-size:16px; font-weight:800; color:#1e293b; border-top:1px dashed #94a3b8; margin-top:6px; padding-top:6px!important; }
  .paid-tag { display:inline-block; margin-top:6px; font-size:12px; font-weight:700; }
  .sign-area { display:flex; justify-content:space-between; align-items:flex-end; margin-top:26px; gap:30px; }
  .sign-box { flex:1; }
  .sign-box .line { border-top:1.5px solid #1e293b; margin-top:6px; padding-top:4px; font-size:12px; color:#64748b; }
  .sign-box img { max-height:90px; max-width:240px; display:block; }
  .footer { margin-top:30px; text-align:center; font-size:11px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:10px; }
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
  <div class="doc-title">דוח עבודה / שירות</div>
  <div class="doc-sub">תאריך: ${fmtD(r.date)}${timeRange ? ' · שעות: ' + timeRange : ''}</div>

  <div class="grid2">
    <div class="card">
      <h3>פרטי לקוח</h3>
      <div class="row"><span>שם:</span><span>${esc(custName)}</span></div>
      ${custPhone ? `<div class="row"><span>טלפון:</span><span>${esc(custPhone)}</span></div>` : ''}
      ${custAddr ? `<div class="row"><span>כתובת:</span><span>${esc(custAddr)}</span></div>` : ''}
    </div>
    <div class="card">
      <h3>פרטי עבודה</h3>
      <div class="row"><span>טכנאי אחראי:</span><span>${esc(r.techName || '—')}</span></div>
      ${(r.team && r.team.length) ? `<div class="row"><span>עבדו גם:</span><span>${esc(r.team.join(', '))}</span></div>` : ''}
      <div class="row"><span>תאריך:</span><span>${fmtD(r.date)}</span></div>
      ${timeRange ? `<div class="row"><span>שעות עבודה:</span><span>${timeRange}</span></div>` : ''}
      <div class="row"><span>סה"כ זמן:</span><span>${hoursTxt}</span></div>
    </div>
  </div>

  <div class="section">
    <h2>תיאור העבודה שבוצעה</h2>
    <div class="body">${esc(r.workDesc) || '—'}</div>
  </div>

  <div class="section">
    <h2>ציוד שהותקן</h2>
    <div class="body" style="padding:0">
      <table>
        <thead><tr><th style="width:48px">#</th><th>פריט</th><th style="width:80px">כמות</th></tr></thead>
        <tbody>${equipRows}</tbody>
      </table>
    </div>
  </div>

  ${r.notes ? `<div class="section"><h2>הערות</h2><div class="body">${esc(r.notes)}</div></div>` : ''}

  ${vatLine}

  <div class="sign-area">
    <div class="sign-box">
      ${r.signature ? `<img src="${r.signature}" alt="חתימה">` : '<div style="height:90px"></div>'}
      <div class="line">חתימת הלקוח${r.signerName ? ' — ' + esc(r.signerName) : ''}</div>
    </div>
    <div class="sign-box">
      <div style="height:90px"></div>
      <div class="line">חתימת נציג ${esc(company)}</div>
    </div>
  </div>

  <div class="footer">הופק ממערכת ${esc(company)} · ${fmtD(today())}</div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 350); };<\/script>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) { toast('חסום ע"י חוסם חלונות קופצים', 'err'); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
window.exportWReportPDF = exportWReportPDF;
