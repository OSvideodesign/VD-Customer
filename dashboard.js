// ══ dashboard.js — dashboard rendering ══

import { USERS, NCAT_CLR } from './config.js';
import { wStat, wExp, dLeft, avClr, ini, fmtD, today, openWA, openNav } from './utils.js';

export function renderDash() {
  if (!document.getElementById('st-total')) return;
  window.custs.forEach(c => { c.debt = Math.max(0, Number(c.debt) || 0); });

  let wc = 0, dc = 0, ds = 0;
  const endY = new Date(new Date().getFullYear(), 11, 31);
  window.custs.forEach(c => {
    const e = wExp(c);
    if (e) { const d = dLeft(e); if (d < 0 || (d >= 0 && new Date(e) <= endY)) wc++; }
    if (c.debt > 0) { dc++; ds += c.debt; }
  });
  window.faults.filter(f => f.amount > 0 && f.paid !== 'yes').forEach(f => {
    dc++; ds += parseFloat(f.amount) || 0;
  });

  document.getElementById('st-total').textContent    = window.custs.length;
  document.getElementById('st-warr').textContent     = wc;
  document.getElementById('st-debts').textContent    = dc;
  document.getElementById('st-debt-sum').textContent = '₪' + ds.toLocaleString('he-IL');
  document.getElementById('st-faults').textContent   = window.faults.filter(f => f.status !== 'done').length;

  // Warranty panel
  const pw = window.custs.filter(c => { const s = wStat(c); return s && s.d <= 90; });
  document.getElementById('pan-warr').innerHTML = pw.length
    ? pw.map(c => { const s = wStat(c); return `<div class="ai ${s.d < 0 ? 'danger' : 'warn'}" onclick="window._jumpTo('${c.id}')">
        <span>${s.d < 0 ? '🔴' : '🟡'}</span>
        <div style="flex:1"><div style="font-weight:600;font-size:13px">${c.name}</div>
        <div style="font-size:11px;color:var(--tx3)">${s.d < 0 ? 'פגה לפני ' + Math.abs(s.d) + ' ימים' : 'עוד ' + s.d + ' ימים'}</div></div>
        <span style="color:var(--tx3)">›</span></div>`; }).join('')
    : '<div style="padding:20px;text-align:center;color:var(--tx3);font-size:13px">✅ הכל תקין</div>';

  // Debts panel
  const pd = window.custs.filter(c => c.debt > 0);
  const pdu = window.faults.filter(f => f.amount > 0 && f.paid !== 'yes');
  const pdAll = [
    ...pd.map(c  => ({ name: c.name, amount: c.debt, onclick: `window._jumpTo('${c.id}')` })),
    ...pdu.map(f => {
      const c = f.custId ? window.custs.find(x => x.id === f.custId) : null;
      return { name: c ? c.name : (f.guestName || 'לקוח מזדמן'), amount: parseFloat(f.amount), desc: (f.desc || '').slice(0, 25), onclick: `window._nav('debts')` };
    }),
  ];
  document.getElementById('pan-debts').innerHTML = pdAll.length
    ? pdAll.map(x => `<div class="ai danger" onclick="${x.onclick}">
        <span>💰</span><div style="flex:1"><div style="font-weight:600;font-size:13px">${x.name}</div>
        <div style="font-size:11px;color:var(--tx3)">₪${x.amount.toLocaleString('he-IL')}${x.desc ? ' — ' + x.desc : ''}</div></div>
        <span style="color:var(--tx3)">›</span></div>`).join('')
    : '<div style="padding:20px;text-align:center;color:var(--tx3);font-size:13px">✅ אין חובות</div>';

  // Faults panel
  const pf = window.faults.filter(f => f.status !== 'done');
  document.getElementById('pan-faults').innerHTML = pf.length
    ? pf.map(f => {
        const c = window.custs.find(x => x.id === f.custId);
        const name = c ? c.name : (f.guestName || 'לקוח מזדמן');
        return `<div class="ai warn" onclick="window._nav('faults')">
          <span>🔧</span><div style="flex:1"><div style="font-weight:600;font-size:13px">${name}</div>
          <div style="font-size:11px;color:var(--tx3)">${(f.desc || '').slice(0, 40)}</div></div>
          <span style="color:var(--tx3)">›</span></div>`;
      }).join('')
    : '<div style="padding:20px;text-align:center;color:var(--tx3);font-size:13px">✅ אין משימות</div>';

  // Notes panels by category
  const myNotes = (window.notes || []).sort((a, b) => (b.created || '').localeCompare(a.created || ''));
  ['general', 'meeting', 'reminder'].forEach(cat => {
    const panEl = document.getElementById('pan-notes-' + cat);
    if (!panEl) return;
    const items = myNotes.filter(n => (n.cat || 'general') === cat);
    const clr = NCAT_CLR[cat];
    if (!items.length) {
      panEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--tx3);font-size:13px">אין הערות</div>';
      return;
    }
    panEl.innerHTML = items.map(n => {
      const c = n.custId ? window.custs.find(x => x.id === n.custId) : null;
      const ownerU = USERS.find(u => u.name === n.owner);
      const ownerClr = ownerU ? ownerU.color : 'var(--tx3)';
      return `<div class="ai" onclick="window._editNoteById('${n.id}')" style="border-right:3px solid ${clr}">
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${(n.text || '').split('\n')[0].slice(0, 40)}</div>
          <div style="font-size:11px;color:var(--tx3);margin-top:3px;display:flex;gap:8px;flex-wrap:wrap">
            ${n.owner ? `<span style="color:${ownerClr};font-weight:600">✏️ ${n.owner}</span>` : ''}
            ${c ? `<span style="color:var(--acc)">👤 ${c.name}</span>` : ''}
            <span>${n.date ? fmtD(n.date) : fmtD(n.created || today())}</span>
          </div>
        </div>
        <span style="color:var(--tx3)">›</span>
      </div>`;
    }).join('');
  });
}
