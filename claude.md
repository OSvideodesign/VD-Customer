# claude.md — Client-PRO Project Memory
# Video Design CRM · Last Updated: 2026-04-01

---

## 1. PROFESSIONAL CONTEXT

### What is this app?
A PWA (Progressive Web App) CRM built for a company called "Video Design" (וידאו דיזיין).
It manages security/CCTV installation clients — handling customers, service faults,
warranties, debts, general notes, and WhatsApp messages.

### Deployment
- Hosted at: `/Client-PRO/`
- Firebase project: `vd-clientpro`
- Firebase app ID: `1:35797095244:web:d1d0d572fb26571cf6b5e9`

### Core Entities (Firestore Collections)
| Collection    | Description                              |
|---------------|------------------------------------------|
| `customers`   | Client records with warranty, debt, contacts |
| `faults`      | Service tasks/faults (open → archive on done) |
| `notes`       | General notes (general / meeting / reminder)  |
| `whatsapp`    | Incoming WhatsApp messages               |
| `log`         | Audit log of all user actions            |
| `settings`    | Single doc `main` — company config + users array |

### Integrations
- **Firebase Firestore** — real-time DB (onSnapshot listeners)
- **Google Calendar OAuth2** — read-only; token stored in `localStorage`
  - Client ID: `830672993595-f7fdfqj14qtnns6g0cmrb7m7nh30obqg.apps.googleusercontent.com`
  - Scope: `https://www.googleapis.com/auth/calendar.readonly`
- **Google Fonts** — Heebo (Hebrew typeface)
- **Firebase Cloud Messaging** — via service worker for push notifications
- **Waze deep-link** — navigation from address fields
- **WhatsApp deep-link** — `https://wa.me/972XXXXXXXXX`

---

## 2. USERS & PERMISSIONS

### Hard-coded USERS array (also persisted in Firestore `settings/main.users`)
```
USERS = [
  { name:'אופיר', pass:'',         color:'#3b82f6', role:'owner' },
  { name:'רז',    pass:'Raz4123',   color:'#f1f5f9', role:'admin' },
  { name:'גלאל',  pass:'Jalal4123', color:'#10b981', role:'installer' },
  { name:'מוטי',  pass:'Moti4123',  color:'#06b6d4', role:'installer' },
]
```
- `אופיר` → no password (direct login)
- Session stored in `sessionStorage` as `crm_user` (JSON)
- Permissions model: per-module numeric levels (0=none, 1=view, 2=edit, 3=full)
- Modules: customers, faults, archive, notes, warranties, debts, reports
- Log page: only `רז` or `owner/admin` roles
- User management panel: only `owner/admin` roles

### DEFAULT_PERMS by role
```
owner/admin  → all modules: 3
manager      → all modules: 2
installer    → customers:1, faults:2, archive:2, notes:2, warranties:1, debts:0, reports:0
```

---

## 3. LOGIC & ALGORITHMS

### A. Real-Time Firestore Listeners (onSnapshot)
All 5 active listeners — defined inside the Firebase `<script type="module">` block:
1. `customers` → updates `window.custs`, refreshes customers/warranties/debts pages + dashboard
2. `faults`    → updates `window.faults`, refreshes faults page + dashboard
3. `whatsapp`  → updates `window.waMessages` + runs auto-match (see B below)
4. `notes`     → updates `window.notes`, refreshes notes page + dashboard
5. `log`       → updates `window.logEntries`, refreshes log page
6. `settings/main` (doc listener) → updates `window.cfg` + localStorage

**Critical guard:** `window._deletingIds` Set prevents ghost re-renders during
optimistic deletes — checked in the `customers` and `faults` listeners.

### B. WhatsApp Auto-Match Algorithm
```js
// Suffix-matching: last 9 digits of incoming phone vs stored customer phone
const phone = (m.from||'').replace(/\D/g,'');
const matched = window.custs.find(c =>
  c.phone && c.phone.replace(/\D/g,'').includes(phone.slice(-9))
);
if (matched) m.custId = matched.id;
```
This runs inside the `whatsapp` onSnapshot listener.

### C. Warranty Expiry Calculation
```js
function wExp(c) {
  if (!c.installDate || !c.warrantyYears) return null;
  const d = new Date(c.installDate);
  d.setFullYear(d.getFullYear() + parseInt(c.warrantyYears || 0));
  return d.toISOString().split('T')[0];
}
function dLeft(s) { return Math.round((new Date(s) - new Date()) / 86400000); }
function wStat(c) {
  const e = wExp(c); if (!e) return null;
  const d = dLeft(e);
  return { d, exp: e, cls: d<0?'br':d<90?'by':'bg', lbl: d<0?'פגה':'בתוקף' };
}
```

### D. Unique ID Generation
```js
function uid() { return Math.random().toString(36).slice(2, 12); }
```
Simple but sufficient — used for all new records.

### E. Auto-Fixes on Load
Two data-integrity patches run after `loadAll()`:
1. **warrantyYears fix**: any customer with `warrantyYears === '2'` is reset to `'0'`
   (historical bad data patch — keep this)
2. **debt string fix**: `debt` stored as string (not number) is cast to
   `Math.max(0, Number(raw) || 0)` and re-saved to Firestore

---

## 4. UI / UX PRINCIPLES

### Layout
- **Desktop (>768px):** Fixed right sidebar (220px) + main content `margin-right:220px`
- **Mobile (≤768px):** Sidebar hidden; bottom nav bar `#mnav` + slide-in drawer `#m-drawer`
- **RTL:** `direction:rtl` on `<html lang="he">`

### Color Palette (CSS Variables on `:root`)
```css
--bg:   #0a0e1a   /* page background */
--sur:  #111827   /* surface (sidebar, cards) */
--sur2: #1a2235   /* elevated surface */
--sur3: #1f2d45   /* highest elevation */
--acc:  #3b82f6   /* primary blue */
--grn:  #10b981   /* success green */
--red:  #ef4444   /* danger red */
--yel:  #f59e0b   /* warning yellow */
--ora:  #fb923c   /* orange */
--cya:  #06b6d4   /* cyan */
--tx:   #f1f5f9   /* primary text */
--tx2:  #94a3b8   /* secondary text */
--tx3:  #64748b   /* muted text */
--brd:  #1e293b   /* border */
--brd2: #2d3f5e   /* elevated border */
--r:    12px      /* border-radius */
```

### Note Category Colors
```js
const NCAT_CLR = {
  general:  'var(--acc)',   // blue
  meeting:  'var(--grn)',   // green
  reminder: 'var(--yel)',   // yellow
};
```

### Avatar Generation
Color from name hash → 8-color palette. Initials = first letters of first two words.

---

## 5. NAVIGATION / PAGE HIERARCHY

Pages (id = `pg-{name}`), nav buttons (id = `nb-{name}`):

| Priority | Page ID      | Label           | Permission Required |
|----------|--------------|-----------------|---------------------|
| 1        | dashboard    | לוח בקרה        | always visible      |
| 2        | customers    | לקוחות          | customers ≥ 1       |
| 3        | faults       | משימות          | faults ≥ 1          |
| 4        | archive      | ארכיון          | archive ≥ 1         |
| 5        | warranties   | אחריות          | warranties ≥ 1      |
| 6        | debts        | חובות           | debts ≥ 1           |
| 7        | notes        | הערות           | notes ≥ 1           |
| 8        | reports      | דוחות           | reports ≥ 1         |
| 9        | settings     | הגדרות          | always visible      |
| 10       | log          | לוג שינויים     | admin/owner only    |

**Faults → Archive rule:** tasks with `status === 'done'` are hidden from faults page
and shown only in archive.

---

## 6. GLOBAL STATE (window.*)
```
window.custs         []   — loaded customers array
window.faults        []   — loaded faults array (includes archived status='done')
window.notes         []   — loaded notes array
window.waMessages    []   — loaded WhatsApp messages
window.logEntries    []   — loaded log entries
window.cfg           {}   — settings object
window._currentUser  str  — logged-in user name
window._currentColor str  — user's color hex
window._currentRole  str  — user's role string
window._deletingIds  Set  — guard set for optimistic deletes
window._gsResults    []   — global search result cache
window._dbSaveCusts  fn   — async save all customers to Firestore
window._dbSaveFaults fn   — async save all faults to Firestore
window._dbSaveNotes  fn   — async save all notes to Firestore
window._dbLogAdd     fn   — async add single log entry
window._dbSaveCfg    fn   — async save settings doc
window._dbDel        fn   — async delete single doc(collection, id) → bool
window._dbDelMulti   fn   — async delete multiple docs → bool
```

---

## 7. CODING STANDARDS & CONSTRAINTS

- **Vanilla JS (ES6+)** — no frameworks, no build step
- **CSS Variables** — all colors via `:root` vars, no hardcoded hex in CSS rules
- **Firebase SDK v10** via CDN ESM imports (type="module" script)
- **Zero breaking changes** — Firestore collection names must not change
- **PWA** — `manifest.json` + `sw.js` + Apple meta tags must remain functional
- **Hebrew RTL** — all UI text in Hebrew; `dir="rtl"` on html element
- **Inline SVG / base64 images** — logo is embedded as base64 JPEG (no external asset)

---

## 8. PROPOSED MODULAR FILE STRUCTURE (Phase 2)
```
/
├── index.html          (shell: <head>, layout skeleton, modal HTML only)
├── manifest.json       (unchanged)
├── sw.js               (unchanged)
├── css/
│   ├── base.css        (reset, :root variables, body)
│   ├── layout.css      (sidebar, main, responsive)
│   ├── components.css  (buttons, badges, tables, modals, panels)
│   └── pages.css       (page-specific overrides)
├── js/
│   ├── config.js       (USERS array, Firebase config object, constants)
│   ├── auth.js         (initLogin, selectUser, doLogin, applyUser, logout)
│   ├── utils.js        (uid, today, fmtD, toast, avClr, ini, wExp, dLeft, wStat)
│   ├── db.js           (Firebase init, loadAll, onSnapshot listeners, _db* helpers)
│   ├── nav.js          (nav, openM, closeM, openDrawer, openGlobalSearch)
│   ├── dashboard.js    (renderDash, jumpTo)
│   ├── customers.js    (renderCusts, openNewCust, editCustById, saveCust, etc.)
│   ├── faults.js       (renderFaults, openNewFault, saveFault, bulk delete, etc.)
│   ├── notes.js        (renderNotes, openNewNote, saveNote, etc.)
│   ├── archive.js      (renderArchive, restoreFault)
│   ├── warranties.js   (renderWarr)
│   ├── debts.js        (renderDebts, markPaid, markFaultPaid)
│   ├── reports.js      (renderReports, exportBackup, exportCustomersExcel)
│   ├── settings.js     (loadSettings, saveSettings, user management)
│   ├── log.js          (renderLog, clearLog, addLog)
│   ├── gcal.js         (gcalInit, gcalSignIn, gcalSignOut, fetchWk, renderWkGrid)
│   └── main.js         (entry point: imports all modules, calls initLogin)
└── claude.md           (this file)
```