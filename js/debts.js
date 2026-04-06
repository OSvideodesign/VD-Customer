// ══ debts.js — debts page ══

import { avClr, ini, toast } from './utils.js';

export function renderDebts() {
  window.custs.forEach(c => { c.debt = Math.max(0, Number(c.debt) || 0); });

  const custDebts    = window.custs.filter(c => c.debt > 0);
  const unpaidFaults = window.faults.filter(f => f.amount > 0 && f.paid !== 'yes');

  const totalCust   = custDebts.reduce((s, c) => s + c.debt, 0);
  const totalFaults = unpaidFaults.reduce((s, f) => s + (parseFloat(f.amount) || 0), 0);
  const total = totalCust + totalFaults;
  const count = custDebts.length + unpaidFaults.length;

  document.getElementById('cnt-debts').textContent =
    count + ' רשומות | סה״כ: ₪' + total.toLocaleString('he-IL');

  const tb = document.getElementById('tb-debts');
  if (!count) {
    tb.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--tx3)">✅ אין חובות פתוחים</td></tr>';
    return;
  }

  const custRows = custDebts.map(c => `<tr>
    <td><div class="ci"><div class="av" style="background:${avClr(c.name)};width:28px;height:28px;font-size:10px">${ini(c.name)}</div>
      <span style="font-weight:600;cursor:pointer" onclick="window._viewCust('${c.id}')">${c.name}</span></div></td>
    <td>${c.phone ? `<a href="tel:${c.phone}" style="color:var(--acc)">${c.phone}</a>` : '—'}</td>
    <td><span style="color:var(--red);font-weight:700">₪${c.debt.toLocaleString('he-IL')}</span></td>
    <td style="color:var(--tx3);font-size:12px">${c.debtDesc || 'חוב לקוח'}</td>
    <td><button class="btn bs btn-sm" onclick="window._markPaid('${c.id}')">✅ שולם</button></td>
  </tr>`).join('');

  const faultRows = unpaidFaults.map(f => {
    const c = f.custId ? window.custs.find(x => x.id === f.custId) : null;
    const name  = c ? c.name : (f.guestName || 'לקוח מזדמן');
    const phone = c ? c.phone : '';
    const paidLbl = f.paid === 'partial' ? '⚠️ שולם חלקית' : '❌ לא שולם';
    return `<tr>
      <td><div class="ci"><div class="av" style="background:${avClr(name)};width:28px;height:28px;font-size:10px">${ini(name)}</div>
        <span style="font-weight:600;cursor:pointer" onclick="window._editFaultById('${f.id}')">${name}</span></div></td>
      <td>${phone ? `<a href="tel:${phone}" style="color:var(--acc)">${phone}</a>` : '—'}</td>
      <td><span style="color:var(--red);font-weight:700">₪${parseFloat(f.amount).toLocaleString('he-IL')}</span></td>
      <td style="color:var(--tx3);font-size:12px">🔧 ${(f.desc || '').slice(0, 30)} — ${paidLbl}</td>
      <td><button class="btn bs btn-sm" onclick="window._markFaultPaid('${f.id}')">✅ שולם</button></td>
    </tr>`;
  }).join('');

  tb.innerHTML = custRows + faultRows;
}

export function markPaid(id) {
  if (!confirm('לסמן כשולם?')) return;
  window.custs = window.custs.map(c => c.id === id ? { ...c, debt: 0, debtDesc: '' } : c);
  if (window._dbSaveCusts) window._dbSaveCusts(window.custs);
  renderDebts();
  if (typeof renderDash === 'function') renderDash();
  toast('סומן כשולם ✅');
}

export function markFaultPaid(id) {
  if (!confirm('לסמן כשולם?')) return;
  const f = window.faults.find(x => x.id === id); if (!f) return;
  f.paid = 'yes';
  if (window._dbSaveFaults) window._dbSaveFaults(window.faults);
  renderDebts();
  toast('סומן כשולם ✅');
}
