// ══ reports.js — reports page ══

import { USERS } from './config.js';
import { today, fmtD, toast } from './utils.js';

export function renderReports() {
  const mSel = document.getElementById('rep-month');
  const ySel = document.getElementById('rep-year');
  if (!mSel || !ySel) return;

  if (!mSel.options.length) {
    ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
      .forEach((m, i) => {
        const o = document.createElement('option');
        o.value = i + 1; o.textContent = m;
        mSel.appendChild(o);
      });
    const now = new Date();
    mSel.value = now.getMonth() + 1;
    for (let y = 2024; y <= now.getFullYear() + 1; y++) {
      const o = document.createElement('option');
      o.value = y; o.textContent = y;
      ySel.appendChild(o);
    }
    ySel.value = now.getFullYear();
  }

  const month  = parseInt(mSel.value);
  const year   = parseInt(ySel.value);
  const prefix = `${year}-${String(month).padStart(2, '0')}`;

  const monthFaults = window.faults.filter(f => (f.created || '').startsWith(prefix));
  const doneFaults  = monthFaults.filter(f => f.status === 'done');
  const income      = doneFaults.reduce((s, f) => s + (parseFloat(f.amount) || 0), 0);
  const paidIncome  = doneFaults.filter(f => f.paid === 'yes').reduce((s, f) => s + (parseFloat(f.amount) || 0), 0);

  const cnt = document.getElementById('cnt-reports');
  if (cnt) cnt.textContent = `${mSel.options[month - 1]?.text} ${year}`;

  document.getElementById('rep-stats').innerHTML = `
    <div class="sc"><div class="sc-lbl">משימות החודש</div><div class="sc-val">${monthFaults.length}</div><div class="sc-sub">🔧 סה״כ</div></div>
    <div class="sc"><div class="sc-lbl">טופלו</div><div class="sc-val">${doneFaults.length}</div><div class="sc-sub">✅ הושלמו</div></div>
    <div class="sc"><div class="sc-lbl">הכנסות פוטנציאל</div><div class="sc-val">₪${income.toLocaleString('he-IL')}</div><div class="sc-sub">💰 כולל חובות</div></div>
    <div class="sc"><div class="sc-lbl">גבוי בפועל</div><div class="sc-val" style="color:var(--grn)">₪${paidIncome.toLocaleString('he-IL')}</div><div class="sc-sub">✅ שולם</div></div>`;

  // by tech
  const byTech = {}, incomeByTech = {};
  monthFaults.forEach(f => {
    const t = f.updatedBy || 'לא ידוע';
    byTech[t] = (byTech[t] || 0) + 1;
    incomeByTech[t] = (incomeByTech[t] || 0) + (f.status === 'done' ? parseFloat(f.amount) || 0 : 0);
  });

  document.getElementById('rep-by-tech').innerHTML = Object.entries(byTech)
    .sort((a, b) => b[1] - a[1])
    .map(([name, cnt]) => {
      const u = USERS.find(x => x.name === name);
      return `<div class="ai"><span style="color:${u ? u.color : 'var(--tx3)'};font-weight:700">${name}</span><span style="margin-right:auto;font-weight:700">${cnt} משימות</span></div>`;
    }).join('') || '<div style="padding:20px;text-align:center;color:var(--tx3)">אין נתונים</div>';

  document.getElementById('rep-income-tech').innerHTML = Object.entries(incomeByTech)
    .sort((a, b) => b[1] - a[1])
    .map(([name, amt]) => {
      const u = USERS.find(x => x.name === name);
      return `<div class="ai"><span style="color:${u ? u.color : 'var(--tx3)'};font-weight:700">${name}</span><span style="margin-right:auto;font-weight:700;color:var(--grn)">₪${amt.toLocaleString('he-IL')}</span></div>`;
    }).join('') || '<div style="padding:20px;text-align:center;color:var(--tx3)">אין נתונים</div>';

  const open  = monthFaults.filter(f => f.status === 'open').length;
  const sched = monthFaults.filter(f => f.status === 'scheduled').length;
  const done  = doneFaults.length;
  document.getElementById('rep-status').innerHTML = `
    <div class="ai"><span>🔵 פתוחות</span><span style="margin-right:auto;font-weight:700">${open}</span></div>
    <div class="ai"><span>📅 נקבע</span><span style="margin-right:auto;font-weight:700">${sched}</span></div>
    <div class="ai"><span>✅ טופל</span><span style="margin-right:auto;font-weight:700">${done}</span></div>`;
}

export function exportBackup() {
  const backup = { date: new Date().toISOString(), version: '1.0', customers: window.custs, faults: window.faults, notes: window.notes };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'גיבוי_וידאו_דיזיין_' + today() + '.json';
  a.click();
  toast('גיבוי הורד ✅ — ' + window.custs.length + ' לקוחות, ' + window.faults.length + ' משימות');
}

export function exportCustomersExcel() {
  const rows = [['שם', 'טלפון', 'מייל', 'עיר', 'כתובת', 'פרויקט', 'ציוד', 'חוב', 'הערות']];
  window.custs.forEach(c => rows.push([
    c.name || '', c.phone || '', c.email || '', c.city || '', c.address || '',
    c.projectType || '', c.equipment || '', c.debt || 0, c.techNotes || '',
  ]));
  const csv  = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const a    = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'לקוחות_וידאו_דיזיין_' + today() + '.csv';
  a.click();
  toast('קובץ יוצא ✅');
}
