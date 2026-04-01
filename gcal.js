// ══ gcal.js — Google Calendar integration ══

import { GCAL_CID } from './config.js';
import { toast, fmtD } from './utils.js';

let gcalTok  = null;
let wkOffset = 0;

export function gcalInit() {
  const saved = localStorage.getItem('gcal_token');
  if (saved) {
    try { gcalTok = JSON.parse(saved); showWkGrid(); fetchWk(); return; } catch (e) {}
  }
  const si = document.getElementById('gcal-signin');
  if (si) si.style.display = 'block';
}

export function gcalSignIn() {
  if (typeof google === 'undefined') { toast('Google API לא נטען', 'err'); return; }
  google.accounts.oauth2.initTokenClient({
    client_id: GCAL_CID,
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    callback: (r) => {
      if (r.error) return;
      gcalTok = r;
      localStorage.setItem('gcal_token', JSON.stringify(r));
      document.getElementById('gcal-signin').style.display = 'none';
      showWkGrid();
      fetchWk();
    },
  }).requestAccessToken();
}

export function gcalSignOut() {
  if (gcalTok && typeof google !== 'undefined') google.accounts.oauth2.revoke(gcalTok.access_token, () => {});
  gcalTok = null;
  localStorage.removeItem('gcal_token');
  document.getElementById('gcal-grid').style.display  = 'none';
  document.getElementById('gcal-out').style.display   = 'none';
  document.getElementById('gcal-signin').style.display = 'block';
}

function wkRange(off) {
  const now = new Date(), sun = new Date(now);
  sun.setDate(now.getDate() - now.getDay() + off * 7);
  sun.setHours(0, 0, 0, 0);
  const sat = new Date(sun);
  sat.setDate(sun.getDate() + 6);
  sat.setHours(23, 59, 59, 999);
  return { sun, sat };
}

function showWkGrid() {
  const { sun, sat } = wkRange(wkOffset);
  const o = { day: 'numeric', month: 'long' };
  document.getElementById('wk-label').textContent =
    sun.toLocaleDateString('he-IL', o) + ' — ' + sat.toLocaleDateString('he-IL', o);
  document.getElementById('gcal-grid').style.display = 'block';
  document.getElementById('gcal-out').style.display  = 'flex';
  document.getElementById('gcal-signin').style.display = 'none';
}

export async function fetchWk() {
  if (!gcalTok) return;
  const { sun, sat } = wkRange(wkOffset);
  document.getElementById('gcal-grid').innerHTML =
    '<div style="color:var(--tx3);text-align:center;padding:16px;font-size:13px">טוען...</div>';
  try {
    const r = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=' +
      encodeURIComponent(sun.toISOString()) + '&timeMax=' + encodeURIComponent(sat.toISOString()) +
      '&singleEvents=true&orderBy=startTime&maxResults=50',
      { headers: { Authorization: 'Bearer ' + gcalTok.access_token } }
    );
    if (r.status === 401) { gcalSignOut(); return; }
    const d = await r.json();
    renderWkGrid(d.items || []);
  } catch (e) {
    document.getElementById('gcal-grid').innerHTML =
      '<div style="color:var(--red);text-align:center;padding:16px">שגיאה בטעינת היומן</div>';
  }
}

function renderWkGrid(evs) {
  const { sun } = wkRange(wkOffset);
  const days = [], tod = new Date().toISOString().split('T')[0];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sun); d.setDate(sun.getDate() + i); days.push(d);
  }
  const byDay = {};
  days.forEach(d => { byDay[d.toISOString().split('T')[0]] = []; });
  evs.forEach(ev => {
    const k = (ev.start.dateTime || ev.start.date).split('T')[0];
    if (byDay[k] !== undefined) byDay[k].push(ev);
  });
  const dh = ['א','ב','ג','ד','ה','ו','ש'];
  const cl = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#fb923c'];

  const cols = days.map((d, i) => {
    const key = d.toISOString().split('T')[0], isT = key === tod, dayEvs = byDay[key] || [];
    const bdr = isT ? 'var(--acc)' : 'var(--brd)';
    const bgc = isT ? 'rgba(59,130,246,.07)' : 'var(--sur2)';
    const dayColor = isT ? 'var(--acc)' : 'var(--tx)';
    const evHtml = dayEvs.length === 0
      ? '<div style="font-size:10px;color:var(--tx3);text-align:center;padding:10px 0">פנוי</div>'
      : dayEvs.map(ev => {
          const st = ev.start.dateTime
            ? new Date(ev.start.dateTime).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
            : 'כל היום';
          const ec = cl[(ev.summary || '').charCodeAt(0) % cl.length];
          return `<div style="background:${ec}22;border-right:2px solid ${ec};border-radius:3px;padding:2px 4px;margin-bottom:3px;overflow:hidden">
            <div style="font-size:9px;color:${ec};font-weight:700">${st}</div>
            <div style="font-size:10px;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ev.summary || 'ללא כותרת'}</div>
          </div>`;
        }).join('');
    return `<div style="min-width:110px;flex:1;border:1px solid ${bdr};border-radius:8px;background:${bgc}">
      <div style="padding:6px 8px;border-bottom:1px solid var(--brd);display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:10px;color:var(--tx3)">יום ${dh[i]}</span>
        <span style="font-size:16px;font-weight:800;color:${dayColor}">${d.getDate()}</span>
      </div>
      <div style="padding:4px 5px;min-height:80px">${evHtml}</div>
    </div>`;
  });
  document.getElementById('gcal-grid').innerHTML =
    '<div style="display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px">' + cols.join('') + '</div>';
}

export function wkPrev()  { wkOffset--; showWkGrid(); fetchWk(); }
export function wkNext()  { wkOffset++; showWkGrid(); fetchWk(); }
export function wkToday() { wkOffset = 0; showWkGrid(); fetchWk(); }

export function gcalFault(id) {
  const f = window.faults.find(x => x.id === id);
  if (!f || !f.date) return;
  const c  = window.custs.find(x => x.id === f.custId);
  const st = f.date.replace(/-/g, '') + 'T' + (f.time || '09:00').replace(':', '') + '00';
  const hr = f.time ? String(parseInt(f.time.split(':')[0]) + 1).padStart(2, '0') + f.time.split(':')[1] : '1000';
  const en = f.date.replace(/-/g, '') + 'T' + hr + '00';
  const url = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
    + '&text=' + encodeURIComponent(({ fault: 'משימה', service: 'שירות', installation: 'התקנה', other: 'ביקור' }[f.type || 'fault'] || 'ביקור') + ': ' + (c ? c.name : 'לקוח'))
    + '&dates=' + st + '/' + en
    + '&details=' + encodeURIComponent((f.desc || '') + (c && c.phone ? '\nטלפון: ' + c.phone : '') + (c && c.address ? '\nכתובת: ' + c.address : ''))
    + '&location=' + encodeURIComponent(c && c.address ? c.address : '')
    + (window.cfg.gcal ? '&authuser=' + encodeURIComponent(window.cfg.gcal) : '');
  window.open(url, '_blank');
}
