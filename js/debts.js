// ══ debts.js — debts page ══

import { avClr, ini, toast, faultBalance } from './utils.js';

export function renderDebts() {
  window.custs.forEach(c => { c.debt = Math.max(0, Number(c.debt) || 0); });

  const custDebts    = window.custs.filter(c => c.debt > 0);
  const unpaidFaults = window.faults.filter(f => faultBalance(f) > 0);

  const totalCust   = custDebts.reduce((s, c) => s + c.debt, 0);
  const totalFaults = unpaidFaults.reduce((s, f) => s + faultBalance(f), 0);
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
    <td style="white-space:nowrap">
      ${c.phone ? `<button class="btn bs btn-sm" onclick="window._payCust('${c.id}')" title="שלח פרטי תשלום בוואטסאפ">💳</button>` : ''}
      <button class="btn bs btn-sm" onclick="window._markPaid('${c.id}')">✅ שולם</button>
    </td>
  </tr>`).join('');

  const faultRows = unpaidFaults.map(f => {
    const c = f.custId ? window.custs.find(x => x.id === f.custId) : null;
    const name  = c ? c.name : (f.guestName || 'לקוח מזדמן');
    const phone = c ? c.phone : '';
    const bal = faultBalance(f);
    const amt = parseFloat(f.amount) || 0;
    const paidSoFar = parseFloat(f.paidAmount) || 0;
    const paidLbl = paidSoFar > 0
      ? `⚠️ שולם ₪${paidSoFar.toLocaleString('he-IL')} מתוך ₪${amt.toLocaleString('he-IL')}`
      : '❌ לא שולם';
    return `<tr>
      <td><div class="ci"><div class="av" style="background:${avClr(name)};width:28px;height:28px;font-size:10px">${ini(name)}</div>
        <span style="font-weight:600;cursor:pointer" onclick="window._editFaultById('${f.id}')">${name}</span></div></td>
      <td>${phone ? `<a href="tel:${phone}" style="color:var(--acc)">${phone}</a>` : '—'}</td>
      <td><span style="color:var(--red);font-weight:700">₪${bal.toLocaleString('he-IL')}</span>${paidSoFar > 0 ? ` <span style="font-size:11px;color:var(--tx3)">(נותר)</span>` : ''}</td>
      <td style="color:var(--tx3);font-size:12px">🔧 ${(f.desc || '').slice(0, 30)} — ${paidLbl}</td>
      <td style="white-space:nowrap">
        ${phone ? `<button class="btn bs btn-sm" onclick="window._payFault('${f.id}')" title="שלח פרטי תשלום בוואטסאפ">💳</button>` : ''}
        <button class="btn bs btn-sm" onclick="window._recordPayment('${f.id}')" title="רישום תשלום שהתקבל">💰</button>
        <button class="btn bs btn-sm" onclick="window._markFaultPaid('${f.id}')">✅ שולם</button>
      </td>
    </tr>`;
  }).join('');

  tb.innerHTML = custRows + faultRows;
}

// שליחת פרטי תשלום ללקוח / למשימה דרך וואטסאפ (משתמש ב-window.sendPaymentDetails)
window._payCust = (id) => {
  const c = window.custs.find(x => x.id === id);
  if (c && window.sendPaymentDetails) window.sendPaymentDetails(c.phone, c.name, c.debt);
};
window._payFault = (id) => {
  const f = window.faults.find(x => x.id === id);
  if (!f) return;
  const c = f.custId ? window.custs.find(x => x.id === f.custId) : null;
  if (window.sendPaymentDetails) window.sendPaymentDetails(c ? c.phone : f.guestPhone, c ? c.name : (f.guestName || ''), f.amount);
};

export function markPaid(id) {
  if (!confirm('לסמן כשולם?')) return;
  window.custs = window.custs.map(c => c.id === id ? { ...c, debt: 0, debtDesc: '' } : c);
  if (window._dbSaveCusts) window._dbSaveCusts(window.custs);
  renderDebts();
  if (window.renderDash) window.renderDash();
  toast('סומן כשולם ✅');
}

export function markFaultPaid(id) {
  if (!confirm('לסמן כשולם במלואו?')) return;
  const f = window.faults.find(x => x.id === id); if (!f) return;
  f.paid = 'yes';
  f.paidAmount = parseFloat(f.amount) || 0;
  if (window._dbSaveFaults) window._dbSaveFaults(window.faults);
  renderDebts();
  if (window.renderDash) window.renderDash();
  toast('סומן כשולם ✅');
}

// רישום תשלום שהתקבל (חלקי או מלא) — מוסיף לסכום ששולם ומעדכן סטטוס לפי היתרה
window._recordPayment = (id) => {
  const f = window.faults.find(x => x.id === id); if (!f) return;
  const amt = parseFloat(f.amount) || 0;
  const already = parseFloat(f.paidAmount) || 0;
  const remaining = Math.max(0, amt - already);
  const input = prompt(`כמה התקבל עכשיו? (נותר לתשלום: ₪${remaining.toLocaleString('he-IL')})`, '');
  if (input === null) return;
  const pay = parseFloat(input);
  if (isNaN(pay) || pay <= 0) { toast('סכום לא תקין', 'err'); return; }
  const newPaid = Math.min(amt, already + pay);
  f.paidAmount = newPaid;
  f.paid = newPaid >= amt ? 'yes' : 'partial';
  if (window._dbSaveFaults) window._dbSaveFaults(window.faults);
  renderDebts();
  if (window.renderDash) window.renderDash();
  toast(f.paid === 'yes' ? 'שולם במלואו ✅' : `נרשם ₪${pay.toLocaleString('he-IL')} · נותר ₪${(amt - newPaid).toLocaleString('he-IL')}`);
};
