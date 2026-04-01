// ══ notes.js — notes page ══

import { USERS, NCAT, NCAT_CLR } from './config.js';
import { uid, today, fmtD, toast } from './utils.js';
import { openM, closeM } from './nav.js';
import { addLog } from './log.js';

let _eNote           = null;
let _noteSelectMode  = false;
let _noteSelectedIds = new Set();

export function renderNotes() {
  const q     = (document.getElementById('note-search') || {}).value || '';
  const catF  = (document.getElementById('note-filter-cat') || {}).value || '';
  const userF = (document.getElementById('note-filter-user') || {}).value || '';

  let list = [...(window.notes || [])];
  if (q)     list = list.filter(n => (n.text || '').includes(q) || (n.custName || '').includes(q));
  if (catF)  list = list.filter(n => (n.cat || 'general') === catF);
  if (userF) list = list.filter(n => n.owner === userF);
  list = list.sort((a, b) => (b.created || '').localeCompare(a.created || ''));

  const sub = document.getElementById('notes-sub');
  if (sub) sub.textContent = list.length + ' הערות';

  const el = document.getElementById('list-notes');
  if (!el) return;

  if (!list.length) {
    el.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--tx3);font-size:14px">📝<br><br>אין הערות עדיין<br><span style="font-size:12px">לחץ על "+ הערה חדשה" כדי להוסיף</span></div>';
    return;
  }

  el.innerHTML = list.map(n => {
    const c       = n.custId ? window.custs.find(x => x.id === n.custId) : null;
    const clr     = NCAT_CLR[n.cat || 'general'];
    const lbl     = NCAT[n.cat || 'general'];
    const dateStr = n.date ? fmtD(n.date) + (n.time ? ' ' + n.time : '') : fmtD(n.created || today());
    const ownerU  = USERS.find(u => u.name === n.owner);
    const ownerClr = ownerU ? ownerU.color : 'var(--tx3)';
    const cbHtml  = _noteSelectMode
      ? `<input type="checkbox" class="fc-cb" onclick="event.stopPropagation();window._toggleNoteSelect('${n.id}',this)" ${_noteSelectedIds.has(n.id) ? 'checked' : ''}>`
      : '';
    const fcClick = _noteSelectMode
      ? `window._toggleNoteSelect('${n.id}',this.querySelector('.fc-cb'))`
      : `window._editNoteById('${n.id}')`;

    return `<div class="fc ${_noteSelectMode && _noteSelectedIds.has(n.id) ? 'selected' : ''}" onclick="${fcClick}" style="border-right:3px solid ${clr};position:relative">
      ${cbHtml}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;background:${clr}22;color:${clr}">${lbl}</span>
        <span style="font-size:11px;color:var(--tx3)">${dateStr}</span>
      </div>
      <div style="font-size:13px;color:var(--tx);line-height:1.6;white-space:pre-wrap;margin-bottom:8px">${(n.text || '').slice(0, 200)}${(n.text || '').length > 200 ? '...' : ''}</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px">
        <span style="font-size:11px;color:${ownerClr};font-weight:600">✏️ ${n.owner || 'לא ידוע'}</span>
        ${c ? `<span style="font-size:11px;color:var(--acc)">👤 ${c.name}</span>` : ''}
      </div>
    </div>`;
  }).join('');
}

export function openNewNote() {
  _eNote = null;
  document.getElementById('M-note-title').textContent = 'הערה חדשה';
  document.getElementById('mn-del').style.display = 'none';
  _fillCustSel('');
  document.getElementById('mn-cat').value  = 'general';
  document.getElementById('mn-text').value = '';
  document.getElementById('mn-date').value = '';
  document.getElementById('mn-time').value = '';
  openM('M-note');
}

export function editNoteById(id) {
  const n = (window.notes || []).find(x => x.id === id); if (!n) return;
  _eNote = id;
  document.getElementById('M-note-title').textContent = 'עריכת הערה';
  document.getElementById('mn-del').style.display = '';
  _fillCustSel(n.custId || '');
  document.getElementById('mn-cat').value  = n.cat  || 'general';
  document.getElementById('mn-text').value = n.text || '';
  document.getElementById('mn-date').value = n.date || '';
  document.getElementById('mn-time').value = n.time || '';
  openM('M-note');
}

function _fillCustSel(selected) {
  const sel = document.getElementById('mn-cust');
  sel.innerHTML = '<option value="">ללא קישור</option>'
    + [...window.custs].sort((a, b) => a.name.localeCompare(b.name, 'he'))
      .map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  sel.value = selected;
}

export function saveNote() {
  const text = document.getElementById('mn-text').value.trim();
  if (!text) { toast('כתוב תוכן להערה', 'err'); return; }
  const custId = document.getElementById('mn-cust').value;
  const cust   = custId ? window.custs.find(x => x.id === custId) : null;
  const n = {
    id:       _eNote || uid(),
    cat:      document.getElementById('mn-cat').value,
    text,
    custId:   custId || '',
    custName: cust ? cust.name : '',
    date:     document.getElementById('mn-date').value,
    time:     document.getElementById('mn-time').value,
    owner:    window._currentUser || '',
    created:  _eNote ? ((window.notes || []).find(x => x.id === _eNote) || {}).created || today() : today(),
  };
  if (_eNote) window.notes = (window.notes || []).map(x => x.id === _eNote ? n : x);
  else        (window.notes = window.notes || []).push(n);
  if (window._dbSaveNotes) window._dbSaveNotes(window.notes);
  addLog('note', _eNote ? 'עריכת הערה' : 'הוספת הערה', (n.text || '').slice(0, 50));
  closeM('M-note');
  renderNotes();
  toast(_eNote ? 'הערה עודכנה ✅' : 'הערה נוספה ✅');
}

export async function delNote() {
  if (!confirm('למחוק הערה זו?')) return;
  const id = _eNote;
  closeM('M-note');
  toast('מוחק...');
  if (window._dbDel) {
    const ok = await window._dbDel('notes', id);
    if (!ok) { toast('שגיאה במחיקה', 'err'); return; }
  }
  const noteToDelete = (window.notes || []).find(x => x.id === id);
  window.notes = (window.notes || []).filter(x => x.id !== id);
  addLog('note', 'מחיקת הערה', (noteToDelete?.text || '').slice(0, 50));
  renderNotes();
  toast('הערה נמחקה ✅');
}

// ── bulk select ────────────────────────────────────────────────────────────
export function toggleNoteSelectMode(on) {
  _noteSelectMode = on;
  _noteSelectedIds.clear();
  const pg  = document.getElementById('pg-notes');
  const bar = document.getElementById('note-bulk-bar');
  const btn = document.getElementById('note-select-mode-btn');
  if (on) {
    pg?.classList.add('select-mode');
    if (btn) btn.style.display = 'none';
    if (bar) bar.style.display = 'flex';
  } else {
    pg?.classList.remove('select-mode');
    if (btn) btn.style.display = '';
    if (bar) bar.style.display = 'none';
  }
  document.getElementById('note-bulk-count').textContent = '0 נבחרו';
  renderNotes();
}

export function toggleNoteSelect(id, el) {
  if (_noteSelectedIds.has(id)) {
    _noteSelectedIds.delete(id);
    el?.closest('.fc')?.classList.remove('selected');
  } else {
    _noteSelectedIds.add(id);
    el?.closest('.fc')?.classList.add('selected');
  }
  document.getElementById('note-bulk-count').textContent = _noteSelectedIds.size + ' נבחרו';
}

export async function deleteSelectedNotes() {
  if (_noteSelectedIds.size === 0) return;
  if (!confirm('למחוק ' + _noteSelectedIds.size + ' הערות?')) return;
  const ids = [..._noteSelectedIds];
  toast('מוחק ' + ids.length + ' הערות...');
  const ok = window._dbDelMulti ? await window._dbDelMulti('notes', ids) : true;
  if (!ok) { toast('שגיאה במחיקה', 'err'); return; }
  window.notes = (window.notes || []).filter(n => !ids.includes(n.id));
  toggleNoteSelectMode(false);
  renderNotes();
  toast(ids.length + ' הערות נמחקו ✅');
}
