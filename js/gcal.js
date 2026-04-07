// ══ gcal.js — Google Calendar & Internal Drag & Drop Calendar ══

import { GCAL_CID } from './config.js';
import { toast, fmtD } from './utils.js';
import { addLog } from './log.js';

let gcalTok  = null;
let wkOffset = 0;

export function gcalInit() {
  // חיבור כפתורי הניווט של היומן
  const btnPrev = document.getElementById('cal-btn-prev');
  const btnNext = document.getElementById('cal-btn-next');
  const btnToday = document.getElementById('cal-btn-today');
  
  if (btnPrev) btnPrev.onclick = wkPrev;
  if (btnNext) btnNext.onclick = wkNext;
  if (btnToday) btnToday.onclick = wkToday;

  // בנה את התשתית של היומן הפנימי
  buildCalendarGrid();

  // נסה לשחזר חיבור לגוגל יומן (אם חובר בעבר)
  const saved = localStorage.getItem('gcal_token');
  if (saved) {
    try { 
      gcalTok = JSON.parse(saved); 
      fetchWk(); // מושך אירועים מגוגל ומצייר אותם
    } catch (e) {}
  }
}

function wkRange(off) {
  const now = new Date();
  const sun = new Date(now);
  sun.setDate(now.getDate() - now.getDay() + (off * 7));
  sun.setHours(0, 0, 0, 0);
  
  const sat = new Date(sun);
  sat.setDate(sun.getDate() + 6);
  sat.setHours(23, 59, 59, 999);
  
  return { sun, sat };
}

export function buildCalendarGrid() {
  const wrapper = document.getElementById('cal-grid-wrapper');
  if (!wrapper) return;
  
  const { sun, sat } = wkRange(wkOffset);
  const opts = { day: 'numeric', month: 'long' };
  const rangeLbl = document.getElementById('cal-date-range');
  if (rangeLbl) {
      rangeLbl.textContent = sun.toLocaleDateString('he-IL', opts) + ' — ' + sat.toLocaleDateString('he-IL', opts);
  }

  let html = '';
  // שורת כותרות (ימים)
  html += '<div class="cal-header-cell" style="border-top:none;">שעה</div>';
  
  const days = [];
  const dh = ['א','ב','ג','ד','ה','ו','ש'];
  const todayStr = new Date().toISOString().split('T')[0];

  for (let i = 0; i < 7; i++) {
    const d = new Date(sun); 
    d.setDate(sun.getDate() + i); 
    days.push(d);
    
    const dateStr = d.toISOString().split('T')[0];
    const isToday = (dateStr === todayStr);
    const color = isToday ? 'var(--acc)' : 'var(--tx)';
    const bg = isToday ? 'rgba(59,130,246,0.1)' : 'transparent';
    
    html += `<div class="cal-header-cell" style="color:${color}; background:${bg};">יום ${dh[i]} <br><span style="font-size:18px">${d.getDate()}</span></div>`;
  }

  // שורות שעות (08:00 עד 18:00)
  for (let h = 8; h <= 18; h++) {
    const timeStr = String(h).padStart(2, '0') + ':00';
    html += `<div class="cal-time-cell">${timeStr}</div>`;
    
    for (let i = 0; i < 7; i++) {
      const dateStr = days[i].toISOString().split('T')[0];
      const isToday = (dateStr === todayStr);
      const bg = isToday ? 'rgba(59,130,246,0.03)' : '';
      
      html += `<div class="cal-cell cal-dropzone" style="background:${bg}" data-date="${dateStr}" data-time="${timeStr}" 
                 ondragover="event.preventDefault(); this.classList.add('drag-over')" 
                 ondragleave="this.classList.remove('drag-over')" 
                 ondrop="window._dropTask(event, this)"></div>`;
    }
  }

  wrapper.innerHTML = html;
  
  // רינדור המשימות לתוך הגריד והתפריט
  renderUnscheduledTasks();
  renderScheduledTasks();
  
  if (gcalTok) fetchWk(); // אם מחובר לגוגל, תמשוך ותוסיף אירועים
}

// שאיבת משימות שלא שובצו והצגתן בסרגל הצד
export function renderUnscheduledTasks() {
    const list = document.getElementById('cal-unscheduled-list');
    if (!list) return;
    
    const faults = window.faults || [];
    // מסנן: משימות פתוחות שאין להן תאריך, או סטטוס פתוח
    const unscheduled = faults.filter(f => f.status !== 'done' && (!f.date || f.status === 'open'));
    
    if (!unscheduled.length) {
        list.innerHTML = '<div style="text-align:center; color:var(--tx3); font-size:13px; margin-top:30px;">אין משימות להמתנה 🎉</div>';
        return;
    }

    list.innerHTML = unscheduled.map(f => {
        const cust = (window.custs || []).find(c => c.id === f.custId);
        const name = cust ? cust.name : (f.guestName || 'לקוח מזדמן');
        const typeIcon = { fault: '🔧', service: '🛠️', installation: '📦', other: '📋' }[f.type || 'fault'] || '🔧';
        const city = cust && cust.city ? `📍 ${cust.city}` : '';
        
        return `<div class="cal-task" draggable="true" ondragstart="event.dataTransfer.setData('text/plain', '${f.id}')">
            <div style="font-weight:700; margin-bottom:4px; font-size:13px;">${typeIcon} ${name}</div>
            <div style="font-size:11px; opacity:0.9; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${f.desc || 'ללא תיאור'}</div>
            <div style="font-size:10px; margin-top:4px; opacity:0.7;">${city}</div>
        </div>`;
    }).join('');
}

// ציור משימות מהמערכת שכבר שובצו לתאריך ושעה ביומן הפנימי
export function renderScheduledTasks() {
   const faults = window.faults || [];
   const { sun, sat } = wkRange(wkOffset);
   const minD = sun.toISOString().split('T')[0];
   const maxD = sat.toISOString().split('T')[0];

   // מסנן: משימות שלא סוימו, שיש להן תאריך, והן בתוך השבוע הנוכחי המוצג
   const scheduled = faults.filter(f => f.status !== 'done' && f.date && f.date >= minD && f.date <= maxD);
   
   scheduled.forEach(f => {
       let timeStr = f.time || '09:00';
       let hour = timeStr.split(':')[0];
       
       // מעגל לשעות הפעילות של הגריד
       if (parseInt(hour) < 8) hour = '08';
       if (parseInt(hour) > 18) hour = '18';
       
       let targetTime = hour + ':00';
       let cell = document.querySelector(`.cal-dropzone[data-date="${f.date}"][data-time="${targetTime}"]`);
       
       // אם במקרה לא נמצא תא, נסה לדחוף לשעה 8 בבוקר של אותו יום
       if (!cell) {
           cell = document.querySelector(`.cal-dropzone[data-date="${f.date}"][data-time="08:00"]`);
       }
       
       if (cell) {
           const cust = (window.custs || []).find(c => c.id === f.custId);
           const name = cust ? cust.name : (f.guestName || 'לקוח מזדמן');
           const div = document.createElement('div');
           div.className = 'cal-task';
           div.style.background = 'linear-gradient(to bottom, #f59e0b, #d97706)'; // כתום למשימות מערכת
           div.style.cursor = 'pointer';
           div.title = "לחץ לעריכת המשימה";
           
           // לחיצה על המשימה תפתח את מסך העריכה שלה
           div.onclick = () => { if(window.editFaultById) window.editFaultById(f.id); };
           
           div.innerHTML = `<div style="font-size:10px;font-weight:700">⏱️ ${timeStr}</div>
                            <div style="font-weight:600;font-size:12px;">${name}</div>
                            <div style="font-size:10px; opacity:0.9; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${f.desc||''}</div>`;
           cell.appendChild(div);
       }
   });
}

// פונקציה גלובלית שנקראת בעת עזיבת המשימה בגרירה (Drop)
window._dropTask = async function(e, cell) {
    e.preventDefault();
    cell.classList.remove('drag-over');
    
    const faultId = e.dataTransfer.getData('text/plain');
    if (!faultId) return;

    const date = cell.getAttribute('data-date');
    const time = cell.getAttribute('data-time');

    const fault = (window.faults || []).find(f => f.id === faultId);
    if (!fault) return;

    // עדכון הנתונים של המשימה בהתאם למשבצת שבה היא נחתה
    fault.date = date;
    fault.time = time;
    fault.status = 'scheduled';

    // שמירה ב-Firebase
    if (window._dbSaveFaults) {
        await window._dbSaveFaults([fault]);
        try { addLog('fault', 'שיבוץ משימה', `משימה שובצה ל-${fmtD(date)} בשעה ${time}`); } catch(err){}
        toast('המשימה שובצה בהצלחה! ✅', 'success');
        
        // ציור מחדש של הלוח כדי שהמשימה תעבור צד
        buildCalendarGrid(); 
        
        // רענון הלוח הראשי למעלה
        if(window.renderDash) window.renderDash();
    }
};

// ── Google Calendar Integrations ─────────────────────────────────────────

export function gcalSignIn() {
  if (typeof google === 'undefined') { toast('Google API לא נטען', 'err'); return; }
  google.accounts.oauth2.initTokenClient({
    client_id: GCAL_CID,
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    callback: (r) => {
      if (r.error) return;
      gcalTok = r;
      localStorage.setItem('gcal_token', JSON.stringify(r));
      fetchWk();
    },
  }).requestAccessToken();
}

export function gcalSignOut() {
  if (gcalTok && typeof google !== 'undefined') google.accounts.oauth2.revoke(gcalTok.access_token, () => {});
  gcalTok = null;
  localStorage.removeItem('gcal_token');
  buildCalendarGrid(); // מנקה את האירועים של גוגל מהמסך ומשאיר רק את של המערכת
  toast('נותקת מיומן גוגל', 'info');
}

export async function fetchWk() {
  if (!gcalTok) return;
  const { sun, sat } = wkRange(wkOffset);
  
  try {
    const r = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=' +
      encodeURIComponent(sun.toISOString()) + '&timeMax=' + encodeURIComponent(sat.toISOString()) +
      '&singleEvents=true&orderBy=startTime&maxResults=100',
      { headers: { Authorization: 'Bearer ' + gcalTok.access_token } }
    );
    if (r.status === 401) { gcalSignOut(); return; }
    const d = await r.json();
    renderWkGridGCal(d.items || []);
  } catch (e) {
    console.error("GCal fetch error", e);
  }
}

function renderWkGridGCal(evs) {
    evs.forEach(ev => {
        let start = ev.start.dateTime || ev.start.date;
        if(!start) return;
        
        const dateStr = start.split('T')[0];
        let timeStr = '08:00';
        let displayTime = 'כל היום';
        
        if (ev.start.dateTime) {
            const d = new Date(start);
            let h = d.getHours();
            if (h < 8) h = 8;
            if (h > 18) h = 18;
            timeStr = String(h).padStart(2, '0') + ':00';
            displayTime = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
        }

        let cell = document.querySelector(`.cal-dropzone[data-date="${dateStr}"][data-time="${timeStr}"]`);
        if (cell) {
            const div = document.createElement('div');
            div.className = 'cal-task gcal-event';
            div.innerHTML = `<div style="font-size:10px;font-weight:700">🗓️ ${displayTime}</div>
                             <div style="font-weight:600;font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${ev.summary || 'ללא כותרת'}</div>`;
            div.title = ev.summary;
            cell.appendChild(div);
        }
    });
}

export function wkPrev()  { wkOffset--; buildCalendarGrid(); }
export function wkNext()  { wkOffset++; buildCalendarGrid(); }
export function wkToday() { wkOffset = 0; buildCalendarGrid(); }

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