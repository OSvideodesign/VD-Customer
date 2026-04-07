// ══ gcal.js — Google Calendar & Internal Drag & Drop Calendar ══

import { GCAL_CID } from './config.js';
import { toast, fmtD } from './utils.js';
import { addLog } from './log.js';

let gcalTok  = null;
let wkOffset = 0;

export function gcalInit() {
  const btnPrev = document.getElementById('cal-btn-prev');
  const btnNext = document.getElementById('cal-btn-next');
  const btnToday = document.getElementById('cal-btn-today');
  
  if (btnPrev) btnPrev.onclick = wkPrev;
  if (btnNext) btnNext.onclick = wkNext;
  if (btnToday) btnToday.onclick = wkToday;

  buildCalendarGrid();

  const saved = localStorage.getItem('gcal_token');
  if (saved) {
    try { 
      gcalTok = JSON.parse(saved); 
      fetchWk(); 
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

// מחזיר צבע גרדיאנט לפי רמת דחיפות
function getPriColor(pri) {
    switch(pri) {
        case 'low': return 'linear-gradient(to bottom, #10b981, #059669)'; // ירוק
        case 'high': return 'linear-gradient(to bottom, #ef4444, #dc2626)'; // אדום
        case 'urgent': return 'linear-gradient(to bottom, #b91c1c, #991b1b)'; // אדום כהה
        case 'medium':
        default: return 'linear-gradient(to bottom, #f59e0b, #d97706)'; // כתום
    }
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
  
  renderUnscheduledTasks();
  renderScheduledTasks();
  
  if (gcalTok) fetchWk(); 
}

export function renderUnscheduledTasks() {
    const list = document.getElementById('cal-unscheduled-list');
    if (!list) return;
    
    const faults = window.faults || [];
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
        const amountHtml = (f.amount && Number(f.amount) > 0) ? `<span style="background:rgba(0,0,0,0.3); padding:2px 6px; border-radius:4px; font-size:10px; font-weight:700;">💰 ${f.amount} ₪</span>` : '';
        
        return `<div class="cal-task" draggable="true" ondragstart="event.dataTransfer.setData('text/plain', '${f.id}')" style="background: ${getPriColor(f.pri)};">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
               <div style="font-weight:700; margin-bottom:4px; font-size:13px;">${typeIcon} ${name}</div>
               ${amountHtml}
            </div>
            <div style="font-size:11px; opacity:0.9; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${f.desc || 'ללא תיאור'}</div>
            <div style="font-size:10px; margin-top:4px; opacity:0.7;">${city}</div>
        </div>`;
    }).join('');
}

export function renderScheduledTasks() {
   const faults = window.faults || [];
   const { sun, sat } = wkRange(wkOffset);
   const minD = sun.toISOString().split('T')[0];
   const maxD = sat.toISOString().split('T')[0];

   const scheduled = faults.filter(f => f.status !== 'done' && f.date && f.date >= minD && f.date <= maxD);
   
   scheduled.forEach(f => {
       let timeStr = f.time || '09:00';
       let hour = timeStr.split(':')[0];
       
       if (parseInt(hour) < 8) hour = '08';
       if (parseInt(hour) > 18) hour = '18';
       
       let targetTime = hour + ':00';
       let cell = document.querySelector(`.cal-dropzone[data-date="${f.date}"][data-time="${targetTime}"]`);
       
       if (!cell) {
           cell = document.querySelector(`.cal-dropzone[data-date="${f.date}"][data-time="08:00"]`);
       }
       
       if (cell) {
           const cust = (window.custs || []).find(c => c.id === f.custId);
           const name = cust ? cust.name : (f.guestName || 'לקוח מזדמן');
           const amountHtml = (f.amount && Number(f.amount) > 0) ? `<div style="font-size:10px; background:rgba(0,0,0,0.3); display:inline-block; padding:2px 6px; border-radius:4px; margin-top:4px; font-weight:700;">💰 ${f.amount} ₪</div>` : '';
           
           const div = document.createElement('div');
           div.className = 'cal-task';
           div.style.background = getPriColor(f.pri);
           div.style.cursor = 'grab';
           div.title = "לחץ לעריכה, או גרור לשינוי/ביטול";
           
           // הפיכת המשימה ביומן לגרירה (כדי להזיז שעות או לבטל)
           div.draggable = true;
           div.ondragstart = (e) => { e.dataTransfer.setData('text/plain', f.id); };
           div.onclick = () => { if(window.editFaultById) window.editFaultById(f.id); };
           
           div.innerHTML = `<div style="font-size:10px;font-weight:700">⏱️ ${timeStr}</div>
                            <div style="font-weight:600;font-size:12px;">${name}</div>
                            <div style="font-size:10px; opacity:0.9; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${f.desc||''}</div>
                            ${amountHtml}`;
           cell.appendChild(div);
       }
   });
}

// גרירה לתוך היומן (שיבוץ או הזזה)
window._dropTask = async function(e, cell) {
    e.preventDefault();
    cell.classList.remove('drag-over');
    
    const faultId = e.dataTransfer.getData('text/plain');
    if (!faultId) return;

    const date = cell.getAttribute('data-date');
    const time = cell.getAttribute('data-time');

    const fault = (window.faults || []).find(f => f.id === faultId);
    if (!fault) return;

    const isReschedule = fault.date ? true : false;

    fault.date = date;
    fault.time = time;
    fault.status = 'scheduled';

    if (window._dbSaveFaults) {
        await window._dbSaveFaults([fault]);
        try { addLog('fault', isReschedule ? 'עדכון שיבוץ' : 'שיבוץ משימה', `משימה שובצה ל-${fmtD(date)} בשעה ${time}`); } catch(err){}
        toast(isReschedule ? 'השיבוץ עודכן בהצלחה! 🔄' : 'המשימה שובצה בהצלחה! ✅', 'success');
        buildCalendarGrid(); 
        if(window.renderDash) window.renderDash();
    }
};

// גרירה החוצה מהיומן חזרה לרשימה (ביטול שיבוץ)
window._unScheduleTask = async function(e, listEl) {
    e.preventDefault();
    listEl.style.background = 'transparent';
    
    const faultId = e.dataTransfer.getData('text/plain');
    if (!faultId) return;

    const fault = (window.faults || []).find(f => f.id === faultId);
    if (!fault || !fault.date) return; // לא עושים כלום אם היא כבר פתוחה

    fault.date = '';
    fault.time = '';
    fault.status = 'open';

    if (window._dbSaveFaults) {
        await window._dbSaveFaults([fault]);
        try { addLog('fault', 'ביטול שיבוץ', `בוטל שיבוץ למשימה`); } catch(err){}
        toast('השיבוץ בוטל - המשימה הוחזרה לרשימה 📥', 'info');
        buildCalendarGrid(); 
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
  buildCalendarGrid(); 
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