// ══ db.js — Firebase init, data loading, real-time listeners, _db* helpers ══

import { initializeApp }         from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js';
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc, onSnapshot }
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

// ── _db* helpers ─────────────────────────────────────────────────────────

// שמירת Token של משתמש להתראות פוש
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
    renderDash();
    setTimeout(gcalInit, 400);
    toast('עובד ללא חיבור לענן', 'warn');
  }, 7000);

  try {
    const [cs, fs, ns, ws, ls, ss] = await Promise.all([
      getDocs(collection(db, 'customers')),
      getDocs(collection(db, 'faults')),
      getDocs(collection(db, 'notes')),
      getDocs(collection(db, 'whatsapp')),
      getDocs(collection(db, 'log')),
      getDocs(collection(db, 'settings')),
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

    hideLoader();
    renderDash();
    setTimeout(gcalInit, 400);

    // ── Listeners ──
    onSnapshot(collection(db, 'customers'), snap => {
      const del = window._deletingIds || new Set();
      window.custs = snap.docs.map(d => d.data()).filter(c => !del.has('customers:' + c.id));
      const on = p => document.getElementById('pg-' + p)?.classList.contains('on');
      if (on('customers')) renderCusts();
      if (on('warranties')) renderWarr();
      if (on('debts')) renderDebts();
      renderDash();
    });

    onSnapshot(collection(db, 'faults'), snap => {
      const del = window._deletingIds || new Set();
      window.faults = snap.docs.map(d => d.data()).filter(f => !del.has('faults:' + f.id));
      if (document.getElementById('pg-faults')?.classList.contains('on')) renderFaults();
      if (document.getElementById('pg-archive')?.classList.contains('on')) renderArchive();
      renderDash();
    });

    onSnapshot(collection(db, 'log'), snap => {
      window.logEntries = snap.docs.map(d => d.data());
      if (document.getElementById('pg-log')?.classList.contains('on')) renderLog();
    });

  } catch (e) {
    clearTimeout(timeout);
    hideLoader();
    console.error('Firebase error:', e);
    renderDash();
    toast('עובד במצב לא מקוון', 'warn');
  }
}