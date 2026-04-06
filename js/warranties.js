// ══ warranties.js — warranty page ══

import { avClr, ini, fmtD, wStat, wExp, dLeft } from './utils.js';

export function renderWarr() {
  const list = window.custs.filter(c => c.installDate && c.warrantyYears).sort((a, b) => {
    const sa = wStat(a), sb = wStat(b);
    return (sa ? sa.d : 9999) - (sb ? sb.d : 9999);
  });
  document.getElementById('cnt-warr').textContent = list.length + ' לקוחות';
  const tb = document.getElementById('tb-warr');
  if (!list.length) {
    tb.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--tx3)">אין נתוני אחריות</td></tr>';
    return;
  }
  tb.innerHTML = list.map(c => {
    const s = wStat(c);
    const pct = s ? Math.min(100, Math.max(0, Math.round(
      (new Date() - new Date(c.installDate)) / (new Date(s.exp) - new Date(c.installDate)) * 100
    ))) : 0;
    const bc = s ? (s.d < 0 ? 'var(--red)' : s.d < 90 ? 'var(--yel)' : 'var(--grn)') : 'var(--grn)';
    return `<tr>
      <td><div class="ci"><div class="av" style="background:${avClr(c.name)};width:28px;height:28px;font-size:10px">${ini(c.name)}</div>
        <span style="font-weight:600;cursor:pointer" onclick="window._viewCust('${c.id}')">${c.name}</span></div></td>
      <td>${fmtD(c.installDate)}</td>
      <td>${c.warrantyYears} שנים</td>
      <td>${s ? fmtD(s.exp) : '—'}</td>
      <td>${s ? `<span class="badge ${s.cls}">${s.lbl}${s.d >= 0 ? ' (' + s.d + 'י)' : ''}</span>` : '—'}</td>
      <td style="min-width:100px">
        <div class="pb"><div class="pb-fill" style="width:${pct}%;background:${bc}"></div></div>
        <div style="font-size:10px;color:var(--tx3);margin-top:2px">${pct}%</div>
      </td></tr>`;
  }).join('');
}
