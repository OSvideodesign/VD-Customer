// ══ faults.js — faults / tasks page ══

import { uid, today, fmtD, avClr, ini, toast } from './utils.js';
import { openM, closeM } from './nav.js';
import { addLog } from './log.js';
import { renderDash } from './dashboard.js';

let _eFault      = null;
let _selectMode  = false;
let _selectedIds = new Set();

export function renderFaults() {
  const q  = (document.getElementById('q-faults')?.value || '').toLowerCase();

  const TMAP = { fault: '🔧 משימה', meeting: '🤝 פגישה', service: '🛠️ שירות', installation: '📦 המשך התקנה', other: '📋 אחר' };
  const PMAP = { urgent: '🚨 דחוף', high: '🔴 גבוהה', medium: '🟡 בינונית', low: '🟢 נמוכה' };
  const SMAP = { open: 'br', scheduled: 'bb', done: 'bg' };
  const SLBL = { open: '🔴 פתוחה', scheduled: '📅 נקבע תאריך', done: '✅ טופלה' };

  let list = window.faults.filter(f => {
    if (f.status === 'done') return false;
    const c = window.custs.find(x => x.id === f.custId);
    if (q && !(c ? c.name : '').toLowerCase().includes(q) && !(f.desc || '').toLowerCase().includes(q) && !(f.guestName || '').toLowerCase().includes(q)) return false;
    return true;
  }).sort((a, b) => ({ urgent: 0, high: 1, medium: 2, low: 3 }[a.priority || 'medium'] - { urgent: 0, high: 1, medium: 2, low: 3 }[b.priority || 'medium']));

  document.getElementById('cnt-faults').textContent = list.length + ' משימות';
  const el = document.getElementById('list-faults');
  
  if (!list.length) {
    el.innerHTML = '<div style="text-align:center;padding:50px;color:var(--tx3)">🔧<br><br>אין משימות להצגה</div>';
    return;
  }

  el.innerHTML = '<div class="fg-grid">' + list.map(f => {
    const c = window.custs.find(x => x.id === f.custId);
    const custName = c ? c.name : (f.guestName ? f.guestName + '👤' : 'לא ידוע');
    
    // ── פיצ'ר מי היה אצל הלקוח פעם אחרונה ──
    const past = window.faults.filter(x => x.custId === f.custId && x.status === 'done' && x.date < (f.date || '9999')).sort((a,b) => b.date.localeCompare(a.date))[0];
    const techName = past ? (past.assignedTo || past.updatedBy || 'איש צוות') : '';
    const lastVisitHtml = past ? `<div style="margin-top:8px; padding:6px 10px; background:rgba(0,0,0,0.15); border-radius:6px; font-size:11px; color:var(--tx2); border-right:2px solid var(--acc);"><b>🕒 טיפול קודם ב-${fmtD(past.date)} (ע"י ${techName}):</b> ${past.desc}</div>` : '';

    const cbHtml  = _selectMode ? `<input type="checkbox" class="fc-cb" onclick="event.stopPropagation();window._toggleSelect('${f.id}',this)">` : '';
    const fcClick = _selectMode ? `window._toggleSelect('${f.id}',this.querySelector('.fc-cb'))` : `window.editFaultById('${f.id}')`;
    
    return `<div class="fc" onclick="${fcClick}">${cbHtml}
      <div class="fch"><div class="ci">
        <div class="av" style="background:${avClr(custName)};width:28px;height:28px;font-size:10px">${ini(custName)}</div>
        <div>
           <div style="font-weight:700;font-size:13px">${custName}</div>
           ${c && c.phone ? `<div style="font-size:11px;color:var(--tx3)">${c.phone}</div>` : f.guestPhone ? `<div style="font-size:11px;color:var(--tx3)">${f.guestPhone}</div>` : ''}
        </div></div>
        <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
          <span class="badge ${SMAP[f.status || 'open']}">${SLBL[f.status || 'open']}</span>
        </div>
      </div>
      <div style="font-size:11px;color:var(--tx3);margin-bottom:4px">${TMAP[f.type || 'fault'] || '🔧 משימה'}
        ${f.amount > 0 ? ' &nbsp;|&nbsp; 💰 ₪' + f.amount.toLocaleString('he-IL') : ''}
      </div>
      <div class="fdesc" style="font-size:13px;">${f.desc || ''}</div>
      ${lastVisitHtml}
      <div class="fmeta" style="margin-top:8px;">
        <span>${PMAP[f.priority || 'medium']}</span>
        ${f.date ? `<span style="color:var(--acc)">📅 ${fmtD(f.date)}${f.time ? ' ' + f.time : ''}</span>` : ''}
      </div>
    </div>`;
  }).join('') + '</div>';
}

export function openNewFault(preCustId) {
  _eFault = null;
  document.getElementById('M-fault-title').textContent = 'רשומה חדשה (משימה/פגישה)';
  document.getElementById('mf-del').style.display = 'none';
  _fillCustSelect(preCustId || '');
  
  document.getElementById('mf-guest-fields').style.display = 'none';
  document.getElementById('mf-guest-name').value  = '';
  document.getElementById('mf-guest-phone').value = '';
  document.getElementById('mf-type').value    = 'fault';
  document.getElementById('mf-desc').value    = '';
  document.getElementById('mf-pri').value     = 'medium';
  document.getElementById('mf-color').value   = ''; 
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
  document.getElementById('M-fault-title').textContent = 'עריכת רשומה';
  document.getElementById('mf-del').style.display = '';
  
  const isGuest = !f.custId && f.guestName;
  _fillCustSelect(isGuest ? '__guest__' : (f.custId || ''));
  
  document.getElementById('mf-guest-fields').style.display = isGuest ? 'block' : 'none';
  document.getElementById('mf-guest-name').value  = f.guestName  || '';
  document.getElementById('mf-guest-phone').value = f.guestPhone || '';
  document.getElementById('mf-type').value    = f.type     || 'fault';
  document.getElementById('mf-desc').value    = f.desc     || '';
  document.getElementById('mf-pri').value     = f.priority || 'medium';
  document.getElementById('mf-color').value   = f.color    || ''; 
  document.getElementById('mf-status').value  = f.status   || 'open';
  document.getElementById('mf-date').value    = f.date     || '';
  document.getElementById('mf-time').value    = f.time     || '';
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
  if ((!custVal && !isGuest) || !desc) { toast('בחר לקוח ותאר את המשימה', 'err'); return; }

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
    color:       document.getElementById('mf-color').value, 
    status:      document.getElementById('mf-status').value,
    date:        document.getElementById('mf-date').value,
    time:        document.getElementById('mf-time').value,
    amount:      finalAmount, 
    baseAmount:  baseAmount,  
    hasVat:      hasVat,      
    paid:        document.getElementById('mf-paid').value,
    notes:       document.getElementById('mf-notes').value.trim(),
    updatedBy:   window._currentUser || '',
    created:     _eFault ? (window.faults.find(x => x.id === _eFault) || {}).created : today(),
  };

  if (_eFault) window.faults = window.faults.map(x => x.id === _eFault ? f : x);
  else         window.faults.push(f);
  if (window._dbSaveFaults) window._dbSaveFaults(window.faults);

  closeM('M-fault');
  renderFaults(); renderDash(); 
  if(window.fetchWk) window.fetchWk();
  toast(_eFault ? 'רשומה עודכנה ✅' : 'רשומה נוספה ✅');
}

export async function delFault() {
  if (!confirm('למחוק רשומה זו?')) return;
  const id = _eFault;
  closeM('M-fault');
  toast('מוחק...');
  if (window._dbDel) await window._dbDel('faults', id);
  window.faults = window.faults.filter(x => x.id !== id);
  renderFaults(); renderDash(); 
  if(window.fetchWk) window.fetchWk();
}

export function toggleSelectMode(on) {
  _selectMode = on; _selectedIds.clear();
  const pg = document.getElementById('pg-faults');
  if(on) { pg?.classList.add('select-mode'); document.getElementById('select-mode-btn').style.display='none'; }
  else { pg?.classList.remove('select-mode'); document.getElementById('select-mode-btn').style.display=''; document.getElementById('bulk-bar').classList.remove('show'); }
  renderFaults();
}

export function toggleSelect(id, el) {
  if (_selectedIds.has(id)) { _selectedIds.delete(id); el.checked=false; }
  else { _selectedIds.add(id); el.checked=true; }
  const count = _selectedIds.size;
  document.getElementById('bulk-count').textContent = count + ' נבחרו';
  document.getElementById('bulk-bar').classList[count > 0 ? 'add' : 'remove']('show');
}

export async function deleteSelected() {
  if (_selectedIds.size === 0) return;
  if (!confirm('למחוק ' + _selectedIds.size + ' רשומות?')) return;
  const ids = [..._selectedIds];
  const ok = window._dbDelMulti ? await window._dbDelMulti('faults', ids) : true;
  window.faults = window.faults.filter(f => !ids.includes(f.id));
  toggleSelectMode(false);
  renderFaults(); renderDash(); 
  if(window.fetchWk) window.fetchWk();
}

// חשיפה ל-main.js כבקשת המנוע המקורי שלך
export function requestNotificationPermission() {}