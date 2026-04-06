// ══ faults.js — faults / tasks page ══

import { USERS } from './config.js';
import { uid, today, fmtD, avClr, ini, toast } from './utils.js';
import { openM, closeM } from './nav.js';
import { addLog } from './log.js';

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
  if (!el) return;
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
        </div>
      </div>
      <div style="font-size:11px;color:var(--tx3);margin-bottom:4px">${TMAP[f.type || 'fault'] || '🔧 משימה'}
        ${f.amount > 0 ? ' &nbsp;|&nbsp; 💰 ₪' + f.amount.toLocaleString('he-IL') + (f.hasVat ? ' <span style="color:var(--tx2)">(כולל מע"מ)</span>' : '') + (f.paid === 'yes' ? ' ✅' : f.paid === 'partial' ? ' (חלקי)' : '') : ''}
      </div>
      <div class="fdesc">${f.desc || ''}</div>
      <div class="fmeta">
        <span>${PMAP[f.priority || 'medium']}</span>
        ${f.date ? `<span style="color:var(--acc)">📅 ${fmtD(f.date)}</span>` : ''}
        ${f.updatedBy ? `<span style="color:${uClr(f.updatedBy)}">✏️ ${f.updatedBy}</span>` : ''}
      </div>
    </div>`;
  }).join('') + '</div>';
}

// ── open/edit/save ──
export function openNewFault(preCustId) {
  _eFault = null;
  document.getElementById('M-fault-title').textContent = 'משימה חדשה';
  document.getElementById('mf-del').style.display = 'none';
  _fillCustSelect(preCustId || '');
  document.getElementById('mf-amount').value = '';
  document.getElementById('mf-vat').checked = false;
  document.getElementById('mf-desc').value = '';
  openM('M-fault');
}

export function editFaultById(id) {
  const f = window.faults.find(x => x.id === id); if (!f) return;
  _eFault = id;
  document.getElementById('M-fault-title').textContent = 'עריכת משימה';
  document.getElementById('mf-del').style.display = '';
  _fillCustSelect(f.custId || (f.guestName ? '__guest__' : ''));
  document.getElementById('mf-amount').value  = f.baseAmount !== undefined ? f.baseAmount : (f.amount || '');
  document.getElementById('mf-vat').checked   = f.hasVat || false;
  document.getElementById('mf-desc').value = f.desc || '';
  openM('M-fault');
}

function _fillCustSelect(selected) {
  const sel = document.getElementById('mf-cust');
  if (!sel) return;
  sel.innerHTML = '<option value="">— בחר לקוח —</option>'
    + '<option value="__guest__">👤 לקוח מזדמן</option>'
    + [...window.custs].sort((a, b) => a.name.localeCompare(b.name, 'he'))
      .map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  sel.value = selected;
}

export function saveFault() {
  const custVal  = document.getElementById('mf-cust').value;
  const desc     = document.getElementById('mf-desc').value.trim();
  if (!custVal || !desc) { toast('בחר לקוח ותאר את המשימה', 'err'); return; }

  const baseAmount = parseFloat(document.getElementById('mf-amount').value) || 0;
  const hasVat = document.getElementById('mf-vat').checked;
  const finalAmount = hasVat ? parseFloat((baseAmount * 1.18).toFixed(2)) : baseAmount;

  const f = {
    id:          _eFault || uid(),
    custId:      custVal,
    desc,
    amount:      finalAmount, 
    baseAmount:  baseAmount,  
    hasVat:      hasVat,      
    status:      document.getElementById('mf-status').value,
    updatedBy:   window._currentUser || '',
    created:     _eFault ? (window.faults.find(x => x.id === _eFault) || {}).created : today(),
  };

  if (_eFault) window.faults = window.faults.map(x => x.id === _eFault ? f : x);
  else         window.faults.push(f);
  
  if (window._dbSaveFaults) window._dbSaveFaults(window.faults);
  closeM('M-fault');
  renderFaults();
  toast('נשמר בהצלחה ✅');
}

export function delFault() {
  if (!confirm('למחוק משימה זו?')) return;
  if (window._dbDel) window._dbDel('faults', _eFault);
  closeM('M-fault');
}

// ── FCM & Permissions ──
export function requestNotificationPermission() {
  // קורא לפונקציה ב-DB.JS כדי למנוע לולאת Import
  if (window._handlePushPermission) {
      window._handlePushPermission();
  }
}

export function toggleSelectMode(on) { _selectMode = on; _selectedIds.clear(); renderFaults(); }
export function toggleSelect(id, el) { 
    if (_selectedIds.has(id)) _selectedIds.delete(id); 
    else _selectedIds.add(id); 
    renderFaults(); 
}
export function toggleGuestFields() {}
export async function deleteSelected() {}