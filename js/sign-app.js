// ══ sign-app.js — עמוד ציבורי עצמאי לאישור וחתימה מרחוק על דוח עבודה ══
// לא חלק מה-SPA הראשי (index.html) — נטען רק דרך sign.html, עם קישור פרטני
// שמכיל מזהה דוח (id) וטוקן אקראי (t) שנשלח ללקוח בוואטסאפ.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore, doc, getDoc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { FIREBASE_CONFIG } from './config.js';

const app  = initializeApp(FIREBASE_CONFIG);
const db   = getFirestore(app);
const auth = getAuth(app);

const $app = document.getElementById('app');

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}
function fmtD(d) {
  if (!d) return '—';
  const [y, m, dd] = String(d).split('-');
  return (dd && m && y) ? `${dd}/${m}/${y}` : d;
}
function fmtHours(h) {
  if (!h) return '';
  const whole = Math.floor(h);
  const mins  = Math.round((h - whole) * 60);
  return mins === 0 ? (whole + ' שע\'') : (whole + ' שע\' ' + mins + ' דק\'');
}
function uid() { return Math.random().toString(36).slice(2, 12); }

function showMsg(icon, title, sub) {
  $app.innerHTML = `<div class="msg"><div class="icon">${icon}</div><div class="t">${esc(title)}</div>${sub ? `<div class="s">${esc(sub)}</div>` : ''}</div>`;
}

function topbarHtml(cfg) {
  const company = (cfg && cfg.company) || 'וידאו דיזיין';
  const tagline = (cfg && cfg.tagline) || 'תכנון וביצוע בתים חכמים';
  const logo = cfg && cfg.logos && (cfg.logos.header || cfg.logos.main || cfg.logos.quote);
  return `<div class="topbar" style="display:flex;justify-content:space-between;align-items:center">
    <div><div class="co">${esc(company)}</div><div class="tag">${esc(tagline)}</div></div>
    ${logo ? `<img src="${logo}" alt="logo">` : ''}
  </div>`;
}

async function logSignEvent(reportId, custName) {
  try {
    await setDoc(doc(db, 'log', uid()), {
      id: uid(), type: 'workreport', action: 'נחתם מרחוק ע"י הלקוח',
      details: (custName || '') + ' · דוח ' + reportId,
      user: 'לקוח (קישור חתימה)', ts: new Date().toISOString(),
    });
  } catch (e) { /* לא קריטי — לא חוסם את זרימת החתימה */ }
}

// ── פאד חתימה (canvas) ────────────────────────────────────────────────────────
function initSigPad(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 300, h = 160;
  canvas.width = w * ratio; canvas.height = h * ratio;
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);
  ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0f172a';

  let drawing = false, hasInk = false;
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  };
  const start = (e) => { e.preventDefault(); drawing = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const move  = (e) => { if (!drawing) return; e.preventDefault(); const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); hasInk = true; };
  const end   = () => { drawing = false; };

  canvas.onmousedown = start; canvas.onmousemove = move; canvas.onmouseup = end; canvas.onmouseleave = end;
  canvas.ontouchstart = start; canvas.ontouchmove = move; canvas.ontouchend = end;

  return {
    clear: () => { ctx.clearRect(0, 0, canvas.width, canvas.height); hasInk = false; },
    hasInk: () => hasInk,
    dataUrl: () => canvas.toDataURL('image/png'),
  };
}

// ── מסך "כבר נחתם" ────────────────────────────────────────────────────────────
function renderAlreadySigned(cfg, r) {
  $app.innerHTML = `
    ${topbarHtml(cfg)}
    <div class="wrap">
      <div class="card" style="text-align:center">
        <div style="font-size:32px;margin-bottom:8px">✅</div>
        <div class="doc-title">הדוח כבר נחתם</div>
        <div class="doc-sub">נחתם בתאריך ${esc(new Date(r.signedAt || Date.now()).toLocaleDateString('he-IL'))} ע"י ${esc(r.signerName || '')}</div>
        <img class="signed-img" src="${r.signature}" alt="חתימה">
      </div>
    </div>`;
}

// ── מסך תודה לאחר חתימה מוצלחת ────────────────────────────────────────────────
function renderThankYou(cfg) {
  showMsg('✅', 'תודה, הדוח נחתם בהצלחה', 'אפשר לסגור את הדף הזה כעת.');
  const el = $app.querySelector('.msg');
  if (el) { const bar = document.createElement('div'); bar.innerHTML = topbarHtml(cfg); $app.prepend(bar.firstChild); }
}

// ── מסך הטופס המלא (סיכום דוח + פאד חתימה) ───────────────────────────────────
function renderForm(cfg, r, custName, custPhone) {
  const eqRows = (r.equipment || []).length
    ? r.equipment.map(e => `<div class="equip-item"><span>${esc(e.name)}</span><span>× ${e.qty || 1}</span></div>`).join('')
    : '';
  const timeRange = (r.startTime && r.endTime) ? `${r.startTime}–${r.endTime}` : '';

  $app.innerHTML = `
    ${topbarHtml(cfg)}
    <div class="wrap">
      <div class="card">
        <div class="doc-title">דוח עבודה — אישור וחתימה</div>
        <div class="doc-sub">${esc(custName)} · ${fmtD(r.date)}</div>

        <div class="row"><span>טכנאי אחראי</span><span>${esc(r.techName || '—')}</span></div>
        ${timeRange ? `<div class="row"><span>שעות עבודה</span><span>${esc(timeRange)}${r.hours ? ' (' + fmtHours(r.hours) + ')' : ''}</span></div>` : ''}

        <div class="sec-title"><span class="t">תיאור העבודה שבוצעה</span><span class="l"></span></div>
        <div class="desc-box">${esc(r.workDesc) || '—'}</div>

        ${eqRows ? `<div class="sec-title" style="margin-top:14px"><span class="t">ציוד שהותקן</span><span class="l"></span></div>${eqRows}` : ''}

        ${r.notes ? `<div class="sec-title" style="margin-top:14px"><span class="t">הערות</span><span class="l"></span></div><div class="desc-box">${esc(r.notes)}</div>` : ''}

        ${r.amount > 0 ? `
          <div style="margin-top:14px" class="amount-box">
            <span>סה"כ לתשלום</span>
            <span>₪${Number(r.amount).toLocaleString('he-IL')}</span>
          </div>
          <div class="paid-tag" style="margin-top:6px;text-align:left">${r.paid === 'yes' ? '✓ שולם' : r.paid === 'partial' ? 'שולם חלקית' : 'טרם שולם'}</div>
        ` : ''}
      </div>

      <div class="card">
        <div class="sec-title"><span class="t">✍️ חתימת אישור</span><span class="l"></span></div>
        <canvas id="sig-canvas"></canvas>
        <input type="text" class="name-inp" id="sig-name" placeholder="שם החותם" value="${esc(custName)}">
        <div class="btnrow">
          <button type="button" class="btn-clear" id="btn-clear">נקה</button>
          <button type="button" class="btn-submit" id="btn-submit">אשר וחתום</button>
        </div>
      </div>
    </div>`;

  const pad = initSigPad(document.getElementById('sig-canvas'));
  document.getElementById('btn-clear').onclick = () => pad.clear();
  document.getElementById('btn-submit').onclick = async () => {
    const nameVal = document.getElementById('sig-name').value.trim();
    if (!pad.hasInk()) { alert('נא לחתום לפני האישור'); return; }
    if (!nameVal) { alert('נא להזין שם'); return; }

    const btn = document.getElementById('btn-submit');
    btn.disabled = true; btn.textContent = 'שולח...';
    try {
      await updateDoc(doc(db, 'workreports', r.id), {
        signature: pad.dataUrl(),
        signerName: nameVal,
        signedAt: Date.now(),
        signedRemotely: true,
      });
      logSignEvent(r.id, nameVal);
      renderThankYou(cfg);
    } catch (e) {
      console.error(e);
      btn.disabled = false; btn.textContent = 'אשר וחתום';
      alert('שגיאה בשליחת החתימה, נסה שוב.');
    }
  };
}

// ── זרימה ראשית ────────────────────────────────────────────────────────────
async function main() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const t  = params.get('t');

  if (!id || !t) { showMsg('⚠️', 'קישור לא תקין', 'חסרים פרטים בקישור.'); return; }

  try {
    await signInAnonymously(auth);
  } catch (e) {
    showMsg('⚠️', 'שגיאת התחברות', 'נסה לרענן את הדף.');
    return;
  }

  let cfg = {};
  try {
    const cfgSnap = await getDoc(doc(db, 'settings', 'main'));
    if (cfgSnap.exists()) cfg = cfgSnap.data();
  } catch (e) { /* לא קריטי */ }

  let snap;
  try {
    snap = await getDoc(doc(db, 'workreports', id));
  } catch (e) {
    showMsg('⚠️', 'שגיאה בטעינת הדוח', 'נסה שוב מאוחר יותר.');
    return;
  }

  if (!snap.exists()) { showMsg('⚠️', 'הדוח לא נמצא'); return; }
  const r = { id, ...snap.data() };

  if (!r.signToken || r.signToken !== t) {
    showMsg('⚠️', 'קישור לא תקין או שפג תוקפו');
    return;
  }

  if (r.signature) {
    renderAlreadySigned(cfg, r);
    return;
  }

  let custName = r.guestName || '';
  if (r.custId) {
    try {
      const cSnap = await getDoc(doc(db, 'customers', r.custId));
      if (cSnap.exists()) custName = cSnap.data().name || custName;
    } catch (e) { /* נופל חזרה לשם האורח אם יש */ }
  }
  if (!custName) custName = 'לקוח';

  renderForm(cfg, r, custName);
}

main();
