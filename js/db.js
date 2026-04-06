// ══ db.js — Firebase init, data loading, real-time listeners ══

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js';
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';
import { getMessaging, getToken } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging.js';

import { FIREBASE_CONFIG, USERS, VAPID_KEY } from './config.js';
import { loader, hideLoader, toast } from './utils.js';
import { gcalInit } from './gcal.js';

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
                // הצגה ב-SETTINGS
                const area = document.getElementById('token-display-area');
                const inp = document.getElementById('device-token');
                if (area && inp) { area.style.display = 'block'; inp.value = token; }
                
                if (window._currentUser) {
                    await setDoc(doc(db, 'fcm_tokens', window._currentUser), {
                        token: token,
                        updated: new Date().toISOString()
                    });
                }
                toast('התראות הופעלו! ✅');
            }
        } catch (err) { console.error(err); toast('שגיאה בחיבור לענן', 'err'); }
    }
};

// ── _db* helpers ──
window._dbSaveCusts = async (items) => {
  try {
    const normalized = items.map(c => ({ ...c, debt: Math.max(0, Number(c.debt) || 0) }));
    await Promise.all(normalized.map(c => setDoc(doc(db, 'customers', c.id), c)));
  } catch (e) { console.error(e); }
};
window._dbSaveFaults = async (items) => {
  try { await Promise.all(items.map(f => setDoc(doc(db, 'faults', f.id), f))); } catch (e) { console.error(e); }
};
window._dbSaveNotes = async (items) => {
  try { await Promise.all(items.map(n => setDoc(doc(db, 'notes', n.id), n))); } catch (e) { console.error(e); }
};
window._dbLogAdd = async (entry) => {
  try { await setDoc(doc(db, 'log', entry.id), entry); } catch (e) { console.error(e); }
};
window._dbDel = async (col, id) => {
  try {
    window._deletingIds = window._deletingIds || new Set();
    window._deletingIds.add(col + ':' + id);
    await deleteDoc(doc(db, col, id));
    return true;
  } catch (e) { console.error(e); return false; }
};

export async function loadAll() {
  loader('מתחבר לענן...');
  try {
    const [cs, fs, ns, ws, ls, ss] = await Promise.all([
      getDocs(collection(db, 'customers')),
      getDocs(collection(db, 'faults')),
      getDocs(collection(db, 'notes')),
      getDocs(collection(db, 'whatsapp')),
      getDocs(collection(db, 'log')),
      getDocs(collection(db, 'settings')),
    ]);
    
    window.custs = cs.docs.map(d => ({ ...d.data(), id: d.id }));
    window.faults = fs.docs.map(d => d.data());
    window.notes = ns.docs.map(d => d.data());

    hideLoader();
    if (window.renderDash) window.renderDash();
    setTimeout(gcalInit, 400);

    // מאזינים (ללא ייבוא - משתמש ב-window)
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
  } catch (e) { console.error(e); hideLoader(); }
}