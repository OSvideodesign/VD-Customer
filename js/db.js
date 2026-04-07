// ══ db.js — Firebase init, data loading, real-time listeners, _db* helpers ══

import { initializeApp }         from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js';
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc, onSnapshot }
  from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';
import { getMessaging, getToken } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging.js';

import { FIREBASE_CONFIG, USERS, VAPID_KEY } from './config.js';
import { loader, hideLoader, toast } from './utils.js';
import { gcalInit } from './gcal.js';

// ❌ הורדתי מכאן את ה-imports ל-dashboard ול-faults כדי למנוע את הקריסה של הדפדפן ומסך הכניסה!

export const app = initializeApp(FIREBASE_CONFIG);
export const db = getFirestore(app);

// ── לוגיקת התראות פוש ו-TOKEN ──
window._handlePushPermission = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) { 
        toast('הדפדפן לא תומך בהתראות', 'err'); 
        return; 
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        try {
            const messaging = getMessaging(app);
            const token = await getToken(messaging, { vapidKey: VAPID_KEY });
            
            if (token) {
                // הצגה באפליקציה (SETTINGS)
                const area = document.getElementById('token-display-area');
                const inp = document.getElementById('device-token');
                if (area && inp) {
                    area.style.display = 'block';
                    inp.value = token;
                }
                
                // שמירה ב-DB תחת המשתמש
                if (window._currentUser) {
                    await setDoc(doc(db, 'fcm_tokens', window._currentUser), {
                        token: token,
                        updated: new Date().toISOString(),
                        platform: navigator.platform
                    });
                }
                toast('התראות הופעלו בהצלחה! ✅');
            }
        } catch (err) {
            console.error('FCM Error:', err);
            toast('שגיאה בהנפקת Token', 'err');
        }
    } else {
        toast('התראות נחסמו ע"י המערכת', 'err');
    }
};

// ── _db* helpers ─────────────────────────────────────────────────────────

window._dbSaveToken = async (user, token) => {
  if (!user || !token) return;
  try {
    await setDoc(doc(db, 'fcm_tokens', user), {
      token: token,
      updated: new Date().toISOString(),
      platform: navigator.platform
    });
    console.log('Push token saved for:', user);
  } catch (e) { console.error('Error saving token:', e); }
};

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

// ── loadAll — initial bulk load + start listeners ─────────────────────────
export async function loadAll() {
  loader('מתחבר לענן...');

  const timeout = setTimeout(() => {
    hideLoader();
    window.custs = []; window.faults = [];
    if (window.renderDash) window.renderDash();
    setTimeout(gcalInit, 400);
    toast('עובד ללא חיבור לענן', 'warn');
  }, 7000);

  try {
    const [cs, fs, ns, ws, ls, ss, ts] = await Promise.all([
      getDocs(collection(db, 'customers')),
      getDocs(collection(db, 'faults')),
      getDocs(collection(db, 'notes')),
      getDocs(collection(db, 'whatsapp')),
      getDocs(collection(db, 'log')),
      getDocs(collection(db, 'settings')),
      getDocs(collection(db, 'fcm_tokens')).catch(() => ({ docs: [] })) // טעינת הטוקנים
    ]);
    clearTimeout(timeout);

    const cfgDoc = ss.docs.find(d => d.id === 'main');
    if (cfgDoc) {
      Object.assign(window.cfg, cfgDoc.data());
      localStorage.setItem('crm_cfg', JSON.stringify(window.cfg));
      if (window.cfg.users && window.cfg.users.length) {
        USERS.length = 0;
        window.cfg.users.forEach(u => USERS.push(u));
      }
    }

    window.custs      = cs.docs.map(d => { const data = d.data(); return { ...data, debt: Math.max(0, Number(data.debt) || 0) }; });
    window.faults     = fs.docs.map(d => d.data());
    window.notes      = ns.docs.map(d => d.data());
    window.waMessages = ws.docs.map(d => d.data());
    window.logEntries = ls.docs.map(d => d.data());
    window.fcmTokens  = ts.docs.map(d => ({ id: d.id, ...d.data() }));

    hideLoader();
    if (window.renderDash) window.renderDash();
    setTimeout(gcalInit, 400);

    // ── Listeners ──
    onSnapshot(collection(db, 'customers'), snap => {
      const del = window._deletingIds || new Set();
      window.custs = snap.docs.map(d => d.data()).filter(c => !del.has('customers:' + c.id));
      const on = p => document.getElementById('pg-' + p)?.classList.contains('on');
      if (on('customers') && window.renderCusts) window.renderCusts();
      if (on('warranties') && window.renderWarr) window.renderWarr();
      if (on('debts') && window.renderDebts) window.renderDebts();
      if (window.renderDash) window.renderDash();
    });

    onSnapshot(collection(db, 'faults'), snap => {
      const del = window._deletingIds || new Set();
      window.faults = snap.docs.map(d => d.data()).filter(f => !del.has('faults:' + f.id));
      const on = p => document.getElementById('pg-' + p)?.classList.contains('on');
      if (on('faults') && window.renderFaults) window.renderFaults();
      if (on('archive') && window.renderArchive) window.renderArchive();
      if (window.renderDash) window.renderDash();
    });

    onSnapshot(collection(db, 'notes'), snap => {
      const del = window._deletingIds || new Set();
      window.notes = snap.docs.map(d => d.data()).filter(n => !del.has('notes:' + n.id));
      const on = p => document.getElementById('pg-' + p)?.classList.contains('on');
      if (on('notes') && window.renderNotes) window.renderNotes();
      if (window.renderDash) window.renderDash();
    });

    onSnapshot(collection(db, 'log'), snap => {
      window.logEntries = snap.docs.map(d => d.data());
      const on = p => document.getElementById('pg-' + p)?.classList.contains('on');
      if (on('log') && window.renderLog) window.renderLog();
    });

    // האזנה בזמן אמת לטוקנים
    onSnapshot(collection(db, 'fcm_tokens'), snap => {
      window.fcmTokens = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    });

  } catch (e) {
    clearTimeout(timeout);
    hideLoader();
    console.error('Firebase error:', e);
    if (window.renderDash) window.renderDash();
    toast('עובד במצב לא מקוון', 'warn');
  }
}