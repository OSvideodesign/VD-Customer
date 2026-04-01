// ══ customers.js — customers page ══

import { uid, today, fmtD, avClr, ini, wStat, toast, openWA, openNav } from './utils.js';
import { openM, closeM } from './nav.js';
import { addLog } from './log.js';
import { renderDash } from './dashboard.js';
import { renderDebts } from './debts.js';
import { renderWarr } from './warranties.js';

let _eCust = null;

export function renderCusts() {
  const q  = (document.getElementById('q-custs')?.value || '').toLowerCase();
  const fw = document.getElementById('f-warr')?.value || '';
  const fd = document.getElementById('f-debt')?.value || '';

  let list = window.custs.filter(c => {
    if (q && !c.name.toLowerCase().includes(q) && !(c.phone || '').includes(q) && !(c.city || '').toLowerCase().includes(q)) return false;
    if (fw) {
      const s = wStat(c);
      if (fw === 'expired' && (!s || s.d >= 0)) return false;
      if (fw === 'soon'    && (!s || s.d < 0 || s.d > 90)) return false;
      if (fw === 'valid'   && (!s || s.d < 0)) return false;
    }
    if (fd === 'has' && !(c.debt > 0)) return false;
    if (fd === 'no'  && c.debt > 0)    return false;
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name, 'he'));

  document.getElementById('cnt-custs').textContent = list.length + ' לקוחות';
  const tb = document.getElementById('tb-custs');
  if (!list.length) {
    tb.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--tx3)">לא נמצאו לקוחות</td></tr>';
    return;
  }
  tb.innerHTML = list.map(c => {
    const s = wStat(c);
    return `<tr>
      <td><div class="ci"><div class="av" style="background:${avClr(c.name)}">${ini(c.name)}</div>
        <div><div style="font-weight:600">${c.name}</div>
        ${c.projectType ? `<div style="font-size:11px;color:var(--tx3)">${c.projectType}</div>` : ''}</div></div></td>
      <td>${c.phone ? `<a href="tel:${c.phone}" style="color:var(--acc);text-decoration:none">${c.phone}</a>` : '—'}</td>
      <td>${c.city || '—'}</td>
      <td>${s ? `<span class="badge ${s.cls}">${s.lbl}</span>` : '—'}</td>
      <td>${c.debt > 0 ? `<span class="badge br">₪${c.debt.toLocaleString('he-IL')}</span>` : '<span class="badge bg">✓</span>'}</td>
      <td style="white-space:nowrap">
        <button class="btn bs btn-sm" onclick="window._viewCust('${c.id}')">👁️</button>
        <button class="btn bs btn-sm" onclick="window._editCustById('${c.id}')">✏️</button>
        <button class="btn bs btn-sm" onclick="window._openNewFault('${c.id}')">🔧</button>
        ${c.phone ? `<button class="btn bs btn-sm" onclick="window._openWA('${c.phone}')" title="WhatsApp">💬</button>` : ''}
        ${c.address ? `<button class="btn bs btn-sm" onclick="window._openNav('${encodeURIComponent(c.address + (c.city ? ' ' + c.city : ''))}')" title="ניווט">🗺️</button>` : ''}
      </td></tr>`;
  }).join('');
}

export function openNewCust() {
  _eCust = null;
  document.getElementById('M-cust-title').textContent = 'לקוח חדש';
  document.getElementById('mc-del').style.display = 'none';
  ['name','phone','email','city','address','project','equip','notes','debt-desc'].forEach(f => {
    const e = document.getElementById('mc-' + f); if (e) e.value = '';
  });
  document.getElementById('mc-install').value = '';
  document.getElementById('mc-warr').value = '0';
  document.getElementById('mc-debt').value = '0';
  document.getElementById('mc-contacts-list').innerHTML = '';
  document.getElementById('mc-addresses-list').innerHTML = '';
  openM('M-cust');
}

export function editCustById(id) {
  const c = window.custs.find(x => x.id === id); if (!c) return;
  _eCust = id;
  document.getElementById('M-cust-title').textContent = 'עריכת לקוח';
  document.getElementById('mc-del').style.display = '';
  document.getElementById('mc-name').value      = c.name || '';
  document.getElementById('mc-phone').value     = c.phone || '';
  document.getElementById('mc-email').value     = c.email || '';
  document.getElementById('mc-city').value      = c.city || '';
  document.getElementById('mc-address').value   = c.address || '';
  document.getElementById('mc-install').value   = c.installDate || '';
  document.getElementById('mc-warr').value      = c.warrantyYears || '0';
  document.getElementById('mc-project').value   = c.projectType || '';
  document.getElementById('mc-equip').value     = c.equipment || '';
  document.getElementById('mc-debt').value      = c.debt || 0;
  document.getElementById('mc-debt-desc').value = c.debtDesc || '';
  document.getElementById('mc-notes').value     = c.techNotes || '';
  document.getElementById('mc-contacts-list').innerHTML = '';
  (c.contacts || []).forEach(ct => addContactRow(ct));
  document.getElementById('mc-addresses-list').innerHTML = '';
  (c.extraAddresses || []).forEach(a => addAddressRow(a));
  openM('M-cust');
}

export function saveCust() {
  const name = document.getElementById('mc-name').value.trim();
  if (!name) { toast('שם הלקוח חובה', 'err'); return; }
  const installDate    = document.getElementById('mc-install').value;
  const warrantyYears  = document.getElementById('mc-warr').value;
  let warrantyExpiry = '';
  if (installDate && warrantyYears) {
    const d = new Date(installDate);
    d.setFullYear(d.getFullYear() + parseInt(warrantyYears));
    warrantyExpiry = d.toISOString().split('T')[0];
  }
  const c = {
    id: _eCust || uid(), name,
    phone:     document.getElementById('mc-phone').value.trim(),
    email:     document.getElementById('mc-email').value.trim(),
    city:      document.getElementById('mc-city').value.trim(),
    address:   document.getElementById('mc-address').value.trim(),
    installDate, warrantyYears, warrantyExpiry,
    projectType: document.getElementById('mc-project').value.trim(),
    equipment:   document.getElementById('mc-equip').value.trim(),
    techNotes:   document.getElementById('mc-notes').value.trim(),
    debt:        Number(document.getElementById('mc-debt').value) || 0,
    debtDesc:    document.getElementById('mc-debt-desc').value.trim(),
    contacts: [...document.querySelectorAll('#mc-contacts-list .contact-row')].map(row => ({
      name:  row.querySelector('.ct-name').value.trim(),
      phone: row.querySelector('.ct-phone').value.trim(),
      email: row.querySelector('.ct-email').value.trim(),
      role:  row.querySelector('.ct-role').value.trim(),
    })).filter(ct => ct.name || ct.phone),
    extraAddresses: [...document.querySelectorAll('#mc-addresses-list .address-row')].map(r => r.querySelector('.addr-val').value.trim()).filter(Boolean),
    createdAt: _eCust ? (window.custs.find(x => x.id === _eCust) || {}).createdAt : today(),
  };
  if (_eCust) window.custs = window.custs.map(x => x.id === _eCust ? c : x);
  else        window.custs.push(c);
  if (window._dbSaveCusts) window._dbSaveCusts(window.custs);
  addLog('customer', _eCust ? 'עריכת לקוח' : 'הוספת לקוח', c.name);
  closeM('M-cust');
  renderCusts(); renderDash();
  toast(_eCust ? 'לקוח עודכן ✅' : 'לקוח נוסף ✅');
}

export function addAddressRow(addr) {
  const row = document.createElement('div');
  row.className = 'address-row';
  row.style.cssText = 'display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center';
  row.innerHTML = `<input class="finp addr-val" placeholder="כתובת נוספת" value="${addr || ''}">
    <button type="button" onclick="this.closest('.address-row').remove()" style="background:none;border:none;color:var(--red);font-size:18px;cursor:pointer;padding:0 4px">✕</button>`;
  document.getElementById('mc-addresses-list').appendChild(row);
}

export function addContactRow(ct) {
  const row = document.createElement('div');
  row.className = 'contact-row';
  row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr 1fr auto;gap:6px;align-items:center;margin-bottom:4px';
  row.innerHTML = `
    <input class="finp ct-name"  placeholder="שם"    value="${(ct && ct.name)  || ''}">
    <input class="finp ct-phone" placeholder="טלפון" type="tel"   value="${(ct && ct.phone) || ''}">
    <input class="finp ct-email" placeholder="מייל"  type="email" value="${(ct && ct.email) || ''}">
    <input class="finp ct-role"  placeholder="תפקיד" value="${(ct && ct.role)  || ''}">
    <button type="button" onclick="this.closest('.contact-row').remove()" style="background:none;border:none;color:var(--red);font-size:18px;cursor:pointer;padding:0 4px">✕</button>`;
  document.getElementById('mc-contacts-list').appendChild(row);
}

export async function delCust() {
  if (!confirm('למחוק לקוח זה?')) return;
  const id = _eCust;
  const custName = window.custs.find(x => x.id === id)?.name || id;
  closeM('M-cust');
  toast('מוחק...');
  if (window._dbDel) {
    const ok = await window._dbDel('customers', id);
    if (!ok) { toast('שגיאה במחיקה', 'err'); return; }
  }
  window.custs = window.custs.filter(x => x.id !== id);
  addLog('customer', 'מחיקת לקוח', custName);
  renderCusts(); renderDash();
  toast('לקוח נמחק ✅');
}

export function viewCust(id) {
  const c = window.custs.find(x => x.id === id); if (!c) return;
  const s = wStat(c);
  document.getElementById('Mv-name').textContent = c.name;
  document.getElementById('Mv-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px">
      ${c.phone ? `<div><div class="flbl">טלפון</div><div style="display:flex;align-items:center;gap:8px"><a href="tel:${c.phone}" style="color:var(--acc)">${c.phone}</a><button class="btn bs btn-sm" onclick="window._openWA('${c.phone}')">💬 WhatsApp</button></div></div>` : ''}
      ${c.email ? `<div><div class="flbl">מייל</div><div>${c.email}</div></div>` : ''}
      ${c.city ? `<div><div class="flbl">עיר</div><div>${c.city}</div></div>` : ''}
      ${c.address ? `<div style="grid-column:1/-1"><div class="flbl">כתובת ראשית</div><div style="display:flex;align-items:center;gap:8px"><span>${c.address}</span><button class="btn bs btn-sm" onclick="window._openNav('${encodeURIComponent(c.address + (c.city ? ' ' + c.city : ''))}')">🗺️ ניווט</button></div></div>` : ''}
      ${(c.extraAddresses && c.extraAddresses.length) ? `<div style="grid-column:1/-1"><div class="flbl">כתובות נוספות</div>${c.extraAddresses.map(a => `<div style="padding:4px 0;font-size:13px;display:flex;align-items:center;gap:8px">📍 ${a}<button class="btn bs btn-sm" onclick="window._openNav('${encodeURIComponent(a + (c.city ? ' ' + c.city : ''))}')">🗺️</button></div>`).join('')}</div>` : ''}
      ${c.installDate ? `<div><div class="flbl">התקנה</div><div>${fmtD(c.installDate)}</div></div>` : ''}
      ${c.warrantyYears ? `<div><div class="flbl">אחריות</div><div>${c.warrantyYears} שנים ${s ? `<span class="badge ${s.cls}">${s.lbl}</span>` : ''}</div></div>` : ''}
      ${c.projectType ? `<div><div class="flbl">פרויקט</div><div>${c.projectType}</div></div>` : ''}
      ${c.equipment ? `<div style="grid-column:1/-1"><div class="flbl">ציוד</div><div>${c.equipment}</div></div>` : ''}
      ${c.debt > 0 ? `<div style="grid-column:1/-1"><div class="flbl">חוב</div><div style="color:var(--red);font-weight:700">₪${c.debt.toLocaleString('he-IL')}${c.debtDesc ? ' — ' + c.debtDesc : ''}</div></div>` : ''}
      ${c.techNotes ? `<div style="grid-column:1/-1"><div class="flbl">הערות</div><div style="color:var(--tx2)">${c.techNotes}</div></div>` : ''}
      ${(c.contacts && c.contacts.length) ? `<div style="grid-column:1/-1">
        <div class="flbl" style="margin-bottom:8px">👥 אנשי קשר נוספים</div>
        ${c.contacts.map(ct => `<div style="display:flex;align-items:center;gap:12px;padding:8px 10px;background:var(--sur2);border-radius:8px;margin-bottom:6px">
          <div style="flex:1"><div style="font-weight:600;font-size:13px">${ct.name || ''}${ct.role ? ` <span style="font-size:11px;color:var(--tx3);font-weight:400">— ${ct.role}</span>` : ''}</div>
          <div style="display:flex;gap:12px;margin-top:3px;flex-wrap:wrap">
            ${ct.phone ? `<a href="tel:${ct.phone}" style="color:var(--acc);font-size:12px">📞 ${ct.phone}</a>` : ''}
            ${ct.phone ? `<button class="btn bs btn-sm" style="font-size:11px" onclick="window._openWA('${ct.phone}')">💬</button>` : ''}
            ${ct.email ? `<a href="mailto:${ct.email}" style="color:var(--cya);font-size:12px">✉️ ${ct.email}</a>` : ''}
          </div></div></div>`).join('')}
      </div>` : ''}
    </div>`;

  // fault history
  const custFaults = window.faults.filter(f => f.custId === id).sort((a, b) => (b.created || '').localeCompare(a.created || ''));
  if (custFaults.length) {
    const SMAP = { open: '🔵 פתוחה', scheduled: '📅 נקבע', done: '✅ טופל' };
    document.getElementById('Mv-body').innerHTML += `
      <div style="margin-top:16px;border-top:1px solid var(--brd);padding-top:14px">
        <div class="flbl" style="margin-bottom:10px">🔧 היסטוריית משימות (${custFaults.length})</div>
        ${custFaults.map(f => `<div style="padding:8px 10px;background:var(--sur2);border-radius:8px;margin-bottom:6px;border-right:3px solid ${f.status === 'done' ? 'var(--grn)' : f.status === 'scheduled' ? 'var(--yel)' : 'var(--acc)'}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div style="font-size:13px;font-weight:600;flex:1">${f.desc || ''}</div>
            <span style="font-size:11px;color:var(--tx3);white-space:nowrap;margin-right:8px">${SMAP[f.status] || f.status}</span>
          </div>
          <div style="font-size:11px;color:var(--tx3);margin-top:3px;display:flex;gap:10px;flex-wrap:wrap">
            ${f.created ? `<span>📅 ${fmtD(f.created)}</span>` : ''}
            ${f.amount > 0 ? `<span>💰 ₪${parseFloat(f.amount).toLocaleString('he-IL')} — ${f.paid === 'yes' ? '✅ שולם' : f.paid === 'partial' ? '⚠️ חלקי' : '❌ לא שולם'}</span>` : ''}
            ${f.updatedBy ? `<span>✏️ ${f.updatedBy}</span>` : ''}
          </div>
        </div>`).join('')}
      </div>`;
  }

  document.getElementById('Mv-del').onclick = async () => {
    const delName = window.custs.find(x => x.id === id)?.name || id;
    if (!confirm('למחוק?')) return;
    closeM('M-view');
    toast('מוחק...');
    if (window._dbDel) {
      const ok = await window._dbDel('customers', id);
      if (!ok) { toast('שגיאה במחיקה', 'err'); return; }
    }
    window.custs = window.custs.filter(x => x.id !== id);
    addLog('customer', 'מחיקת לקוח', delName);
    renderCusts(); renderDash();
    toast('לקוח נמחק ✅');
  };
  document.getElementById('Mv-edit').onclick  = () => { closeM('M-view'); editCustById(id); };
  document.getElementById('Mv-fault').onclick = () => { closeM('M-view'); window._openNewFault(id); };
  openM('M-view');
}
