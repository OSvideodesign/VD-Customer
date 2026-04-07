// ══ log.js — audit log ══

import { uid, fmtD, toast } from './utils.js';

export function addLog(type, action, details) {
  if (!window._dbLogAdd) return;
  const entry = {
    id: uid(), type, action, details,
    user: window._currentUser || 'מערכת',
    ts: new Date().toISOString(),
  };
  window._dbLogAdd(entry);
}

// פונקציית דמה - הושארה פה ריקה כדי שהקובץ main.js לא יקרוס (הדף עצמו הוסר)
export function renderLog() {}

export async function clearLog() {
  try {
    const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js');
    const { db } = await import('./db.js');
    
    toast('מנקה את הלוג...', 'info');
    const snap = await getDocs(collection(db, 'log'));
    const ids = snap.docs.map(d => d.id);
    
    if (ids.length) {
        await window._dbDelMulti('log', ids);
    }
    
    window.logEntries = [];
    toast('לוג מערכת נוקה בהצלחה ✅');
  } catch (e) {
    console.error(e);
    toast('שגיאה במחיקת הלוג', 'err');
  }
}

export async function downloadLogCSV() {
  try {
      toast('מכין קובץ, אנא המתן...', 'info');
      
      const { collection, getDocs, orderBy, query } = await import('https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js');
      const { db } = await import('./db.js');
      
      const q = query(collection(db, 'log'), orderBy('ts', 'desc'));
      const snap = await getDocs(q);
      
      if (snap.empty) {
          toast('אין נתונים לייצוא', 'warn');
          return;
        }
        
      let csv = '\uFEFF'; // קידוד לעברית באקסל
      csv += 'תאריך ושעה,משתמש,סוג פעולה,פרטים\n';
      
      snap.forEach(doc => {
          const e = doc.data();
          const dt = new Date(e.ts);
          const dateStr = fmtD(e.ts.split('T')[0]) + ' ' + dt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
          const typeIcon = { customer: 'לקוח', fault: 'משימה', note: 'הערה', other: 'אחר' }[e.type || 'other'] || 'אחר';
          const action = (e.action || '').replace(/"/g, '""');
          const details = (e.details || '').replace(/"/g, '""');
          
          csv += `"${dateStr}","${e.user || '—'}","${typeIcon} - ${action}","${details}"\n`;
      });
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `log_backup_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast('קובץ לוג ירד בהצלחה 📥');
  } catch (err) {
      console.error(err);
      toast('שגיאה בייצוא הלוג', 'err');
  }
}

// הפיכת הפונקציות לזמינות גלובלית עבור ה-HTML
window.downloadLogCSV = downloadLogCSV;
window.clearLog = clearLog;