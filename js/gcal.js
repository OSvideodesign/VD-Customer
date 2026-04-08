// ══ gcal.js — Advanced Bidirectional Sync & Enhanced Colors ══

import { toast, fmtD } from './utils.js';
import { addLog } from './log.js';

// הכתובת הייחודית שלך לגשר של גוגל:
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyEHAp35jPUm_ZxcsD68CcGHXnImPRTPNzbBOKUsIWjILsJ1jqC_vcY62dgruXUxTn4fg/exec'; 

let wkOffset = 0;

export function gcalInit() {
  const btnPrev = document.getElementById('cal-btn-prev');
  const btnNext = document.getElementById('cal-btn-next');
  const btnToday = document.getElementById('cal-btn-today');
  
  if (btnPrev) btnPrev.onclick = wkPrev;
  if (btnNext) btnNext.onclick = wkNext;
  if (btnToday) btnToday.onclick = wkToday;

  // מסתיר את כפתורי ההתחברות הישנים (כבר אין בהם צורך)
  const loginBtn = document.getElementById('gcal-login-btn');
  const logoutBtn = document.getElementById('gcal-logout-btn');
  if (loginBtn) loginBtn.style.display = 'none';
  if (logoutBtn) logoutBtn.style.display = 'none';

  buildCalendarGrid();
  fetchWk(); // מושך אוטומטית ברקע!
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

// מיפוי צבעים מורחב למערכת
function getTaskColor(f) {
    const palette = {
        blue:   'linear-gradient(to bottom, #3b82f6, #1d4ed8)',
        green:  'linear-gradient(to bottom, #10b981, #059669)',
        yellow: 'linear-gradient(to bottom, #facc15, #ca8a04)',
        orange: 'linear-gradient(to bottom, #f59e0b, #d97706)',
        red:    'linear-gradient(to bottom, #ef4444, #dc2626)',
        purple: 'linear-gradient(to bottom, #8b5cf6, #6d28d9)',
        pink:   'linear-gradient(to bottom, #ec4899, #be185d)',
        cyan:   'linear-gradient(to bottom, #06b6d4, #0891b2)',
        indigo: 'linear-gradient(to bottom, #6366f1, #4338ca)',
        black:  'linear-gradient(to bottom, #374151, #111827)',
        gray:   'linear-gradient(to bottom, #9ca3af, #4b5563)'
    };
    
    if (f.color && palette[f.color]) return palette[f.color];
    
    switch(f.priority) {
        case 'low': return palette.green;
        case 'high': return palette.red;
        case 'urgent': return 'linear-gradient(to bottom, #b91c1c, #991b1b)';
        case 'medium':
        default: return palette.orange;
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
        
        return `<div class="cal-task" draggable="true" ondragstart="event.dataTransfer.setData('taskData', JSON.stringify({id:'${f.id}', type:'crm'}))" style="background: linear-gradient(to bottom, #3b82f6, #1d4ed8);">
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
           div.style.background = getTaskColor(f);
           div.style.cursor = 'grab';
           div.title = "לחץ לעריכה, או גרור לשינוי/ביטול";
           
           div.draggable = true;
           div.ondragstart = (e) => { e.dataTransfer.setData('taskData', JSON.stringify({id:f.id, type:'crm'})); };
           div.onclick = () => { if(window.editFaultById) window.editFaultById(f.id); };
           
           div.innerHTML = `<div style="font-size:10px;font-weight:700">⏱️ ${timeStr}</div>
                            <div style="font-weight:600;font-size:12px;">${name}</div>
                            <div style="font-size:10px; opacity:0.9; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${f.desc||''}</div>
                            ${amountHtml}`;
           cell.appendChild(div);
       }
   });
}

window._dropTask = async function(e, cell) {
    e.preventDefault();
    cell.classList.remove('drag-over');
    
    const rawData = e.dataTransfer.getData('taskData');
    if (!rawData) return;
    const data = JSON.parse(rawData);

    const date = cell.getAttribute('data-date');
    const time = cell.getAttribute('data-time');
    
    // התיקון שמוסיף את השניות (00:) לתאריך בשביל גוגל!
    const isoDateTime = date + 'T' + time + ':00';

    if (data.type === 'crm') {
        const fault = window.faults.find(f => f.id === data.id);
        if (!fault) return;
        const isReschedule = fault.date ? true : false;
        fault.date = date; fault.time = time; fault.status = 'scheduled';

        if (window._dbSaveFaults) {
            await window._dbSaveFaults([fault]);
            try { addLog('fault', isReschedule ? 'עדכון שיבוץ' : 'שיבוץ משימה', `משימה שובצה ל-${fmtD(date)} בשעה ${time}`); } catch(err){}
            toast(isReschedule ? 'השיבוץ עודכן בהצלחה! 🔄' : 'המשימה שובצה בהצלחה! ✅', 'success');
            
            // בונה את השם בצורה בטוחה כדי שלא יקרוס אם חסר תיאור או לקוח
            const c = window.custs.find(x => x.id === fault.custId);
            const titleName = c ? c.name : (fault.guestName || 'לקוח');
            const title = titleName + ' - ' + (fault.desc || 'ללא תיאור');
            
            fetch(`${GAS_URL}?action=add&title=${encodeURIComponent(title)}&start=${encodeURIComponent(isoDateTime)}`).catch(()=>{});
            
            buildCalendarGrid(); 
            if(window.renderDash) window.renderDash();
        }
    } else if (data.type === 'google') {
        // המשתמש מזיז אירוע של גוגל למשבצת חדשה
        toast('מעדכן את יומן גוגל... ⏳', 'info');
        try {
            await fetch(`${GAS_URL}?action=move&eventId=${encodeURIComponent(data.id)}&start=${encodeURIComponent(isoDateTime)}`);
            toast('אירוע גוגל עודכן בהצלחה! 🔄', 'success');
            fetchWk(); // מרענן את התצוגה מגוגל
        } catch(err) {
            toast('שגיאה בעדכון גוגל', 'err');
        }
    }
};

window._unScheduleTask = async function(e, listEl) {
    e.preventDefault();
    listEl.style.background = 'transparent';
    
    const rawData = e.dataTransfer.getData('taskData');
    if (!rawData) return;
    const data = JSON.parse(rawData);
    if (data.type !== 'crm') return; // לא מאפשרים למחוק אירועי גוגל ככה

    const fault = (window.faults || []).find(f => f.id === data.id);
    if (!fault || !fault.date) return; 

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

// ── Google Calendar Fetching (Via Apps Script API) ───────────────────────

export async function fetchWk() {
  if (!GAS_URL) return;
  const { sun, sat } = wkRange(wkOffset);
  
  try {
    const url = `${GAS_URL}?action=fetch&timeMin=${encodeURIComponent(sun.toISOString())}&timeMax=${encodeURIComponent(sat.toISOString())}`;
    const r = await fetch(url);
    const d = await r.json();
    
    if (d.items) {
       renderWkGridGCal(d.items);
    }
  } catch (e) {
    console.error("GCal fetch error", e);
  }
}

function renderWkGridGCal(evs) {
    document.querySelectorAll('.gcal-event').forEach(el => el.remove());

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
            
            // צבע ירוק כהה לזיהוי אירועי גוגל כברירת מחדל
            div.style.background = 'linear-gradient(to bottom, #065f46, #064e3b)'; 
            div.draggable = true;
            div.ondragstart = (e) => { e.dataTransfer.setData('taskData', JSON.stringify({id:ev.id, type:'google'})); };
            
            div.innerHTML = `<div style="font-size:10px;font-weight:700;color:#6ee7b7;">🗓️ Google</div>
                             <div style="font-weight:600;font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${ev.summary || 'ללא כותרת'}</div>`;
            div.title = "גרור כדי לשנות שעה: " + ev.summary;
            cell.appendChild(div);
        }
    });
}

export function wkPrev()  { wkOffset--; buildCalendarGrid(); fetchWk(); }
export function wkNext()  { wkOffset++; buildCalendarGrid(); fetchWk(); }
export function wkToday() { wkOffset = 0; buildCalendarGrid(); fetchWk(); }

// פונקציות ריקות למניעת שגיאות אם נשארו קריאות מהעבר
export function gcalSignIn() {}
export function gcalSignOut() {}
export function gcalFault(id) {}