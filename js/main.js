// ══ faults.js — faults / tasks page ══

import { USERS, SERVICE_ACCOUNT } from './config.js';
import { uid, today, fmtD, avClr, ini, toast } from './utils.js';
import { openM, closeM } from './nav.js';
import { addLog } from './log.js';
import { renderDash } from './dashboard.js';
import { renderArchive } from './archive.js';

// ייבוא פונקציות Firestore לצורך שליחת התראות
import { getFirestore, collection, addDoc } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

let _eFault      = null;
let _selectMode  = false;
let _selectedIds = new Set();

// ... (שאר הפונקציות renderFaults, updateFaultVatNote ללא שינוי)

export async function saveFault() {
  const custVal  = document.getElementById('mf-cust').value;
  const isGuest  = custVal === '__guest__';
  const desc     = document.getElementById('mf-desc').value.trim();
  if ((!custVal && !isGuest) || !desc) { toast('מלא שדות חובה', 'err'); return; }

  const f = {
    id:          _eFault || uid(),
    custId:      isGuest ? '' : custVal,
    guestName:   isGuest ? document.getElementById('mf-guest-name').value.trim() : '',
    guestPhone:  isGuest ? document.getElementById('mf-guest-phone').value.trim() : '',
    desc,
    type:        document.getElementById('mf-type').value,
    priority:    document.getElementById('mf-pri').value,
    status:      document.getElementById('mf-status').value,
    date:        document.getElementById('mf-date').value,
    time:        document.getElementById('mf-time').value,
    amount:      parseFloat(document.getElementById('mf-amount').value) || 0,
    amountPlusVat: document.getElementById('mf-amount-vat').checked,
    paid:        document.getElementById('mf-paid').value,
    notes:       document.getElementById('mf-notes').value.trim(),
    updatedBy:   window._currentUser || '',
    created:     _eFault ? (window.faults.find(x => x.id === _eFault) || {}).created : today(),
  };

  const isNew = !_eFault;
  if (_eFault) window.faults = window.faults.map(x => x.id === _eFault ? f : x);
  else         window.faults.push(f);
  if (window._dbSaveFaults) await window._dbSaveFaults(window.faults);

  const fCust = f.custId ? window.custs.find(x => x.id === f.custId) : null;
  const custLabel = fCust ? fCust.name : f.guestName || 'לקוח מזדמן';
  addLog('fault', isNew ? 'הוספת משימה' : 'עריכת משימה', custLabel + ' — ' + (f.desc || '').slice(0, 40));

  closeM('M-fault'); renderFaults(); renderDash(); toast('נשמר ✅');
  
  // שליחת בקשת התראה ל-Firestore
  _requestPushNotification(isNew ? 'חדשה' : 'עודכנה', custLabel, f.desc);
}

async function _requestPushNotification(action, custLabel, desc) {
    const db = getFirestore();
    const title = `🔧 משימה ${action} - ${window._currentUser}`;
    const body = `${custLabel}: ${desc.substring(0, 50)}`;
    
    const targetTokens = [];
    USERS.forEach(u => {
        if (u.name !== window._currentUser && u.tokens) {
            targetTokens.push(...u.tokens);
        }
    });

    if (targetTokens.length === 0) return;

    try {
        await addDoc(collection(db, 'notifications'), {
            title,
            body,
            tokens: targetTokens,
            url: '/Client-PRO/',
            createdAt: new Date().toISOString(),
            status: 'pending'
        });
    } catch (e) {
        console.error("Failed to save notification:", e);
    }
}

// ... (שאר הקובץ delFault, toggleSelectMode וכו' ללא שינוי)