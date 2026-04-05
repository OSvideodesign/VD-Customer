// ══ log.js — audit log ══

import { USERS } from './config.js';
import { uid, fmtD, today } from './utils.js';

export function addLog(type, action, details) {
  if (!window._dbLogAdd) return;
  const entry = {
    id: uid(), type, action, details,
    user: window._currentUser || 'מערכת',
    ts: new Date().toISOString(),
  };
  window._dbLogAdd(entry);
}

export function renderLog() {
  const q  = (document.getElementById('q-log') || {}).value || '';
  const uf = (document.getElementById('f-log-user') || {}).value || '';
  const tf = (document.getElementById('f-log-type') || {}).value || '';

  let list = [...(window.logEntries || [])];
  if (q)  list = list.filter(e => (e.details || '').includes(q) || (e.action || '').includes(q) || (e.user || '').includes(q));
  if (uf) list = list.filter(e => e.user === uf);
  if (tf) list = list.filter(e => e.type === tf);
  list.sort((a, b) => b.ts.localeCompare(a.ts));

  const cnt = document.getElementById('cnt-log');
  if (cnt) cnt.textContent = list.length + ' רשומות';

  const tb = document.getElementById('tb-log');
  if (!tb) return;
  if (!list.length) {
    tb.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--tx3)">אין רשומות</td></tr>';
    return;
  }
  tb.innerHTML = list.map(e => {
    const dt = new Date(e.ts);
    const dateStr = fmtD(e.ts.split('T')[0]) + ' ' + dt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    const u = USERS.find(x => x.name === e.user);
    const clr = u ? u.color : 'var(--tx3)';
    const typeIcon = { customer: '👤', fault: '🔧', note: '📝', other: '📋' }[e.type || 'other'] || '📋';
    return `<tr>
      <td style="font-size:12px;color:var(--tx3);white-space:nowrap">${dateStr}</td>
      <td><span style="color:${clr};font-weight:600">${e.user || '—'}</span></td>
      <td>${typeIcon} ${e.action || ''}</td>
      <td style="color:var(--tx2);font-size:12px">${e.details || ''}</td>
    </tr>`;
  }).join('');
}

export async function clearLog() {
  if (!window._dbDelMulti) return;
  const ids = (window.logEntries || []).map(e => e.id);
  if (ids.length) await window._dbDelMulti('log', ids);
  window.logEntries = [];
  renderLog();
}
