// ══ config.js — USERS, Firebase config, constants ══

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBDclbzeGdzxzS1rklQRDYp3cnndVOVTuA",
  authDomain: "vd-clientpro.firebaseapp.com",
  projectId: "vd-clientpro",
  storageBucket: "vd-clientpro.firebasestorage.app",
  messagingSenderId: "35797095244",
  appId: "1:35797095244:web:d1d0d572fb26571cf6b5e9"
};

// מפתחות להתראות Push - הכנס כאן את המפתחות מה-Console
export const VAPID_KEY = "YOUR_VAPID_KEY_HERE"; 
export const FCM_SERVER_KEY = "YOUR_SERVER_KEY_HERE"; 

export const USERS = [
  { name: 'אופיר', pass: '',          color: '#3b82f6', role: 'owner', tokens: [] },
  { name: 'רז',    pass: 'Raz4123',   color: '#f1f5f9', role: 'admin', tokens: [] },
  { name: 'גלאל',  pass: 'Jalal4123', color: '#10b981', role: 'installer', tokens: [] },
  { name: 'מוטי',  pass: 'Moti4123',  color: '#06b6d4', role: 'installer', tokens: [] },
];

export const NCAT = {
  general:  '📌 כללי',
  meeting:  '🤝 פגישה',
  reminder: '⏰ תזכורת',
};

export const NCAT_CLR = {
  general:  'var(--acc)',
  meeting:  'var(--grn)',
  reminder: 'var(--yel)',
};

export const DEFAULT_PERMS = {
  owner:     { customers: 3, faults: 3, archive: 3, notes: 3, warranties: 3, debts: 3, reports: 3 },
  admin:     { customers: 3, faults: 3, archive: 3, notes: 3, warranties: 3, debts: 3, reports: 3 },
  manager:   { customers: 2, faults: 2, archive: 2, notes: 2, warranties: 2, debts: 2, reports: 2 },
  installer: { customers: 1, faults: 2, archive: 2, notes: 2, warranties: 1, debts: 0, reports: 0 },
  tech:      { customers: 1, faults: 2, archive: 2, notes: 2, warranties: 1, debts: 0, reports: 0 },
};

export const PERM_MODULES = [
  { key: 'customers',  label: '👥 לקוחות' },
  { key: 'faults',     label: '🔧 משימות' },
  { key: 'archive',    label: '✅ ארכיון' },
  { key: 'notes',      label: '📝 הערות' },
  { key: 'warranties', label: '🛡️ אחריות' },
  { key: 'debts',      label: '💰 חובות' },
  { key: 'reports',    label: '📈 דוחות' },
];

export const GCAL_CID = '830672993595-f7fdfqj14qtnns6g0cmrb7m7nh30obqg.apps.googleusercontent.com';