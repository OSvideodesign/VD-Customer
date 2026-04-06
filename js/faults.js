// ══ faults.js — faults / tasks page ══

import { USERS } from './config.js';
import { uid, today, fmtD, avClr, ini, toast } from './utils.js';
import { openM, closeM } from './nav.js';
import { addLog } from './log.js';
import { renderDash } from './dashboard.js';
import { renderArchive } from './archive.js';

let _eFault      = null;
let _selectMode  = false;
let _selectedIds = new Set();

// ── render ─────────────────────────────────────────────────────────────────
export function renderFaults() {
  const q  = (document.getElementById('q-faults')?.value || '').toLowerCase();
  const sf = document.getElementById('f-fstatus')?.value || '';

  const TMAP = { fault: '🔧 משימה', service: '🛠️ שירות', installation: '📦 המשך התקנה', other: '📋 אחר' };
  const PMAP = { urgent: '🚨 דחוף', high: '🔴 גבוהה', medium: '🟡 בינונית', low: '🟢 נמוכה' };
  const SMAP = { open: 'br', scheduled: 'bb', done: 'bg' };
  const SLBL = { open: '🔴 פתוחה', scheduled: '📅 נקבע תאריך', done: '✅ טופלה' };

  let list = window.faults.filter(f => {
    if (f.status === 'done') return false;
    const c = window.custs.find(x => x.id === f.custId);
    if (q && !(c ? c.name : '').toLowerCase().includes(q) && !(f.desc || '').toLowerCase().includes(q) && !(f.guestName || '').toLowerCase().includes(q)) return false;
    if (sf && f.status !== sf) return false;
    return true;
  }).sort((a, b) => ({ urgent: 0, high: 1, medium: 2, low: 3 }[a.priority || 'medium'] - { urgent: 0, high: 1, medium: 2, low: 3 }[b.priority || 'medium']));

  document.getElementById('cnt-faults').textContent = list.length + ' משימות';
  const el = document.getElementById('list-faults');
  if (!list.length) {
    el.innerHTML = '<div style="text-align:center;padding:50px;color:var(--tx3)">🔧<br><br>אין משימות</div>';
    return;
  }

  el.innerHTML = '<div class="fg-grid">' + list.map(f => {
    const c = window.custs.find(x => x.id === f.custId);
    const custName = c ? c.name : (f.guestName ? f.guestName + '👤' : 'לא ידוע');
    const uClr = name => { const u = USERS.find(x => x.name === name); return u ? u.color : 'var(--tx2)'; };
    const cbHtml  = _selectMode ? `<input type="checkbox" class="fc-cb" onclick="event.stopPropagation();window._toggleSelect('${f.id}',this)" ${_selectedIds.has(f.id) ? 'checked' : ''}>` : '';
    const fcClick = _selectMode ? `window._toggleSelect('${f.id}',this.querySelector('.fc-cb'))` : `window._editFaultById('${f.id}')`;
    return `<div class="fc ${_selectMode && _selectedIds.has(f.id) ? 'selected' : ''}" onclick="${fcClick}">${cbHtml}
      <div class="fch"><div class="ci">
        <div class="av" style="background:${avClr(custName)};width:28px;height:28px;font-size:10px">${ini(custName)}</div>
        <div><div style="font-weight:700;font-size:13px">${custName}</div>
        ${c && c.phone ? `<div style="font-size:11px;color:var(--tx3)">${c.phone}</div>` : f.guestPhone ? `<div style="font-size:11px;color:var(--tx3)">${f.guestPhone}</div>` : ''}</div></div>
        <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
          <span class="badge ${SMAP[f.status || 'open']}">${SLBL[f.status || 'open']}</span>
          ${f.date ? `<button class="btn bs btn-sm" onclick="event.stopPropagation();window._gcalFault('${f.id}')">📅</button>` : ''}
        </div>
      </div>
      <div style="font-size:11px;color:var(--tx3);margin-bottom:4px">${TMAP[f.type || 'fault'] || '🔧 משימה'}
        ${f.amount > 0 ? ' &nbsp;|&nbsp; 💰 ₪' + f.amount.toLocaleString('he-IL') + (f.hasVat ? ' <span style="color:var(--tx2)">(כולל מע"מ)</span>' : '') + (f.paid === 'yes' ? ' ✅' : f.paid === 'partial' ? ' (חלקי)' : '') : ''}
      </div>
      <div class="fdesc">${f.desc || ''}</div>
      <div class="fmeta">
        <span>${PMAP[f.priority || 'medium']}</span>
        ${f.date ? `<span style="color:var(--acc)">📅 ${fmtD(f.date)}${f.time ? ' ' + f.time : ''}</span>` : ''}
        ${f.updatedBy ? `<span style="color:${uClr(f.updatedBy)}">✏️ ${f.updatedBy}</span>` : ''}
      </div>
    </div>`;
  }).join('') + '</div>';
}

// ── open/edit modals ───────────────────────────────────────────────────────
export function openNewFault(preCustId) {
  _eFault = null;
  document.getElementById('M-fault-title').textContent = 'משימה חדשה';
  document.getElementById('mf-del').style.display = 'none';
  _fillCustSelect(preCustId || '');
  document.getElementById('mf-guest-fields').style.display = 'none';
  document.getElementById('mf-guest-name').value  = '';
  document.getElementById('mf-guest-phone').value = '';
  document.getElementById('mf-type').value    = 'fault';
  document.getElementById('mf-desc').value    = '';
  document.getElementById('mf-pri').value     = 'medium';
  document.getElementById('mf-status').value  = 'open';
  document.getElementById('mf-date').value    = '';
  document.getElementById('mf-time').value    = '';
  document.getElementById('mf-amount').value  = '';
  document.getElementById('mf-vat').checked   = false;
  document.getElementById('mf-paid').value    = 'no';
  document.getElementById('mf-notes').value   = '';
  openM('M-fault');
}

export function editFaultById(id) {
  const f = window.faults.find(x => x.id === id); if (!f) return;
  _eFault = id;
  document.getElementById('M-fault-title').textContent = 'עריכת משימה';
  document.getElementById('mf-del').style.display = '';
  const isGuest = !f.custId && f.guestName;
  _fillCustSelect(isGuest ? '__guest__' : (f.custId || ''));
  document.getElementById('mf-guest-fields').style.display = isGuest ? 'block' : 'none';
  document.getElementById('mf-guest-name').value  = f.guestName  || '';
  document.getElementById('mf-guest-phone').value = f.guestPhone || '';
  document.getElementById('mf-type').value    = f.type     || 'fault';
  document.getElementById('mf-desc').value    = f.desc     || '';
  document.getElementById('mf-pri').value     = f.priority || 'medium';
  document.getElementById('mf-status').value  = f.status   || 'open';
  document.getElementById('mf-date').value    = f.date     || '';
  document.getElementById('mf-time').value    = f.time     || '';
  
  // שינוי קריטי: מציג את סכום הבסיס אם קיים, ומשחזר את הסימון של המע"מ
  document.getElementById('mf-amount').value  = f.baseAmount !== undefined ? f.baseAmount : (f.amount || '');
  document.getElementById('mf-vat').checked   = f.hasVat || false;
  
  document.getElementById('mf-paid').value    = f.paid     || 'no';
  document.getElementById('mf-notes').value   = f.notes    || '';
  openM('M-fault');
}

function _fillCustSelect(selected) {
  const sel = document.getElementById('mf-cust');
  sel.innerHTML = '<option value="">— בחר לקוח —</option>'
    + '<option value="__guest__">👤 לקוח מזדמן</option>'
    + '<option disabled style="color:var(--tx3)">──────────────</option>'
    + [...window.custs].sort((a, b) => a.name.localeCompare(b.name, 'he'))
      .map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  sel.value = selected;
}

export function toggleGuestFields() {
  const v = document.getElementById('mf-cust').value;
  document.getElementById('mf-guest-fields').style.display = v === '__guest__' ? 'block' : 'none';
}

export function saveFault() {
  const custVal  = document.getElementById('mf-cust').value;
  const isGuest  = custVal === '__guest__';
  const desc     = document.getElementById('mf-desc').value.trim();
  const guestName  = isGuest ? document.getElementById('mf-guest-name').value.trim()  : '';
  const guestPhone = isGuest ? document.getElementById('mf-guest-phone').value.trim() : '';
  if ((!custVal && !isGuest) || !desc) { toast('בחר לקוח ותאר את הבעיה', 'err'); return; }
  if (isGuest && !guestName) { toast('הכנס שם לקוח מזדמן', 'err'); return; }

  // חישוב המע"מ - שמירת סכום בסיס בנפרד מהסכום הסופי
  const baseAmount = parseFloat(document.getElementById('mf-amount').value) || 0;
  const hasVat = document.getElementById('mf-vat').checked;
  const finalAmount = hasVat ? parseFloat((baseAmount * 1.18).toFixed(2)) : baseAmount;

  const f = {
    id:          _eFault || uid(),
    custId:      isGuest ? '' : custVal,
    guestName:   isGuest ? guestName  : '',
    guestPhone:  isGuest ? guestPhone : '',
    desc,
    type:        document.getElementById('mf-type').value,
    priority:    document.getElementById('mf-pri').value,
    status:      document.getElementById('mf-status').value,
    date:        document.getElementById('mf-date').value,
    time:        document.getElementById('mf-time').value,
    amount:      finalAmount, // נשמר עם המע"מ, עבור לוח הבקרה והחובות
    baseAmount:  baseAmount,  // שומרים גם את סכום הבסיס כדי להציג נכון בעריכה עתידית
    hasVat:      hasVat,      // שומרים את הסטטוס של תיבת המע"מ
    paid:        document.getElementById('mf-paid').value,
    notes:       document.getElementById('mf-notes').value.trim(),
    updatedBy:   window._currentUser || '',
    created:     _eFault ? (window.faults.find(x => x.id === _eFault) || {}).created : today(),
  };

  if (_eFault) window.faults = window.faults.map(x => x.id === _eFault ? f : x);
  else         window.faults.push(f);
  if (window._dbSaveFaults) window._dbSaveFaults(window.faults);

  const fCust = f.custId ? window.custs.find(x => x.id === f.custId) : null;
  addLog('fault', _eFault ? 'עריכת משימה' : 'הוספת משימה',
    (fCust ? fCust.name : f.guestName || 'לקוח מזדמן') + ' — ' + (f.desc || '').slice(0, 40));

  closeM('M-fault');
  if (f.status === 'done') {
    renderFaults(); renderArchive(); renderDash();
    toast('משימה הועברה לארכיון ✅');
  } else {
    renderFaults(); renderDash();
    toast(_eFault ? 'משימה עודכנה ✅' : 'משימה נוספה ✅');
    if (!_eFault) _sendFaultNotification(f);
    if (f.date && f.status === 'scheduled') {
      setTimeout(() => { if (confirm('לפתוח Google Calendar?')) window._gcalFault(f.id); }, 400);
    }
  }
}

export async function delFault() {
  if (!confirm('למחוק משימה זו?')) return;
  const id = _eFault;
  const faultToDelete = window.faults.find(x => x.id === id);
  const fCust = faultToDelete?.custId ? window.custs.find(x => x.id === faultToDelete.custId) : null;
  const fName = fCust ? fCust.name : (faultToDelete?.guestName || 'לקוח מזדמן');
  closeM('M-fault');
  toast('מוחק...');
  if (window._dbDel) {
    const ok = await window._dbDel('faults', id);
    if (!ok) { toast('שגיאה במחיקה', 'err'); return; }
  }
  window.faults = window.faults.filter(x => x.id !== id);
  addLog('fault', 'מחיקת משימה', fName + ' — ' + (faultToDelete?.desc || '').slice(0, 40));
  renderFaults(); renderDash();
  toast('משימה נמחקה ✅');
}

// ── bulk select ────────────────────────────────────────────────────────────
export function toggleSelectMode(on) {
  _selectMode = on;
  _selectedIds.clear();
  const pg = document.getElementById('pg-faults');
  if (on) {
    pg?.classList.add('select-mode');
    document.getElementById('select-mode-btn').style.display = 'none';
  } else {
    pg?.classList.remove('select-mode');
    document.getElementById('select-mode-btn').style.display = '';
    document.getElementById('bulk-bar').classList.remove('show');
  }
  renderFaults();
}

export function toggleSelect(id, el) {
  if (_selectedIds.has(id)) {
    _selectedIds.delete(id);
    el?.closest('.fc')?.classList.remove('selected');
  } else {
    _selectedIds.add(id);
    el?.closest('.fc')?.classList.add('selected');
  }
  const count = _selectedIds.size;
  document.getElementById('bulk-count').textContent = count + ' נבחרו';
  document.getElementById('bulk-bar').classList[count > 0 ? 'add' : 'remove']('show');
}

export async function deleteSelected() {
  if (_selectedIds.size === 0) return;
  if (!confirm('למחוק ' + _selectedIds.size + ' תקלות?')) return;
  const ids = [..._selectedIds];
  toast('מוחק ' + ids.length + ' משימות...');
  const ok = window._dbDelMulti ? await window._dbDelMulti('faults', ids) : true;
  if (!ok) { toast('שגיאה במחיקה', 'err'); return; }
  window.faults = window.faults.filter(f => !ids.includes(f.id));
  addLog('fault', 'מחיקה קבוצתית', ids.length + ' משימות נמחקו');
  toggleSelectMode(false);
  renderFaults(); renderDash();
  toast(ids.length + ' משימות נמחקו ✅');
}

// ── notifications ──────────────────────────────────────────────────────────
function _sendFaultNotification(f) {
  if (!('Notification' in window)) return;
  const c    = f.custId ? window.custs.find(x => x.id === f.custId) : null;
  const name = c ? c.name : (f.guestName || 'לקוח מזדמן');
  const body = `${name} — ${(f.desc || '').slice(0, 60)}`;
  if (Notification.permission === 'granted') {
    new Notification('🔧 משימה חדשה נוספה', { body, dir: 'rtl', lang: 'he' });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then(p => {
      if (p === 'granted') new Notification('🔧 משימה חדשה נוספה', { body, dir: 'rtl', lang: 'he' });
    });
  }
}

export function requestNotificationPermission() {
  if (!('Notification' in window)) { toast('הדפדפן לא תומך בהתראות', 'err'); return; }
  Notification.requestPermission().then(p => {
    if (p === 'granted') toast('התראות הופעלו ✅');
    else toast('התראות נדחו', 'err');
  });
}