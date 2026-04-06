// ══ nav.js — navigation, modals, drawer, global search ══
// Deliberately avoids importing feature modules to prevent circular deps.
// Feature render functions are called via window.* (registered in main.js).

import { canDo } from './auth.js';
import { toast }  from './utils.js';

// ── Page navigation ────────────────────────────────────────────────────────
export function nav(page) {
  const restricted = ['customers', 'faults', 'archive', 'notes', 'warranties', 'debts', 'reports'];
  if (restricted.includes(page) && !canDo(page, 1)) { toast('אין הרשאה לדף זה ❌', 'err'); return; }
  if (page === 'log' && !['רז', 'אופיר'].includes(window._currentUser)) { toast('אין הרשאה ❌', 'err'); return; }

  document.querySelectorAll('.pg').forEach(e => e.classList.remove('on'));
  document.querySelectorAll('.nav-btn,.mnb').forEach(e => e.classList.remove('on'));

  const pg = document.getElementById('pg-' + page);
  if (!pg) return;
  pg.classList.add('on');

  const nb = document.getElementById('nb-' + page);
  if (nb) nb.classList.add('on');
  document.querySelectorAll('.mnb').forEach(b => {
    if (b.getAttribute('onclick') === `nav('${page}')`) b.classList.add('on');
  });

  // Dispatch to window.* render functions (set up by main.js after all modules load)
  const R = {
    dashboard:  () => window.renderDash?.(),
    customers:  () => window.renderCusts?.(),
    warranties: () => window.renderWarr?.(),
    debts:      () => window.renderDebts?.(),
    faults:     () => window.renderFaults?.(),
    notes:      () => window.renderNotes?.(),
    archive:    () => window.renderArchive?.(),
    log:        () => window.renderLog?.(),
    reports:    () => window.renderReports?.(),
    settings:   () => window.loadSettings?.(),
  };
  if (R[page]) R[page]();
}

export function jumpTo(id) {
  nav('customers');
  setTimeout(() => { if (id) window._viewCust?.(id); }, 100);
}

// ── Modals ─────────────────────────────────────────────────────────────────
export function openM(id)  { document.getElementById(id)?.classList.add('open'); }
export function closeM(id) { document.getElementById(id)?.classList.remove('open'); }

// ── Drawer ─────────────────────────────────────────────────────────────────
export function openDrawer()  { document.getElementById('m-drawer')?.classList.add('open'); }
export function closeDrawer() { document.getElementById('m-drawer')?.classList.remove('open'); }
export function navD(page)    { closeDrawer(); nav(page); }

// ── Global Search ──────────────────────────────────────────────────────────
export function openGlobalSearch() {
  openM('M-gsearch');
  setTimeout(() => {
    const i = document.getElementById('gs-inp');
    if (i) { i.value = ''; i.focus(); }
    document.getElementById('gs-results').innerHTML = '';
  }, 100);
}

export function runGlobalSearch() {
  const q = (document.getElementById('gs-inp').value || '').trim().toLowerCase();
  const el = document.getElementById('gs-results');
  if (!q || q.length < 2) { el.innerHTML = ''; return; }

  const results = [];

  (window.custs || []).forEach(c => {
    let match = false;
    // חיפוש בשדות הראשיים
    if ((c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q) ||
        (c.city || '').toLowerCase().includes(q) || (c.address || '').toLowerCase().includes(q)) {
      match = true;
    }
    // חיפוש באנשי קשר נוספים
    if (!match && c.contacts) {
      match = c.contacts.some(ct => (ct.name || '').toLowerCase().includes(q) || (ct.phone || '').includes(q));
    }
    // חיפוש בכתובות נוספות
    if (!match && c.extraAddresses) {
      match = c.extraAddresses.some(addr => (addr || '').toLowerCase().includes(q));
    }

    if (match) {
      results.push({
        icon: '👤', title: c.name,
        sub: (c.phone || '') + (c.city ? ' | ' + c.city : ''),
        action: () => { closeM('M-gsearch'); jumpTo(c.id); },
      });
    }
  });

  (window.faults || []).forEach(f => {
    const c = f.custId ? (window.custs || []).find(x => x.id === f.custId) : null;
    const name = c ? c.name : (f.guestName || 'לקוח מזדמן');
    if ((f.desc || '').toLowerCase().includes(q) || name.toLowerCase().includes(q) ||
        (f.notes || '').toLowerCase().includes(q)) {
      results.push({
        icon: '🔧', title: f.desc || 'משימה',
        sub: name + (f.status === 'done' ? ' | ✅ טופל' : ' | פתוחה'),
        action: () => { closeM('M-gsearch'); f.status === 'done' ? nav('archive') : nav('faults'); },
      });
    }
  });

  (window.notes || []).forEach(n => {
    if ((n.text || '').toLowerCase().includes(q) || (n.owner || '').toLowerCase().includes(q)) {
      results.push({
        icon: '📝', title: (n.text || '').slice(0, 60), sub: n.owner || '',
        action: () => {
          closeM('M-gsearch');
          nav('notes');
          setTimeout(() => window._editNoteById?.(n.id), 200);
        },
      });
    }
  });

  if (!results.length) {
    el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--tx3)">אין תוצאות</div>';
    return;
  }

  el.innerHTML = results.slice(0, 15).map((r, i) => `
    <div onclick="window._gsClick(${i})"
         style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--sur2);border-radius:8px;margin-bottom:6px;cursor:pointer;border:1px solid var(--brd2)"
         onmouseover="this.style.borderColor='var(--acc)'" onmouseout="this.style.borderColor='var(--brd2)'">
      <span style="font-size:18px">${r.icon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.title}</div>
        <div style="font-size:11px;color:var(--tx3)">${r.sub}</div>
      </div>
      <span style="color:var(--tx3)">›</span>
    </div>`).join('');

  window._gsResults = results;
}

  (window.faults || []).forEach(f => {
    const c = f.custId ? (window.custs || []).find(x => x.id === f.custId) : null;
    const name = c ? c.name : (f.guestName || 'לקוח מזדמן');
    if ((f.desc || '').toLowerCase().includes(q) || name.toLowerCase().includes(q) ||
        (f.notes || '').toLowerCase().includes(q)) {
      results.push({
        icon: '🔧', title: f.desc || 'משימה',
        sub: name + (f.status === 'done' ? ' | ✅ טופל' : ' | פתוחה'),
        action: () => { closeM('M-gsearch'); f.status === 'done' ? nav('archive') : nav('faults'); },
      });
    }
  });

  (window.notes || []).forEach(n => {
    if ((n.text || '').toLowerCase().includes(q) || (n.owner || '').toLowerCase().includes(q)) {
      results.push({
        icon: '📝', title: (n.text || '').slice(0, 60), sub: n.owner || '',
        action: () => {
          closeM('M-gsearch');
          nav('notes');
          setTimeout(() => window._editNoteById?.(n.id), 200);
        },
      });
    }
  });

  if (!results.length) {
    el.innerHTML = '<div style="text-align:center;padding:30px;color:var(--tx3)">אין תוצאות</div>';
    return;
  }

  el.innerHTML = results.slice(0, 15).map((r, i) => `
    <div onclick="window._gsClick(${i})"
         style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--sur2);border-radius:8px;margin-bottom:6px;cursor:pointer;border:1px solid var(--brd2)"
         onmouseover="this.style.borderColor='var(--acc)'" onmouseout="this.style.borderColor='var(--brd2)'">
      <span style="font-size:18px">${r.icon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.title}</div>
        <div style="font-size:11px;color:var(--tx3)">${r.sub}</div>
      </div>
      <span style="color:var(--tx3)">›</span>
    </div>`).join('');

  window._gsResults = results;


window._gsClick = (i) => { if (window._gsResults?.[i]) window._gsResults[i].action(); };
