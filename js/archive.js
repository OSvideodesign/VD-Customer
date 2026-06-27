// ══ archive.js — archive page ══

import { avClr, ini, fmtD, toast, faultBalance } from './utils.js';
import { renderDash } from './dashboard.js';

let _archiveView = 'customer';   // 'customer' = מקובץ לפי לקוח (ברירת מחדל) | 'treatment' = רשימה מלאה

export function setArchiveView(mode) {
  _archiveView = mode;
  renderArchive();
}
window.setArchiveView = setArchiveView;

export function renderArchive() {
  const q  = (document.getElementById('q-archive') || {}).value || '';
  const uf = (document.getElementById('f-archive-user') || {}).value || '';

  // מציג רק משימות שלא הוסתרו ידנית
  let list = window.faults.filter(f => f.status === 'done' && !f.archivedHidden);
  if (q) list = list.filter(f => {
    const c = window.custs.find(x => x.id === f.custId);
    return (f.desc || '').includes(q) || (c && c.name.includes(q)) || (f.guestName || '').includes(q);
  });
  if (uf) list = list.filter(f => f.updatedBy === uf);
  list.sort((a, b) => (b.created || '').localeCompare(a.created || ''));

  // עדכון מצב כפתורי המתג
  const bCust  = document.getElementById('arch-view-cust');
  const bTreat = document.getElementById('arch-view-treat');
  if (bCust)  bCust.className  = 'btn btn-sm ' + (_archiveView === 'customer'  ? 'bp' : 'bs');
  if (bTreat) bTreat.className = 'btn btn-sm ' + (_archiveView === 'treatment' ? 'bp' : 'bs');

  const cnt = document.getElementById('cnt-archive');
  const el  = document.getElementById('list-archive');
  if (!el) return;

  if (!list.length) {
    if (cnt) cnt.textContent = '0 טיפולים';
    el.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--tx3);font-size:14px">✅<br><br>אין משימות בארכיון</div>';
    return;
  }

  // ── תצוגה מלאה: כרטיס לכל טיפול ──
  if (_archiveView === 'treatment') {
    if (cnt) cnt.textContent = list.length + ' טיפולים';
    el.innerHTML = list.map(f => _treatmentCard(f)).join('');
    return;
  }

  // ── תצוגה מקובצת לפי לקוח (ברירת מחדל) ──
  const groups = new Map();
  const guests = [];
  list.forEach(f => {
    if (f.custId) {
      if (!groups.has(f.custId)) groups.set(f.custId, []);
      groups.get(f.custId).push(f);
    } else {
      guests.push(f);
    }
  });

  const cards = [...groups.entries()].map(([cid, fs]) => {
    const c = window.custs.find(x => x.id === cid);
    const total = fs.reduce((s, f) => s + (parseFloat(f.amount) || 0), 0);
    const unpaid = fs.some(f => faultBalance(f) > 0);
    const lastDate = fs.map(f => f.created || '').sort().slice(-1)[0];
    return { cid, name: c ? c.name : 'לקוח שנמחק', count: fs.length, total, unpaid, lastDate };
  }).sort((a, b) => (b.lastDate || '').localeCompare(a.lastDate || ''));

  if (cnt) cnt.textContent = cards.length + ' לקוחות · ' + list.length + ' טיפולים';

  let html = cards.map(g => `
    <div class="fc" style="border-right:3px solid var(--grn);cursor:pointer" onclick="window._viewCust('${g.cid}')">
      <div style="display:flex;align-items:center;gap:10px">
        <div class="av" style="background:${avClr(g.name)};width:34px;height:34px">${ini(g.name)}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${g.name}</div>
          <div style="font-size:11px;color:var(--tx3)">✅ ${g.count} טיפולים${g.lastDate ? ' · אחרון ' + fmtD(g.lastDate) : ''}</div>
        </div>
        ${g.total > 0 ? `<span class="badge ${g.unpaid ? 'br' : 'bg'}">₪${g.total.toLocaleString('he-IL')}</span>` : ''}
        <span style="color:var(--tx3);font-size:18px">›</span>
      </div>
    </div>`).join('');

  if (guests.length) {
    html += `<div style="grid-column:1/-1;margin-top:6px;font-size:12px;color:var(--tx3);font-weight:700">👤 לקוחות מזדמנים (${guests.length})</div>`;
    html += guests.map(f => _treatmentCard(f)).join('');
  }

  el.innerHTML = html;
}

function _treatmentCard(f) {
  const c       = f.custId ? window.custs.find(x => x.id === f.custId) : null;
  const name    = c ? c.name : (f.guestName || 'לקוח מזדמן');
  const bal = faultBalance(f);
  const paidSoFar = parseFloat(f.paidAmount) || 0;
  const paidLbl = f.paid === 'yes' ? '✅ שולם'
    : paidSoFar > 0 ? `⚠️ שולם ₪${paidSoFar.toLocaleString('he-IL')} · נותר ₪${bal.toLocaleString('he-IL')}`
    : '❌ לא שולם';
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
      <div class="fmeta" style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        ${f.updatedBy ? `<span style="color:var(--tx3)">✏️ ${f.updatedBy}</span>` : ''}
        ${f.created ? `<span style="color:var(--tx3)">📅 ${fmtD(f.created)}</span>` : ''}
        <button class="btn bs btn-sm" onclick="window._editFaultById('${f.id}')">✏️ ערוך</button>
        <button class="btn bs btn-sm" onclick="window._restoreFault('${f.id}')">↩️ החזר לטיפול</button>
        <button class="btn bd btn-sm" onclick="window._hideFromArchive('${f.id}')" style="margin-right:auto;">🗑️ הסתר</button>
      </div>
    </div>`;
}

export function restoreFault(id) {
  const f = window.faults.find(x => x.id === id); if (!f) return;
  f.status = 'open';
  if (window._dbSaveFaults) window._dbSaveFaults(window.faults);
  renderArchive(); renderDash();
  toast('משימה הוחזרה ✅');
}

export async function hideFromArchive(id) {
  if (!confirm('להסתיר משימה זו מהארכיון? (היא עדיין תופיע בהיסטוריה של כרטיס הלקוח)')) return;
  const f = window.faults.find(x => x.id === id); if (!f) return;
  f.archivedHidden = true;
  if (window._dbSaveFaults) await window._dbSaveFaults([f]);
  renderArchive();
  toast('הוסתר מהארכיון ✅');
}
window._hideFromArchive = hideFromArchive;