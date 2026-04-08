// ══ db.js — Firebase init, data loading, real-time listeners, _db* helpers ══

import { initializeApp }         from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js';
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, query, orderBy, limit, enableIndexedDbPersistence }
  from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

import { FIREBASE_CONFIG, USERS } from './config.js';
import { loader, hideLoader, toast } from './utils.js';
import { gcalInit } from './gcal.js';

import { renderDash }      from './dashboard.js';
import { renderCusts }     from './customers.js';
import { renderWarr }      from './warranties.js';
import { renderDebts }     from './debts.js';
import { renderFaults }    from './faults.js';
import { renderNotes }     from './notes.js';
import { renderArchive }   from './archive.js';
import { renderLog }       from './log.js';

const app = initializeApp(FIREBASE_CONFIG);
export const db = getFirestore(app);

// 💡 הפעלת מנגנון Offline (שמירת נתונים מקומית על המכשיר)
try {
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('לא ניתן להפעיל אופליין בכמה חלונות במקביל');
        } else if (err.code == 'unimplemented') {
            console.warn('הדפדפן הזה לא תומך בשמירת נתונים ללא אינטרנט');
        }
    });
} catch(e) {}

let _firstLoadFaults = true;

// ── _db* helpers exposed on window ────────────────────────────────────────

window._dbSaveCusts = async (items) => {
  try {
    const normalized = items.map(c => ({ ...c, debt: Math.max(0, Number(c.debt) || 0) }));
    await Promise.all(normalized.map(c => setDoc(doc(db, 'customers', c.id), c)));
  } catch (e) { console.error('saveCusts:', e); }
};

window._dbSaveFaults = async (items) => {
  try { await Promise.all(items.map(f => setDoc(doc(db, 'faults', f.id), f))); }
  catch (e) { console.error('saveFaults:', e); }
};

window._dbSaveNotes = async (items) => {
  try { await Promise.all(items.map(n => setDoc(doc(db, 'notes', n.id), n))); }
  catch (e) { console.error('saveNotes:', e); }
};

window._dbLogAdd = async (entry) => {
  try { await setDoc(doc(db, 'log', entry.id), entry); }
  catch (e) { console.error('logAdd:', e); }
};

window._dbSaveCfg = async (cfg) => {
  try { await setDoc(doc(db, 'settings', 'main'), cfg); }
  catch (e) { console.error('saveCfg:', e); }
  localStorage.setItem('crm_cfg', JSON.stringify(cfg));
};

window._dbDel = async (col, id) => {
  try {
    window._deletingIds = window._deletingIds || new Set();
    window._deletingIds.add(col + ':' + id);
    await deleteDoc(doc(db, col, id));
    return true;
  } catch (e) {
    console.error('Delete error:', e);
    window._deletingIds && window._deletingIds.delete(col + ':' + id);
    return false;
  }
};

window._dbDelMulti = async (col, ids) => {
  try {
    window._deletingIds = window._deletingIds || new Set();
    ids.forEach(id => window._deletingIds.add(col + ':' + id));
    await Promise.all(ids.map(id => deleteDoc(doc(db, col, id))));
    return true;
  } catch (e) {
    console.error('DeleteMulti error:', e);
    ids.forEach(id => window._deletingIds && window._deletingIds.delete(col + ':' + id));
    return false;
  }
};

function _triggerRemoteNotification(f) {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
  if (Notification.permission === 'granted') {
    const c = f.custId ? window.custs.find(x => x.id === f.custId) : null;
    const name = c ? c.name : (f.guestName || 'לקוח מזדמן');
    const body = `נוסף ע"י ${f.updatedBy || 'מערכת'}: ${name} — ${(f.desc || '').slice(0, 50)}`;

    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification('🔧 משימה חדשה!', {
        body: body,
        icon: 'app-icon-192.jpg',
        badge: 'app-icon-192.jpg',
        vibrate: [200, 100, 200, 100, 200],
        dir: 'rtl',
        lang: 'he',
        tag: 'remote-fault-' + f.id
      });
    });
  }
}

// ── loadAll — initial bulk load + start listeners ─────────────────────────
export async function loadAll() {
  loader('טוען נתונים...');

  // אתחול מערכים למניעת קריסה אם הנתונים טרם נטענו
  window.custs = window.custs || [];
  window.faults = window.faults || [];
  window.notes = window.notes || [];
  window.waMessages = window.waMessages || [];
  window.logEntries = window.logEntries || [];

  if (!navigator.onLine) {
      toast('המערכת פועלת כרגע ללא אינטרנט (אופליין) ✈️', 'warn');
  }

  try {
    // 1. הגדרות מערכת (משתמשים) - קריטי להתחברות
    onSnapshot(doc(db, 'settings', 'main'), snap => {
      if (snap.exists()) {
        Object.assign(window.cfg, snap.data());
        localStorage.setItem('crm_cfg', JSON.stringify(window.cfg));
        if (window.cfg.users && window.cfg.users.length) {
          USERS.length = 0;
          window.cfg.users.forEach(u => USERS.push(u));
        }
      }
    });

    // 2. לקוחות
    onSnapshot(collection(db, 'customers'), snap => {
      const del = window._deletingIds || new Set();
      window.custs = snap.docs
        .map(d => { const data = d.data(); return { ...data, debt: Math.max(0, Number(data.debt) || 0) }; })
        .filter(c => !del.has('customers:' + c.id));
      
      const on = p => document.getElementById('pg-' + p)?.classList.contains('on');
      if (on('customers'))  renderCusts();
      if (on('warranties')) renderWarr();
      if (on('debts'))      renderDebts();
      if (on('dashboard'))  renderDash();
    });

    // 3. משימות
    onSnapshot(collection(db, 'faults'), snap => {
      const del = window._deletingIds || new Set();
      const currentFaults = snap.docs.map(d => d.data()).filter(f => !del.has('faults:' + f.id));
      
      if (!_firstLoadFaults && window.faults && window.faults.length > 0) {
        const newFaults = currentFaults.filter(cf => !window.faults.some(wf => wf.id === cf.id));
        newFaults.forEach(nf => {
          if (nf.updatedBy && nf.updatedBy !== window._currentUser) {
            _triggerRemoteNotification(nf);
          }
        });
      }

      window.faults = currentFaults;
      _firstLoadFaults = false; 

      const on = p => document.getElementById('pg-' + p)?.classList.contains('on');
      if (on('faults')) renderFaults();
      if (on('archive')) renderArchive();
      if (on('dashboard')) renderDash();
    });

    // 4. וואטסאפ (אם בשימוש)
    onSnapshot(collection(db, 'whatsapp'), snap => {
      window.waMessages = snap.docs.map(d => d.data());
      window.waMessages.forEach(m => {
        if (!m.custId) {
          const phone = (m.from || '').replace(/\D/g, '');
          const matched = window.custs.find(c => c.phone && c.phone.replace(/\D/g, '').includes(phone.slice(-9)));
          if (matched) m.custId = matched.id;
        }
      });
    });

    // 5. הערות
    onSnapshot(collection(db, 'notes'), snap => {
      const del = window._deletingIds || new Set();
      window.notes = snap.docs.map(d => d.data()).filter(n => !del.has('notes:' + n.id));
      
      const on = p => document.getElementById('pg-' + p)?.classList.contains('on');
      if (on('notes')) renderNotes();
      if (on('dashboard')) renderDash();
    });

    // 6. לוגים
    onSnapshot(query(collection(db, 'log'), orderBy('ts', 'desc'), limit(50)), snap => {
      window.logEntries = snap.docs.map(d => d.data());
      if (document.getElementById('pg-log')?.classList.contains('on')) renderLog();
    });

    // מסיר את מגן הטעינה לאחר שהמאזינים נרשמו והתחילו למשוך מהזיכרון המקומי
    setTimeout(() => {
        hideLoader();
        renderDash();
        setTimeout(gcalInit, 400);
    }, 800);

    // ── תיקוני דאטה היסטוריים (מופעל לאחר כמה שניות כדי לא לעכב את האפליקציה) ──
    setTimeout(() => {
      if(!window.custs || window.custs.length === 0) return;
      
      // תיקון אחריות ישנה
      const warNeedsFix = window.custs.filter(c => c.warrantyYears === '2' || c.warrantyYears === 2);
      if (warNeedsFix.length > 0) {
        warNeedsFix.forEach(c => { c.warrantyYears = '0'; });
        window._dbSaveCusts(warNeedsFix).catch(() => {});
      }
      
      // תיקון חובות שהם במבנה טקסט במקום מספר
      const debtNeedsFix = window.custs.filter(c => typeof c.debt === 'string' && c.debt !== '' && c.debt !== '0');
      if (debtNeedsFix.length > 0) {
          debtNeedsFix.forEach(c => {
             c.debt = Math.max(0, Number(c.debt) || 0);
          });
          window._dbSaveCusts(debtNeedsFix).catch(() => {});
      }
    }, 5000); 

  } catch (e) {
    hideLoader();
    console.error('Offline setup error:', e);
    toast('שגיאה בטעינת נתונים', 'err');
    renderDash();
    setTimeout(gcalInit, 400);
  }
}