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

try {
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('לא ניתן להפעיל אופליין בכמה חלונות במקביל');
        } else if (err.code == 'unimplemented') {
            console.warn('הדפדפן הזה לא תומך בשמירת נתונים ללא אינטרנט');
        }
    });
} catch(e) {}

// משתנה שעוקב האם זו טעינה ראשונה של הלוגים (כדי למנוע קפיצת התראות על דברים ישנים כשרק פותחים)
let _firstLoadLogs = true;

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

export async function loadAll() {
  loader('טוען נתונים...');

  window.custs = window.custs || [];
  window.faults = window.faults || [];
  window.notes = window.notes || [];
  window.waMessages = window.waMessages || [];
  window.logEntries = window.logEntries || [];

  if (!navigator.onLine) {
      toast('המערכת פועלת כרגע ללא אינטרנט (אופליין) ✈️', 'warn');
  }

  try {
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

    onSnapshot(collection(db, 'faults'), snap => {
      const del = window._deletingIds || new Set();
      window.faults = snap.docs.map(d => d.data()).filter(f => !del.has('faults:' + f.id));

      const on = p => document.getElementById('pg-' + p)?.classList.contains('on');
      if (on('faults')) renderFaults();
      if (on('archive')) renderArchive();
      if (on('dashboard')) renderDash();
    });

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

    onSnapshot(collection(db, 'notes'), snap => {
      const del = window._deletingIds || new Set();
      window.notes = snap.docs.map(d => d.data()).filter(n => !del.has('notes:' + n.id));

      const on = p => document.getElementById('pg-' + p)?.classList.contains('on');
      if (on('notes')) renderNotes();
      if (on('dashboard')) renderDash();
    });

    // ── המוח של ההתראות המובנות (בזמן אמת) ──
    onSnapshot(query(collection(db, 'log'), orderBy('ts', 'desc'), limit(50)), snap => {
      const newLogs = snap.docs.map(d => d.data());
      const oldLogs = window.logEntries || [];
      window.logEntries = newLogs;

      if (document.getElementById('pg-log')?.classList.contains('on')) renderLog();

      // אם זו לא פתיחה ראשונה, ויש לוגים, נבדוק אם התווסף משהו על ידי משתמש אחר!
      if (!_firstLoadLogs && oldLogs.length > 0) {
         const added = newLogs.filter(n => !oldLogs.some(o => o.id === n.id) && n.user !== window._currentUser);
         added.forEach(log => {
             // מקפיץ התראה (Toast) קטנה בתוך האפליקציה על כל שינוי שמישהו אחר עשה
             toast(`🔔 ${log.user}: ${log.action}`, 'success'); 
         });
      }
      _firstLoadLogs = false;
    });

    setTimeout(() => {
        hideLoader();
        renderDash();
        setTimeout(gcalInit, 400);

        // ── התראות "מה פספסת" (כשנכנסים לאפליקציה אחרי היעדרות) ──
        const lastLogin = parseInt(localStorage.getItem('vd_last_login') || '0');
        const now = Date.now();
        localStorage.setItem('vd_last_login', now.toString()); // מתעדכן לפעם הבאה

        if (lastLogin > 0 && window.logEntries.length > 0) {
            // מחפש פעולות של עובדים אחרים שקרו מאז ההתחברות האחרונה שלך
            const missed = window.logEntries.filter(l => l.ts > lastLogin && l.user !== window._currentUser);
            
            if (missed.length > 0) {
                let html = missed.map(l => `
                    <div style="padding:10px; border-bottom:1px solid rgba(255,255,255,0.05); margin-bottom:8px; background:rgba(0,0,0,0.2); border-radius:6px;">
                        <div style="font-weight:700; color:var(--acc); display:flex; justify-content:space-between;">
                            <span>👤 ${l.user}</span>
                            <span style="color:var(--tx3); font-size:11px;">${new Date(l.ts).toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <div style="font-weight:600; font-size:14px; margin-top:2px;">${l.action}</div>
                        <div style="opacity:0.8; font-size:12px; margin-top:2px;">${l.desc}</div>
                    </div>
                `).join('');
                
                const mb = document.getElementById('missed-body');
                if (mb) {
                    mb.innerHTML = html;
                    const missedModal = document.getElementById('M-missed');
                    if (missedModal) missedModal.style.display = 'flex';
                }
            }
        }

    }, 800);

  } catch (e) {
    hideLoader();
    console.error('Offline setup error:', e);
    toast('שגיאה בטעינת נתונים', 'err');
    renderDash();
    setTimeout(gcalInit, 400);
  }
}