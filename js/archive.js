// ══ archive.js — archive page ══

import { avClr, ini, fmtD, toast } from './utils.js';
import { renderDash } from './dashboard.js';

export function renderArchive() {
  const q  = (document.getElementById('q-archive') || {}).value || '';
  const uf = (document.getElementById('f-archive-user') || {}).value || '';

  let list = window.faults.filter(f => f.status === 'done');
  if (q) list = list.filter(f => {
    const c = window.custs.find(x => x.id === f.custId);
    return (f.desc || '').includes(q) || (c && c.name.includes(q)) || (f.guestName || '').includes(q);
  });
  if (uf) list = list.filter(f => f.updatedBy === uf);
  list.sort((a, b) => (b.created || '').localeCompare(a.created || ''));

  const cnt = document.getElementById('cnt-archive');
  if (cnt) cnt.textContent = list.length + ' משימות בוצעו';

  const el = document.getElementById('list-archive');
  if (!el) return;

  if (!list.length) {
    el.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--tx3);font-size:14px">✅<br><br>אין משימות בוצעו עדיין</div>';
    return;
  }

  el.innerHTML = list.map(f => {
    const c     = f.custId ? window.custs.find(x => x.id === f.custId) : null;
    const name  = c ? c.name : (f.guestName || 'לקוח מזדמן');
    const paidLbl = { yes: '✅ שולם', partial: '⚠️ חלקי', no: '❌ לא שולם' }[f.paid || 'no'];
    const paidClr = { yes: 'var(--grn)', partial: 'var(--yel)', no: 'var(--tx3)' }[f.paid || 'no'];
    return `<div class="fc" style="border-right:3px solid var(--grn)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div class="ci">
          <div class="av" style="background:${avClr(name)};width:28px;height:28px;font-size:10px">${ini(name)}</div>
          <div>
            <div style="font-weight:700;font-size:13px">${name}</div>
            ${f.amount > 0 ? `<div style="font-size:11px;color:${paidClr}">💰 ₪${f.amount.toLocaleString('he-IL')} — ${paidLbl}</div>` : ''}
          </div>
        </div>
        <span class="badge bg">✅ טופל</span>
      </div>
      <div class="fdesc">${f.desc || ''}</div>
      <div class="fmeta" style="margin-top:8px">
        ${f.updatedBy ? `<span style="color:var(--tx3)">✏️ ${f.updatedBy}</span>` : ''}
        ${f.created ? `<span style="color:var(--tx3)">📅 ${fmtD(f.created)}</span>` : ''}
        <button class="btn bs btn-sm" onclick="window._editFaultById('${f.id}')">✏️ ערוך</button>
        <button class="btn bs btn-sm" onclick="window._restoreFault('${f.id}')">↩️ החזר למשימות</button>
      </div>
    </div>`;
  }).join('');
}

export function restoreFault(id) {
  const f = window.faults.find(x => x.id === id); if (!f) return;
  f.status = 'open';
  if (window._dbSaveFaults) window._dbSaveFaults(window.faults);
  renderArchive(); renderDash();
  toast('משימה הוחזרה ✅');
}
