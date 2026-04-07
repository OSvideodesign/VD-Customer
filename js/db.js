// ══ db.js — Firebase init, data loading, real-time listeners ══

import { initializeApp }         from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js';
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc, onSnapshot }
  from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';
import { getMessaging, getToken } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging.js';

import { FIREBASE_CONFIG, USERS, VAPID_KEY } from './config.js';
import { loader, hideLoader, toast } from './utils.js';
import { gcalInit } from './gcal.js';

// ייצוא ה-app וה-db לשימוש שאר הקבצים
export const app = initializeApp(FIREBASE_CONFIG);
export const db = getFirestore(app);

// ── לוגיקת TOKEN (מופעל מהגדרות) ──
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
                const area = document.getElementById('token-display-area');
                const inp = document.getElementById('device-token');
                if (area && inp) { area.style.display = 'block'; inp.value = token; }
                
                if (window._currentUser) {
                    await setDoc(doc(db, 'fcm_tokens', window._currentUser), {
                        token: token,
                        updated: new Date().toISOString(),
                        platform: navigator.platform
                    });
                }
                toast('התראות הופעלו בהצלחה! ✅');
            }
        } catch (err) { console.error('FCM Error:', err); toast('שגיאה בהנפקת Token', 'err'); }
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
      updated: new Date().toISOString()
    });
  } catch (e) { console.error(e); }
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
}

window._dbDel = async (col, id) => {
  try {
    window._deletingIds = window._deletingIds || new Set();
    window._deletingIds.add(col + ':' + id);
    await deleteDoc(doc(db, col, id));
    return true;
  } catch (e) { return false; }
};

// ── loadAll — initial bulk load + start listeners ─────────────────────────
export async function loadAll() {
  loader('מתחבר לענן...');
  try {
    const [cs, fs, ns, ws, ls, ss, ts] = await Promise.all([
      getDocs(collection(db, 'customers')),
      getDocs(collection(db, 'faults')),
      getDocs(collection(db, 'notes')),
      getDocs(collection(db, 'whatsapp')),
      getDocs(collection(db, 'log')),
      getDocs(collection(db, 'settings')),
      getDocs(collection(db, 'fcm_tokens')).catch(() => ({ docs: [] })) // טעינת הטוקנים של כל המשתמשים לאדמין
    ]);
    
    window.custs      = cs.docs.map(d => ({ ...d.data(), debt: Math.max(0, Number(d.data().debt) || 0) }));
    window.faults     = fs.docs.map(d => d.data());
    window.notes      = ns.docs.map(d => d.data());
    window.waMessages = ws.docs.map(d => d.data());
    window.logEntries = ls.docs.map(d => d.data());
    window.fcmTokens  = ts.docs.map(d => ({ id: d.id, ...d.data() }));

    hideLoader();
    if (window.renderDash) window.renderDash();
    setTimeout(gcalInit, 400);

    // מאזינים בזמן אמת - קוראים לפונקציות דרך window כדי למנוע לולאת Import
    onSnapshot(collection(db, 'customers'), snap => {
      window.custs = snap.docs.map(d => d.data());
      if (window.renderCusts) window.renderCusts();
      if (window.renderDash) window.renderDash();
    });

    onSnapshot(collection(db, 'faults'), snap => {
      window.faults = snap.docs.map(d => d.data());
      if (window.renderFaults) window.renderFaults();
      if (window.renderDash) window.renderDash();
    });

    onSnapshot(collection(db, 'notes'), snap => {
      window.notes = snap.docs.map(d => d.data());
      if (window.renderNotes) window.renderNotes();
      if (window.renderDash) window.renderDash();
    });

    // האזנה בזמן אמת לטוקנים
    onSnapshot(collection(db, 'fcm_tokens'), snap => {
      window.fcmTokens = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    });

  } catch (e) {
    hideLoader();
    console.error('Firebase error:', e);
    if (window.renderDash) window.renderDash();
  }
}