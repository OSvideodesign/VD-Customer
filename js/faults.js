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
    if (q && !(c ? c.name : '').toLowerCase().includes(q) && !(f.desc || '').toLowerCase().includes(q)) return false;
    if (sf && f.status !== sf) return false;
    return true;
  }).sort((a, b) => ({ urgent: 0, high: 1, medium: 2, low: 3 }[a.priority || 'medium'] - { urgent: 0, high: 1, medium: 2, low: 3 }[b.priority || 'medium']));

  document.getElementById('cnt-faults').textContent = list.length + ' משימות';
  const el = document.getElementById('list-faults');
  if (!list.length) { el.innerHTML = '<div style="text-align:center;padding:50px;color:var(--tx3)">🔧<br><br>אין משימות</div>'; return; }

  el.innerHTML = '<div class="fg-grid">' + list.map(f => {
    const c = window.custs.find(x => x.id === f.custId);
    const custName = c ? c.name : (f.guestName || 'לא ידוע');
    const uClr = name => { const u = USERS.find(x => x.name === name); return u ? u.color : 'var(--tx2)'; };
    const cbHtml  = _selectMode ? `<input type="checkbox" class="fc-cb" onclick="event.stopPropagation();window._toggleSelect('${f.id}',this)" ${_selectedIds.has(f.id) ? 'checked' : ''}>` : '';
    const fcClick = _selectMode ? `window._toggleSelect('${f.id}',this.querySelector('.fc-cb'))` : `window._editFaultById('${f.id}')`;
    
    return `<div class="fc ${_selectMode && _selectedIds.has(f.id) ? 'selected' : ''}" onclick="${fcClick}">${cbHtml}
      <div class="fch"><div class="ci">
        <div class="av" style="background:${avClr(custName)};width:28px;height:28px;font-size:10px">${ini(custName)}</div>
        <div style="font-weight:700;font-size:13px">${custName}</div></div>
        <span class="badge ${SMAP[f.status || 'open']}">${SLBL[f.status || 'open']}</span>
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

export async function saveFault() {
  const custVal  = document.getElementById('mf-cust').value;
  const isGuest  = custVal === '__guest__';
  const desc     = document.getElementById('mf-desc').value.trim();
  if ((!custVal && !isGuest) || !desc) { toast('מלא שדות חובה', 'err'); return; }

  const f = {
    id: _eFault || uid(),
    custId: isGuest ? '' : custVal,
    guestName: isGuest ? document.getElementById('mf-guest-name').value.trim() : '',
    guestPhone: isGuest ? document.getElementById('mf-guest-phone').value.trim() : '',
    desc,
    type: document.getElementById('mf-type').value,
    priority: document.getElementById('mf-pri').value,
    status: document.getElementById('mf-status').value,
    amount: parseFloat(document.getElementById('mf-amount').value) || 0,
    amountPlusVat: document.getElementById('mf-amount-vat').checked,
    notes: document.getElementById('mf-notes').value.trim(),
    updatedBy: window._currentUser,
    created: _eFault ? (window.faults.find(x => x.id === _eFault) || {}).created : today(),
  };

  const isNew = !_eFault;
  if (_eFault) window.faults = window.faults.map(x => x.id === _eFault ? f : x);
  else window.faults.push(f);
  if (window._dbSaveFaults) await window._dbSaveFaults(window.faults);

  const c = f.custId ? window.custs.find(x => x.id === f.custId) : null;
  const custLabel = c ? c.name : f.guestName || 'לקוח מזדמן';
  
  closeM('M-fault'); renderFaults(); renderDash();
  toast('נשמר ✅');

  _broadcastPushV1(isNew ? 'חדשה' : 'עודכנה', custLabel, desc);
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

export function openNewFault(p) { _eFault=null; openM('M-fault'); }
export function editFaultById(id) { _eFault=id; openM('M-fault'); }