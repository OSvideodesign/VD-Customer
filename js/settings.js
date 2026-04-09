// ══ settings.js — settings page & user management ══

import { USERS } from './config.js';
import { toast, uid } from './utils.js';
import { addLog } from './log.js';
import { openM, closeM } from './nav.js';

let _eUser = null;

window.uploadLogo = function(input, type) {
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = type === 'header' ? 600 : 300; 
            let width = img.width;
            let height = img.height;
            if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            const dataUrl = canvas.toDataURL('image/png', 0.8);

            window.cfg.logos = window.cfg.logos || {};
            window.cfg.logos[type] = dataUrl;
            
            if(window._dbSaveCfg) window._dbSaveCfg(window.cfg);
            localStorage.setItem('vd_crm_logos', JSON.stringify(window.cfg.logos));
            window.applyLogos(); 
            
            toast('לוגו עודכן בהצלחה! 🎨', 'success');
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
};

export function renderSettings() {
  document.getElementById('s-company').value = window.cfg.company || '';
  document.getElementById('s-phone').value   = window.cfg.phone || '';
  document.getElementById('s-email').value   = window.cfg.email || '';
  
  const u = USERS.find(x => x.name === window._currentUser);
  if (u && (u.perms && u.perms.custs === 3)) {
    document.getElementById('s-users-panel').style.display = 'block';
    renderUsers();
  } else {
    document.getElementById('s-users-panel').style.display = 'none';
  }
}

export function saveSettings() {
  window.cfg.company = document.getElementById('s-company').value.trim();
  window.cfg.phone   = document.getElementById('s-phone').value.trim();
  window.cfg.email   = document.getElementById('s-email').value.trim();
  
  if (window._dbSaveCfg) window._dbSaveCfg(window.cfg);
  addLog('system', 'עדכון הגדרות חברה', '');
  toast('הגדרות נשמרו ✅');
}

function renderUsers() {
  const el = document.getElementById('s-users-list');
  el.innerHTML = (window.cfg.users || []).map(u => `
    <div style="background:var(--sur2); padding:10px; border-radius:8px; border:1px solid var(--brd); display:flex; justify-content:space-between; align-items:center;">
      <div style="display:flex; align-items:center; gap:10px;">
        <div style="width:24px; height:24px; border-radius:50%; background:${u.color || '#ccc'}"></div>
        <div style="font-weight:bold; font-size:14px;">${u.name}</div>
      </div>
      <button class="btn bs btn-sm" onclick="editUser('${u.name}')">✏️ ערוך</button>
    </div>
  `).join('');
}

export function openAddUser() {
  _eUser = null;
  document.getElementById('M-user-title').textContent = 'הוספת משתמש';
  document.getElementById('u-name').value   = '';
  document.getElementById('u-color').value  = '#3b82f6';
  document.getElementById('u-nopass').checked = false;
  document.getElementById('u-del-btn').style.display = 'none';
  document.getElementById('u-reset-pass-btn').style.display = 'none';
  
  buildPermsGrid({});
  openM('M-user');
}

window.editUser = function(name) {
  const u = (window.cfg.users || []).find(x => x.name === name);
  if (!u) return;
  _eUser = name;
  document.getElementById('M-user-title').textContent = 'עריכת משתמש';
  document.getElementById('u-name').value   = u.name;
  document.getElementById('u-color').value  = u.color || '#3b82f6';
  document.getElementById('u-nopass').checked = (u.pass === 'NOPASS');
  document.getElementById('u-del-btn').style.display = '';
  
  const rstBtn = document.getElementById('u-reset-pass-btn');
  if (u.pass && u.pass !== 'NOPASS') rstBtn.style.display = 'block';
  else rstBtn.style.display = 'none';

  buildPermsGrid(u.perms || {});
  openM('M-user');
}

window._resetUserPassword = function() {
    if (!_eUser) return;
    const u = window.cfg.users.find(x => x.name === _eUser);
    if (!u) return;
    if(confirm(`לאפס את הסיסמה ל-${u.name}? בכניסה הבאה הוא יידרש לבחור סיסמה חדשה.`)) {
        u.pass = ''; 
        if(window._dbSaveCfg) window._dbSaveCfg(window.cfg);
        document.getElementById('u-reset-pass-btn').style.display = 'none';
        toast('הסיסמה אופסה. העובד יבחר חדשה בהתחברות הבאה.');
    }
}

// ── התפריט הברור והחדש! ──
function buildPermsGrid(p) {
  const map = { custs:'👥 לקוחות', faults:'🔧 משימות', notes:'📝 הערות', warr:'🛡️ אחריות', debts:'💰 חובות', archive:'✅ ארכיון', reports:'📈 דוחות' };
  let h = '';
  for (let k in map) {
    const v = p[k] !== undefined ? p[k] : 3; // ברירת מחדל לגישה מלאה למשתמש חדש
    h += `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--brd)">
      <div style="font-weight:600; font-size:14px;">${map[k]}</div>
      <select class="finp" style="width:200px; padding:6px; font-size:13px; cursor:pointer;" id="p-${k}">
        <option value="0" ${v==0?'selected':''}>🚫 חסום (יוסתר מהמסך)</option>
        <option value="1" ${v==1?'selected':''}>👁️ צפייה בלבד</option>
        <option value="2" ${v==2?'selected':''}>✏️ צפייה + הוספה/עריכה</option>
        <option value="3" ${v==3?'selected':''}>👑 ניהול מלא (כולל מחיקה)</option>
      </select>
    </div>`;
  }
  document.getElementById('u-perms-grid').innerHTML = h;
}

window.saveUser = function() {
  const n = document.getElementById('u-name').value.trim();
  if (!n) { toast('הכנס שם משתמש', 'err'); return; }
  if (!_eUser && (window.cfg.users || []).some(x => x.name === n)) { toast('שם כבר קיים', 'err'); return; }

  let pass = '';
  if (document.getElementById('u-nopass').checked) pass = 'NOPASS';
  else if (_eUser) {
      const existing = window.cfg.users.find(x => x.name === _eUser);
      pass = existing ? existing.pass : '';
  }

  const p = {};
  ['custs','faults','notes','warr','debts','archive','reports'].forEach(k => {
    p[k] = parseInt(document.getElementById('p-' + k).value) || 0;
  });

  const u = {
    name: n,
    color: document.getElementById('u-color').value,
    pass: pass,
    perms: p
  };

  window.cfg.users = window.cfg.users || [];
  if (_eUser) window.cfg.users = window.cfg.users.map(x => x.name === _eUser ? u : x);
  else window.cfg.users.push(u);

  USERS.length = 0; window.cfg.users.forEach(x => USERS.push(x));
  if (window._dbSaveCfg) window._dbSaveCfg(window.cfg);
  
  addLog('system', _eUser ? 'עריכת משתמש' : 'משתמש חדש', n);
  closeM('M-user');
  renderUsers();
  toast('המשתמש נשמר בהצלחה ✅');
}

window.deleteUser = function() {
  if (window.cfg.users.length <= 1) { toast('לא ניתן למחוק משתמש אחרון', 'err'); return; }
  if (confirm('בטוח שברצונך למחוק משתמש זה?')) {
    window.cfg.users = window.cfg.users.filter(x => x.name !== _eUser);
    USERS.length = 0; window.cfg.users.forEach(x => USERS.push(x));
    if (window._dbSaveCfg) window._dbSaveCfg(window.cfg);
    addLog('system', 'מחיקת משתמש', _eUser);
    closeM('M-user');
    renderUsers();
    toast('משתמש נמחק 🗑️');
  }
}