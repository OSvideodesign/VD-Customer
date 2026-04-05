// ══ faults.js — faults / tasks page ══

import { USERS, SERVICE_ACCOUNT } from './config.js';
import { uid, today, fmtD, avClr, ini, toast } from './utils.js';
import { openM, closeM } from './nav.js';
import { addLog } from './log.js';
import { renderDash } from './dashboard.js';
import { renderArchive } from './archive.js';

let _eFault      = null;
let _selectMode  = false;
let _selectedIds = new Set();

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
    const custName = c ? c.name : (f.guestName || '');
    if (q && !custName.toLowerCase().includes(q) && !(f.desc || '').toLowerCase().includes(q)) return false;
    if (sf && f.status !== sf) return false;
    return true;
  }).sort((a, b) => ({ urgent: 0, high: 1, medium: 2, low: 3 }[a.priority || 'medium'] - { urgent: 0, high: 1, medium: 2, low: 3 }[b.priority || 'medium']));

  document.getElementById('cnt-faults').textContent = list.length + ' משימות';
  const el = document.getElementById('list-faults');
  if (!list.length) { el.innerHTML = '<div style="text-align:center;padding:50px;color:var(--tx3)">🔧<br><br>אין משימות</div>'; return; }

  el.innerHTML = '<div class="fg-grid">' + list.map(f => {
    const c = window.custs.find(x => x.id === f.custId);
    const custName = c ? c.name : (f.guestName ? f.guestName + '👤' : 'לא ידוע');
    const uClr = name => { const u = USERS.find(x => x.name === name); return u ? u.color : 'var(--tx2)'; };
    const cbHtml  = _selectMode ? `<input type="checkbox" class="fc-cb" onclick="event.stopPropagation();window._toggleSelect('${f.id}',this)" ${_selectedIds.has(f.id) ? 'checked' : ''}>` : '';
    const fcClick = _selectMode ? `window._toggleSelect('${f.id}',this.querySelector('.fc-cb'))` : `window._editFaultById('${f.id}')`;
    
    let displayAmount = parseFloat(f.amount) || 0;
    if (f.amountPlusVat) displayAmount *= 1.18;

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
        ${displayAmount > 0 ? ' &nbsp;|&nbsp; 💰 ₪' + Math.round(displayAmount).toLocaleString('he-IL') : ''}
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

export function updateFaultVatNote() {
  const amtInp = document.getElementById('mf-amount');
  const vatChk = document.getElementById('mf-amount-vat');
  const noteInp = document.getElementById('mf-notes');
  const base = parseFloat(amtInp.value) || 0;
  if (base <= 0) return;
  if (vatChk.checked) {
    const total = Math.round(base * 1.18);
    const vatStr = `${base} + מע"מ = ${total} ₪`;
    if (!noteInp.value.trim() || noteInp.value.includes('+ מע"מ =')) noteInp.value = vatStr;
  } else if (noteInp.value.includes('+ מע"מ =')) {
    noteInp.value = '';
  }
}

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
  document.getElementById('mf-amount-vat').checked = false;
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
  document.getElementById('mf-amount').value  = f.amount   || '';
  document.getElementById('mf-amount-vat').checked = !!f.amountPlusVat;
  document.getElementById('mf-notes').value   = f.notes    || '';
  openM('M-fault');
}

function _fillCustSelect(selected) {
  const sel = document.getElementById('mf-cust');
  sel.innerHTML = '<option value="">— בחר לקוח —</option>'
    + '<option value="__guest__">👤 לקוח מזדמן</option>'
    + [...window.custs].sort((a, b) => a.name.localeCompare(b.name, 'he'))
      .map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  sel.value = selected;
}

export function toggleGuestFields() {
  const v = document.getElementById('mf-cust').value;
  document.getElementById('mf-guest-fields').style.display = v === '__guest__' ? 'block' : 'none';
}

export async function saveFault() {
  const custVal  = document.getElementById('mf-cust').value;
  const isGuest  = custVal === '__guest__';
  const desc     = document.getElementById('mf-desc').value.trim();
  if ((!custVal && !isGuest) || !desc) { toast('מלא שדות חובה', 'err'); return; }

  const f = {
    id:          _eFault || uid(),
    custId:      isGuest ? '' : custVal,
    guestName:   isGuest ? document.getElementById('mf-guest-name').value.trim() : '',
    guestPhone:  isGuest ? document.getElementById('mf-guest-phone').value.trim() : '',
    desc,
    type:        document.getElementById('mf-type').value,
    priority:    document.getElementById('mf-pri').value,
    status:      document.getElementById('mf-status').value,
    date:        document.getElementById('mf-date').value,
    time:        document.getElementById('mf-time').value,
    amount:      parseFloat(document.getElementById('mf-amount').value) || 0,
    amountPlusVat: document.getElementById('mf-amount-vat').checked,
    notes:       document.getElementById('mf-notes').value.trim(),
    updatedBy:   window._currentUser || '',
    created:     _eFault ? (window.faults.find(x => x.id === _eFault) || {}).created : today(),
  };

  const isNew = !_eFault;
  if (_eFault) window.faults = window.faults.map(x => x.id === _eFault ? f : x);
  else         window.faults.push(f);
  if (window._dbSaveFaults) await window._dbSaveFaults(window.faults);

  const fCust = f.custId ? window.custs.find(x => x.id === f.custId) : null;
  const custLabel = fCust ? fCust.name : f.guestName || 'לקוח מזדמן';
  addLog('fault', isNew ? 'הוספת משימה' : 'עריכת משימה', custLabel + ' — ' + (f.desc || '').slice(0, 40));

  closeM('M-fault');
  renderFaults(); renderDash();
  toast(isNew ? 'משימה נוספה ✅' : 'משימה עודכנה ✅');

  _broadcastPushV1(isNew ? 'חדשה' : 'עודכנה', custLabel, f.desc);
}

async function _broadcastPushV1(action, custLabel, desc) {
    const title = `🔧 משימה ${action} - ${window._currentUser}`;
    const body = `${custLabel}: ${desc.substring(0, 50)}`;
    const allTokens = [];
    USERS.forEach(u => { if (u.name !== window._currentUser && u.tokens) allTokens.push(...u.tokens); });

    if (allTokens.length === 0) return;

    allTokens.forEach(async (token) => {
        try {
            await fetch(`https://fcm.googleapis.com/v1/projects/${SERVICE_ACCOUNT.projectId}/messages:send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: {
                        token: token,
                        notification: { title, body },
                        data: { url: '/Client-PRO/' }
                    }
                })
            });
        } catch (e) { console.warn("Push failed", e); }
    });
}

export async function delFault() {
  if (!confirm('למחוק משימה זו?')) return;
  const id = _eFault;
  closeM('M-fault');
  if (window._dbDel) await window._dbDel('faults', id);
  window.faults = window.faults.filter(x => x.id !== id);
  renderFaults(); renderDash();
  toast('משימה נמחקה ✅');
}

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
  if (_selectedIds.has(id)) { _selectedIds.delete(id); el?.closest('.fc')?.classList.remove('selected'); }
  else { _selectedIds.add(id); el?.closest('.fc')?.classList.add('selected'); }
  const count = _selectedIds.size;
  document.getElementById('bulk-count').textContent = count + ' נבחרו';
  document.getElementById('bulk-bar').classList[count > 0 ? 'add' : 'remove']('show');
}

export async function deleteSelected() {
  if (_selectedIds.size === 0) return;
  if (!confirm('למחוק ' + _selectedIds.size + ' תקלות?')) return;
  const ids = [..._selectedIds];
  const ok = window._dbDelMulti ? await window._dbDelMulti('faults', ids) : true;
  if (!ok) { toast('שגיאה במחיקה', 'err'); return; }
  window.faults = window.faults.filter(f => !ids.includes(f.id));
  toggleSelectMode(false); renderFaults(); renderDash();
  toast(ids.length + ' משימות נמחקו ✅');
}

export function requestNotificationPermission() {
  if (!('Notification' in window)) { toast('לא נתמך', 'err'); return; }
  Notification.requestPermission().then(async p => {
    if (p === 'granted') {
        toast('מנסה להפעיל...');
        if (window._registerPushToken) {
            const ok = await window._registerPushToken();
            if (ok) toast('התראות הופעלו ✅');
            else toast('הרשאה ניתנה, אך הרישום נכשל', 'err');
        }
    }
  });
}