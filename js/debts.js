// ══ debts.js — debts page ══

import { avClr, ini, toast } from './utils.js';

export function renderDebts() {
  const VAT_RATE = 1.18; // מע"מ 18%
  
  window.custs.forEach(c => { c.debt = Math.max(0, Number(c.debt) || 0); });

  // סינון חובות לקוחות וחישוב סכום סופי לכל אחד
  const custDebts = window.custs.filter(c => c.debt > 0).map(c => {
    return { ...c, finalAmt: c.debtPlusVat ? c.debt * VAT_RATE : c.debt };
  });

  // סינון חובות ממשימות וחישוב סכום סופי לכל אחת
  const unpaidFaults = window.faults.filter(f => f.amount > 0 && f.paid !== 'yes').map(f => {
    const amt = parseFloat(f.amount) || 0;
    return { ...f, finalAmt: f.amountPlusVat ? amt * VAT_RATE : amt };
  });

  const totalCust   = custDebts.reduce((s, c) => s + c.finalAmt, 0);
  const totalFaults = unpaidFaults.reduce((s, f) => s + f.finalAmt, 0);
  const total = totalCust + totalFaults;
  const count = custDebts.length + unpaidFaults.length;

  document.getElementById('cnt-debts').textContent =
    count + ' רשומות | סה״כ: ₪' + Math.round(total).toLocaleString('he-IL');

  const tb = document.getElementById('tb-debts');
  if (!count) {
    tb.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--tx3)">✅ אין חובות פתוחים</td></tr>';
    return;
  }

  const custRows = custDebts.map(c => `<tr>
    <td><div class="ci"><div class="av" style="background:${avClr(c.name)};width:28px;height:28px;font-size:10px">${ini(c.name)}</div>
      <span style="font-weight:600;cursor:pointer" onclick="window._viewCust('${c.id}')">${c.name}</span></div></td>
    <td>${c.phone ? `<a href="tel:${c.phone}" style="color:var(--acc)">${c.phone}</a>` : '—'}</td>
    <td><span style="color:var(--red);font-weight:700">₪${Math.round(c.finalAmt).toLocaleString('he-IL')}</span></td>
    <td style="color:var(--tx3);font-size:12px">${c.debtDesc || 'חוב לקוח'}${c.debtPlusVat ? ' (כולל מע"מ)' : ''}</td>
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
      <td><span style="color:var(--red);font-weight:700">₪${Math.round(f.finalAmt).toLocaleString('he-IL')}</span></td>
      <td style="color:var(--tx3);font-size:12px">🔧 ${(f.desc || '').slice(0, 30)} — ${paidLbl}${f.amountPlusVat ? ' (כולל מע"מ)' : ''}</td>
      <td><button class="btn bs btn-sm" onclick="window._markFaultPaid('${f.id}')">✅ שולם</button></td>
    </tr>`;
  }).join('');

  tb.innerHTML = custRows + faultRows;
}

export function markPaid(id) {
  if (!confirm('לסמן כשולם?')) return;
  window.custs = window.custs.map(c => c.id === id ? { ...c, debt: 0, debtDesc: '', debtPlusVat: false } : c);
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
  if (typeof renderDash === 'function') renderDash();
  toast('סומן כשולם ✅');
}