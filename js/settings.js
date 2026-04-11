// ══ settings.js — settings page + user management ══

import { USERS, DEFAULT_PERMS } from './config.js';
import { toast } from './utils.js';
import { openM, closeM } from './nav.js';
import { addLog } from './log.js'; 

let _editUserName = null;

// ── העלאת לוגואים ורקעים עם כיווץ אוטומטי ──
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
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/png', 0.8);

            window.cfg.logos = window.cfg.logos || {};
            window.cfg.logos[type] = dataUrl;
            
            if(window._dbSaveCfg) window._dbSaveCfg(window.cfg);
            localStorage.setItem('vd_crm_logos', JSON.stringify(window.cfg.logos));
            if(window.applyLogos) window.applyLogos(); 
            toast('לוגו עודכן בהצלחה! 🎨', 'success');
        }
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
};

window.uploadCustomBg = function(input) {
    const file = input.files[0];
    if(!file) return;
    
    toast('מעבד תמונה...', 'info');

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 1024; 
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
                if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
            } else {
                if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
            }
            
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6);

            const u = window.cfg.users.find(x => x.name === window._currentUser);
            if (u) {
                u.design = u.design || {};
                u.design.bgImage = dataUrl;
                if(window._dbSaveCfg) window._dbSaveCfg(window.cfg);
                if(window.applyUserDesign) window.applyUserDesign(u);
                toast('רקע אישי הוחלף בהצלחה! 🖼️', 'success');
            }
        };
        img.src = e.target.result;
    }
    reader.readAsDataURL(file);
};

window.clearCustomBg = function() {
    const u = window.cfg.users.find(x => x.name === window._currentUser);
    if (u && u.design) {
        u.design.bgImage = null;
        if(window._dbSaveCfg) window._dbSaveCfg(window.cfg);
        if(window.applyUserDesign) window.applyUserDesign(u);
        toast('רקע אישי הוסר', 'info');
    }
};

window._resetUserPassword = function() {
    if (!_editUserName) return;
    const u = USERS.find(x => x.name === _editUserName);
    if (!u) return;
    if(confirm(`לאפס את הסיסמה ל-${u.name}? בכניסה הבאה הוא יידרש לבחור סיסמה חדשה.`)) {
        u.pass = ''; 
        if (window._dbSaveCfg) window._dbSaveCfg({ ...window.cfg, users: USERS });
        toast('הסיסמה אופסה. העובד יבחר חדשה בהתחברות הבאה.');
    }
};

// ── יצוא הפונקציות וקשירה ישירה למסך למניעת השגיאות שחווית ──

export function loadSettings() {
  if (document.getElementById('s-company')) document.getElementById('s-company').value = window.cfg.company || '';
  if (document.getElementById('s-phone'))   document.getElementById('s-phone').value   = window.cfg.phone   || '';
  if (document.getElementById('s-email'))   document.getElementById('s-email').value   = window.cfg.email   || '';

  const canManageUsers = ['owner', 'admin'].includes(window._currentRole) || window._currentUser === 'רז';
  const panel = document.getElementById('s-users-panel');
  if (panel) panel.style.display = canManageUsers ? '' : 'none';
  if (canManageUsers) renderUsersList();
}
window.loadSettings = loadSettings;

export function saveSettings() {
  if (document.getElementById('s-company')) window.cfg.company = document.getElementById('s-company').value.trim();
  if (document.getElementById('s-phone'))   window.cfg.phone   = document.getElementById('s-phone').value.trim();
  if (document.getElementById('s-email'))   window.cfg.email   = document.getElementById('s-email').value.trim();
  
  if (window._dbSaveCfg) window._dbSaveCfg(window.cfg);
  localStorage.setItem('crm_cfg', JSON.stringify(window.cfg));
  toast('הגדרות נשמרו ✅');
}
window.saveSettings = saveSettings;

export function renderUsersList() {
  const el = document.getElementById('s-users-list');
  if (!el) return;
  el.innerHTML = USERS.map(u => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--sur2);border-radius:8px;margin-bottom:8px">
      <div style="width:32px;height:32px;border-radius:50%;background:${u.color || '#3b82f6'};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#fff">${u.name[0]}</div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:13px">${u.name}</div>
        <div style="font-size:11px;color:var(--tx3)">${(!u.pass || u.pass === '') ? 'ללא סיסמה / לא הוגדר' : (u.pass === 'NOPASS' ? 'כניסה חופשית' : '🔑 סיסמה: ' + u.pass)}</div>
      </div>
      <button class="btn bs btn-sm" onclick="window.openEditUser('${u.name}')">✏️ ערוך</button>
    </div>`).join('');
}

export function openAddUser() {
  _editUserName = null;
  document.getElementById('M-user-title').textContent = 'משתמש חדש';
  document.getElementById('u-name').value   = '';
  document.getElementById('u-name').disabled = false;
  document.getElementById('u-pass').value   = ''; 
  document.getElementById('u-nopass').checked = false;
  
  // מחזיר את הצבע לברירת מחדל אם אין
  if(document.getElementById('u-color')) document.getElementById('u-color').value = '#3b82f6';
  
  document.getElementById('u-del-btn').style.display = 'none';
  
  renderPermsGrid({});
  openM('M-user');
}
window.openAddUser = openAddUser;

export function openEditUser(name) {
  const u = USERS.find(x => x.name === name); if (!u) return;
  _editUserName = name;
  document.getElementById('M-user-title').textContent = 'עריכת ' + name;
  document.getElementById('u-name').value   = u.name;
  document.getElementById('u-name').disabled = true;
  
  // מושך את הצבע ששמור לפרופיל של המשתמש
  if(document.getElementById('u-color')) document.getElementById('u-color').value = u.color || '#3b82f6';
  
  const nopass = (u.pass === 'NOPASS');
  document.getElementById('u-nopass').checked  = nopass;
  
  document.getElementById('u-pass').value = nopass ? '' : (u.pass || '');
  document.getElementById('u-del-btn').style.display = name === 'רז' ? 'none' : '';

  renderPermsGrid(u.perms || {});
  openM('M-user');
}
window.openEditUser = openEditUser;
window._openEditUser = openEditUser;

export function renderPermsGrid(p) {
  const map = { customers:'👥 לקוחות', faults:'🔧 משימות', notes:'📝 הערות', warranties:'🛡️ אחריות', debts:'💰 חובות', archive:'✅ ארכיון', reports:'📈 דוחות' };
  const grid = document.getElementById('u-perms-grid');
  if (!grid) return;
  
  let h = '';
  for (let k in map) {
    const v = p[k] !== undefined ? p[k] : 3; 
    h += `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.1)">
      <div style="font-weight:600; font-size:13px;">${map[k]}</div>
      <select class="finp perm-sel" data-key="${k}" style="width:200px; padding:6px; font-size:12px; cursor:pointer;" id="p-${k}">
        <option value="0" ${v==0?'selected':''}>🚫 חסום (לא יראה את המסך בכלל)</option>
        <option value="1" ${v==1?'selected':''}>👁️ צפייה בלבד</option>
        <option value="2" ${v==2?'selected':''}>✏️ צפייה + הוספה ועריכה</option>
        <option value="3" ${v==3?'selected':''}>👑 ניהול מלא (כולל מחיקה)</option>
      </select>
    </div>`;
  }
  grid.innerHTML = h;
}

function getPermsFromGrid() {
  const perms = {};
  document.querySelectorAll('.perm-sel').forEach(sel => { perms[sel.dataset.key] = parseInt(sel.value); });
  return perms;
}

export function saveUser() {
  const name  = _editUserName || document.getElementById('u-name').value.trim();
  const nopass = document.getElementById('u-nopass').checked;
  const passInp = document.getElementById('u-pass').value.trim();
  const colorInp = document.getElementById('u-color') ? document.getElementById('u-color').value : '#3b82f6';
  
  if (!name) { toast('חובה להכניס שם', 'err'); return; }
  
  let pass = passInp;
  if (nopass) pass = 'NOPASS';

  const perms = getPermsFromGrid();
  
  if (_editUserName) {
    const idx = USERS.findIndex(x => x.name === _editUserName);
    if (idx >= 0) USERS[idx] = { ...USERS[idx], pass, color: colorInp, perms };
  } else {
    if (USERS.find(x => x.name === name)) { toast('משתמש עם שם זה כבר קיים', 'err'); return; }
    USERS.push({ name, pass, color: colorInp, role: 'admin', perms });
  }
  
  if (window._dbSaveCfg) window._dbSaveCfg({ ...window.cfg, users: USERS });
  
  // מחיל את הצבע המעודכן אם המשתמש ערך את עצמו
  if (name === window._currentUser && window.applyUserDesign) {
      window.applyUserDesign(USERS.find(x => x.name === name));
  }

  addLog('system', _editUserName ? 'עריכת משתמש' : 'משתמש חדש', name);
  closeM('M-user');
  renderUsersList();
  toast('משתמש נשמר ✅');
}
window.saveUser = saveUser;

export function deleteUser() {
  if (!_editUserName) return;
  if (_editUserName === 'רז') { toast('לא ניתן למחוק את מנהל המערכת הראשי', 'err'); return; }
  if (!confirm('למחוק את המשתמש ' + _editUserName + '?')) return;
  const idx = USERS.findIndex(x => x.name === _editUserName);
  if (idx >= 0) USERS.splice(idx, 1);
  if (window._dbSaveCfg) window._dbSaveCfg({ ...window.cfg, users: USERS });
  addLog('system', 'מחיקת משתמש', _editUserName);
  closeM('M-user');
  renderUsersList();
  toast('משתמש נמחק ✅');
}
window.deleteUser = deleteUser;