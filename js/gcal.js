// ══ gcal.js — Advanced Bidirectional Sync, Local Timezone Fix & Colors ══

import { toast, fmtD } from './utils.js';
import { addLog } from './log.js';
import { openM, closeM } from './nav.js';

// הכתובת הייחודית שלך לגשר של גוגל:
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyEHAp35jPUm_ZxcsD68CcGHXnImPRTPNzbBOKUsIWjILsJ1jqC_vcY62dgruXUxTn4fg/exec'; 

let wkOffset = 0;
let _editGcalId = null;

function toLocalYMD(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function gcalInit() {
  const btnPrev = document.getElementById('cal-btn-prev');
  const btnNext = document.getElementById('cal-btn-next');
  const btnToday = document.getElementById('cal-btn-today');
  
  if (btnPrev) btnPrev.onclick = wkPrev;
  if (btnNext) btnNext.onclick = wkNext;
  if (btnToday) btnToday.onclick = wkToday;

  const loginBtn = document.getElementById('gcal-login-btn');
  const logoutBtn = document.getElementById('gcal-logout-btn');
  if (loginBtn) loginBtn.style.display = 'none';
  if (logoutBtn) logoutBtn.style.display = 'none';

  buildCalendarGrid();
  fetchWk();
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
        case 'medium': default: return palette.orange;
    }
}

const GCAL_COLORS = {
    "1": "linear-gradient(to bottom, #a78bfa, #8b5cf6)", 
    "2": "linear-gradient(to bottom, #34d399, #10b981)", 
    "3": "linear-gradient(to bottom, #c084fc, #9333ea)", 
    "4": "linear-gradient(to bottom, #f472b6, #db2777)", 
    "5": "linear-gradient(to bottom, #fde047, #eab308)", 
    "6": "linear-gradient(to bottom, #fb923c, #ea580c)", 
    "7": "linear-gradient(to bottom, #38bdf8, #0891b2)", 
    "8": "linear-gradient(to bottom, #9ca3af, #4b5563)", 
    "9": "linear-gradient(to bottom, #60a5fa, #2563eb)", 
    "10": "linear-gradient(to bottom, #4ade80, #059669)",
    "11": "linear-gradient(to bottom, #f87171, #dc2626)",
    "0": "linear-gradient(to bottom, #065f46, #064e3b)"  
};

export function buildCalendarGrid() {
  const wrapper = document.getElementById('cal-grid-wrapper');
  if (!wrapper) return;
  
  const { sun, sat } = wkRange(wkOffset);
  const opts = { day: 'numeric', month: 'long' };
  const rangeLbl = document.getElementById('cal-date-range');
  if (rangeLbl) rangeLbl.textContent = sun.toLocaleDateString('he-IL', opts) + ' — ' + sat.toLocaleDateString('he-IL', opts);

  let html = '<div class="cal-header-cell" style="border-top:none;">שעה</div>';
  const dh = ['א','ב','ג','ד','ה','ו','ש'];
  const todayStr = toLocalYMD(new Date());

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sun); d.setDate(sun.getDate() + i); days.push(d);
    const dateStr = toLocalYMD(d);
    const isToday = (dateStr === todayStr);
    html += `<div class="cal-header-cell" style="${isToday ? 'color:var(--acc); background:rgba(59,130,246,0.1)' : ''}">יום ${dh[i]} <br><span style="font-size:18px">${d.getDate()}</span></div>`;
  }

  for (let h = 8; h <= 18; h++) {
    const timeStr = String(h).padStart(2, '0') + ':00';
    html += `<div class="cal-time-cell">${timeStr}</div>`;
    for (let i = 0; i < 7; i++) {
      const dateStr = toLocalYMD(days[i]);
      const isToday = (dateStr === todayStr);
      // הוספנו פה אירוע onclick ללחיצה על קוביית זמן!
      html += `<div class="cal-cell cal-dropzone" style="background:${isToday ? 'rgba(59,130,246,0.03)' : ''}; cursor:pointer;" 
                 data-date="${dateStr}" data-time="${timeStr}" 
                 ondragover="event.preventDefault(); this.classList.add('drag-over')" 
                 ondragleave="this.classList.remove('drag-over')" 
                 ondrop="window._dropTask(event, this)"
                 onclick="window._calSlotClick('${dateStr}', '${timeStr}')"></div>`;
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
    if (!unscheduled.length) { list.innerHTML = '<div style="text-align:center; color:var(--tx3); font-size:13px; margin-top:30px;">אין משימות להמתנה 🎉</div>'; return; }

    list.innerHTML = unscheduled.map(f => {
        const cust = (window.custs || []).find(c => c.id === f.custId);
        const name = cust ? cust.name : (f.guestName || 'לקוח מזדמן');
        // הוספנו תמיכה באייקון של פגישה
        const typeIcon = { fault: '🔧', meeting: '🤝', service: '🛠️', installation: '📦', other: '📋' }[f.type || 'fault'] || '🔧';
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
   const minD = toLocalYMD(sun);
   const maxD = toLocalYMD(sat);
   
   const scheduled = faults.filter(f => f.status !== 'done' && f.date && f.date >= minD && f.date <= maxD);
   
   scheduled.forEach(f => {
       let timeStr = f.time || '09:00';
       let hour = timeStr.split(':')[0];
       if (parseInt(hour) < 8) hour = '08';
       if (parseInt(hour) > 18) hour = '18';
       
       let cell = document.querySelector(`.cal-dropzone[data-date="${f.date}"][data-time="${hour}:00"]`);
       if (!cell) cell = document.querySelector(`.cal-dropzone[data-date="${f.date}"][data-time="08:00"]`);
       
       if (cell) {
           const c = (window.custs || []).find(x => x.id === f.custId);
           const name = c ? c.name : (f.guestName || 'לקוח מזדמן');
           const amountHtml = (f.amount && Number(f.amount) > 0) ? `<div style="font-size:10px; background:rgba(0,0,0,0.3); display:inline-block; padding:2px 6px; border-radius:4px; margin-top:4px; font-weight:700;">💰 ${f.amount} ₪</div>` : '';
           
           const div = document.createElement('div');
           div.className = 'cal-task';
           div.style.background = getTaskColor(f);
           div.style.cursor = 'grab';
           div.title = "לחץ לעריכה, או גרור לשינוי/ביטול";
           div.draggable = true;
           div.ondragstart = (e) => { e.dataTransfer.setData('taskData', JSON.stringify({id:f.id, type:'crm'})); };
           // מונע מלחיצה על משימה להפעיל את הלחיצה של המשבצת הריקה
           div.onclick = (e) => { e.stopPropagation(); if(window.editFaultById) window.editFaultById(f.id); };
           
           div.innerHTML = `<div style="font-size:10px;font-weight:700">⏱️ ${timeStr}</div>
                            <div style="font-weight:600;font-size:12px;">${name}</div>
                            <div style="font-size:10px; opacity:0.9; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${f.desc||''}</div>
                            ${amountHtml}`;
           cell.appendChild(div);
       }
   });
}

// ── חדש: לחיצה על משבצת ביומן פותחת תפריט ──
window._calSlotClick = function(date, time) {
    document.getElementById('mca-date').value = date;
    document.getElementById('mca-time').value = time;
    
    const sel = document.getElementById('mca-unscheduled');
    const unscheduled = (window.faults || []).filter(f => f.status !== 'done' && (!f.date || f.status === 'open'));
    sel.innerHTML = '<option value="">-- בחר מהרשימה --</option>' + 
        unscheduled.map(f => {
            const c = (window.custs || []).find(x => x.id === f.custId);
            const name = c ? c.name : (f.guestName || 'לקוח מזדמן');
            const typeIcon = { fault: '🔧', meeting: '🤝', service: '🛠️', installation: '📦', other: '📋' }[f.type || 'fault'] || '🔧';
            return `<option value="${f.id}">${typeIcon} ${name} - ${f.desc || ''}</option>`;
        }).join('');
    
    openM('M-cal-add');
};

// ── חדש: פונקציות להוספה מהירה ──
window._addNewCrmTask = function(type) {
    const date = document.getElementById('mca-date').value;
    const time = document.getElementById('mca-time').value;
    closeM('M-cal-add');
    if(window.openNewFault) window.openNewFault(null);
    
    setTimeout(() => {
        document.getElementById('mf-type').value = type;
        document.getElementById('mf-date').value = date;
        document.getElementById('mf-time').value = time;
        document.getElementById('mf-status').value = 'scheduled'; 
    }, 100);
};

window._addQuickGcal = function() {
    const date = document.getElementById('mca-date').value;
    const time = document.getElementById('mca-time').value;
    closeM('M-cal-add');
    
    document.getElementById('mgn-title').value = '';
    document.getElementById('mgn-date').value = date;
    document.getElementById('mgn-time').value = time;
    openM('M-gcal-new');
};

window._saveQuickGcal = async function() {
    const title = document.getElementById('mgn-title').value.trim();
    if(!title) { toast('חובה להזין כותרת', 'err'); return; }
    const date = document.getElementById('mgn-date').value;
    const time = document.getElementById('mgn-time').value;
    const isoDateTime = date + 'T' + time + ':00';
    
    closeM('M-gcal-new');
    toast('שומר ביומן גוגל... ⏳', 'info');
    try {
        await fetch(`${GAS_URL}?action=add&title=${encodeURIComponent(title)}&start=${encodeURIComponent(isoDateTime)}&colorId=8`);
        toast('האירוע נשמר בהצלחה! ✅', 'success');
        fetchWk();
    } catch(e) {
        toast('שגיאה בשמירה לגוגל', 'err');
    }
};

window._scheduleFromDropdown = async function() {
    const id = document.getElementById('mca-unscheduled').value;
    if(!id) return;
    const fault = window.faults.find(f => f.id === id);
    if(!fault) return;
    
    const date = document.getElementById('mca-date').value;
    const time = document.getElementById('mca-time').value;
    const isoDateTime = date + 'T' + time + ':00';
    
    closeM('M-cal-add');
    fault.date = date; fault.time = time; fault.status = 'scheduled';
    
    if (window._dbSaveFaults) {
        await window._dbSaveFaults([fault]);
        toast('המשימה שובצה בהצלחה! ✅', 'success');
        
        const c = window.custs.find(x => x.id === fault.custId);
        const titleName = c ? c.name : (fault.guestName || 'לקוח');
        fetch(`${GAS_URL}?action=add&title=${encodeURIComponent(titleName + ' - ' + (fault.desc || ''))}&start=${encodeURIComponent(isoDateTime)}`).catch(()=>{});
        
        buildCalendarGrid();
        if(window.renderDash) window.renderDash();
    }
};

// גרירת משימות והזזות
window._dropTask = async function(e, cell) {
    e.preventDefault();
    cell.classList.remove('drag-over');
    
    const rawData = e.dataTransfer.getData('taskData');
    if (!rawData) return;
    const data = JSON.parse(rawData);

    const date = cell.getAttribute('data-date');
    const time = cell.getAttribute('data-time');
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
            
            const c = window.custs.find(x => x.id === fault.custId);
            const titleName = c ? c.name : (fault.guestName || 'לקוח');
            fetch(`${GAS_URL}?action=add&title=${encodeURIComponent(titleName + ' - ' + (fault.desc || ''))}&start=${encodeURIComponent(isoDateTime)}`).catch(()=>{});
            
            buildCalendarGrid(); 
            if(window.renderDash) window.renderDash();
        }
    } else if (data.type === 'google') {
        toast('מעדכן את יומן גוגל... ⏳', 'info');
        try {
            const res = await fetch(`${GAS_URL}?action=move&eventId=${encodeURIComponent(data.id)}&start=${encodeURIComponent(isoDateTime)}`);
            const responseData = await res.json();
            if (responseData.error) throw new Error(responseData.error);
            toast('אירוע גוגל עודכן בהצלחה! 🔄', 'success');
            fetchWk(); 
        } catch(err) {
            toast('שגיאה: ' + (err.message || 'הפעולה נכשלה'), 'err');
        }
    }
};

window._unScheduleTask = async function(e, listEl) {
    e.preventDefault();
    listEl.style.background = 'transparent';
    const rawData = e.dataTransfer.getData('taskData');
    if (!rawData) return;
    const data = JSON.parse(rawData);
    if (data.type !== 'crm') return; 

    const fault = (window.faults || []).find(f => f.id === data.id);
    if (!fault || !fault.date) return; 

    fault.date = ''; fault.time = ''; fault.status = 'open';
    if (window._dbSaveFaults) {
        await window._dbSaveFaults([fault]);
        toast('השיבוץ בוטל - המשימה הוחזרה לרשימה 📥', 'info');
        buildCalendarGrid();
        if(window.renderDash) window.renderDash();
    }
};

window._openGcalEdit = function(id, title, colorId) {
    _editGcalId = id;
    document.getElementById('M-gcal-title-text').textContent = title;
    document.getElementById('mgc-color').value = colorId || "0";
    openM('M-gcal');
};

window._saveGcalColor = async function() {
    if (!_editGcalId) return;
    const colorId = document.getElementById('mgc-color').value;
    closeM('M-gcal');
    toast('מעדכן צבע בגוגל... ⏳', 'info');
    try {
        const res = await fetch(`${GAS_URL}?action=color&eventId=${encodeURIComponent(_editGcalId)}&colorId=${colorId}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error); 
        toast('הצבע עודכן בהצלחה! 🎨', 'success');
        fetchWk();
    } catch(e) {
        toast('שגיאה: ' + (e.message || 'נסה שוב'), 'err');
    }
};

export async function fetchWk() {
  if (!GAS_URL) return;
  const { sun, sat } = wkRange(wkOffset);
  try {
    const url = `${GAS_URL}?action=fetch&timeMin=${encodeURIComponent(sun.toISOString())}&timeMax=${encodeURIComponent(sat.toISOString())}`;
    const r = await fetch(url);
    const d = await r.json();
    if (d.items) renderWkGridGCal(d.items);
  } catch (e) { console.error("GCal fetch error", e); }
}

function renderWkGridGCal(evs) {
    document.querySelectorAll('.gcal-event').forEach(el => el.remove());

    // חילוץ המשימות שכבר משובצות במערכת (כדי למנוע כפילויות)
    const scheduledFaults = (window.faults || []).filter(f => f.status === 'scheduled' || f.status === 'done');

    evs.forEach(ev => {
        let start = ev.start.dateTime || ev.start.date;
        if(!start) return;
        
        const dateStr = start.split('T')[0];
        let hour = new Date(start).getHours();
        if(hour < 8) hour = 8;
        if(hour > 18) hour = 18;
        let timeStr = String(hour).padStart(2, '0') + ':00';
        let displayTime = ev.start.dateTime ? new Date(start).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : 'כל היום';

        // ── התיקון לכפילויות (Deduplication) ──
        // אם מצאנו במערכת משימה באותו תאריך, והשם של הלקוח שלה נמצא בכותרת של אירוע גוגל - אנחנו מסתירים את אירוע הגוגל!
        const isDuplicate = scheduledFaults.some(f => {
            if (f.date !== dateStr) return false; // לא באותו תאריך
            const c = (window.custs || []).find(x => x.id === f.custId);
            const name = c ? c.name : (f.guestName || '');
            // אם יש ללקוח שם, והשם מופיע בכותרת של גוגל
            if (name && ev.summary && ev.summary.includes(name)) return true;
            return false;
        });

        if (isDuplicate) return; // מדלג על האירוע של גוגל (לא מצייר אותו)

        let cell = document.querySelector(`.cal-dropzone[data-date="${dateStr}"][data-time="${timeStr}"]`);
        if (cell) {
            const div = document.createElement('div');
            div.className = 'cal-task gcal-event';
            
            div.style.background = GCAL_COLORS[ev.colorId] || GCAL_COLORS["0"]; 
            div.draggable = true;
            div.ondragstart = (e) => { e.dataTransfer.setData('taskData', JSON.stringify({id:ev.id, type:'google'})); };
            
            div.onclick = (e) => { e.stopPropagation(); window._openGcalEdit(ev.id, ev.summary, ev.colorId); };
            
            div.innerHTML = `<div style="font-size:10px;font-weight:700;color:rgba(255,255,255,0.8);">🗓️ Google</div>
                             <div style="font-weight:600;font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${ev.summary || 'ללא כותרת'}</div>`;
            div.title = "לחץ לעריכת צבע, או גרור להזזת שעה";
            cell.appendChild(div);
        }
    });
}

export function wkPrev()  { wkOffset--; buildCalendarGrid(); fetchWk(); }
export function wkNext()  { wkOffset++; buildCalendarGrid(); fetchWk(); }
export function wkToday() { wkOffset = 0; buildCalendarGrid(); fetchWk(); }

export function gcalSignIn() {}
export function gcalSignOut() {}
export function gcalFault(id) {}