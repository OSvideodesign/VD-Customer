// ══ settings.js — user management, roles, preferences ══

import { USERS, DEFAULT_PERMS, PERM_MODULES } from './config.js';
import { toast } from './utils.js';
import { openM, closeM } from './nav.js';

let _editingUser = null;

// ── loadSettings — populate DOM ────────────────────────────────────────────
export function loadSettings() {
  document.getElementById('s-company').value = window.cfg.company || '';
  document.getElementById('s-phone').value   = window.cfg.phone || '';
  document.getElementById('s-email').value   = window.cfg.email || '';
  document.getElementById('s-gcal').value    = window.cfg.gcal  || '';

  const u = USERS.find(x => x.name === window._currentUser);
  if (u && ['owner', 'admin'].includes(u.role)) {
    document.getElementById('s-users-panel').style.display = 'block';
    _renderUsersList();
  } else {
    document.getElementById('s-users-panel').style.display = 'none';
  }
}

// ── Users list ─────────────────────────────────────────────────────────────
function _renderUsersList() {
  const el = document.getElementById('s-users-list');
  if (!el) return;
  const ROLES = { owner: '👑 בעלים', admin: '🔧 אדמין', manager: '📋 מנהל', installer: '🔨 מתקין', tech: '🛠️ טכנאי' };
  
  el.innerHTML = USERS.map(u => {
    // בדיקה האם למשתמש יש טוקן (פעמון ירוק אם כן, אפור עם קו אם לא)
    const hasToken = (window.fcmTokens || []).some(t => t.id === u.name);
    const tokenBadge = hasToken ? '<span style="color:#10b981; font-size:12px; margin-right:5px;" title="מחובר להתראות">🔔</span>' : '<span style="color:var(--tx3); font-size:12px; margin-right:5px;" title="ללא התראות">🔕</span>';

    return `<div class="ai" style="cursor:pointer; border-right:3px solid ${u.color || '#3b82f6'}" onclick="window._openEditUser('${u.name}')">
      <div class="ci">
        <div class="av" style="background:${u.color || '#3b82f6'};width:26px;height:26px">${u.name[0]}</div>
        <div>
          <div style="font-weight:700;font-size:13px">${u.name} ${tokenBadge}</div>
          <div style="font-size:11px;color:var(--tx3)">${ROLES[u.role] || u.role}</div>
        </div>
      </div>
      <span style="color:var(--tx3)">›</span>
    </div>`;
  }).join('');
}

// ── Open Modals ────────────────────────────────────────────────────────────
export function openAddUser() {
  _editingUser = null;
  document.getElementById('M-user-title').textContent = 'משתמש חדש';
  document.getElementById('u-name').value = '';
  document.getElementById('u-pass').value = '';
  document.getElementById('u-nopass').checked = false;
  document.getElementById('u-pass').disabled  = false;
  document.getElementById('u-color').value = '#3b82f6';
  document.getElementById('u-role').value  = 'tech';
  document.getElementById('u-del-btn').style.display = 'none';
  document.getElementById('u-token').value = ''; // איפוס הטוקן במשתמש חדש

  _renderPermsGrid({ perms: DEFAULT_PERMS.tech });
  openM('M-user');
}

export function openEditUser(name) {
  _editingUser = name;
  const u = USERS.find(x => x.name === name);
  if (!u) return;
  document.getElementById('M-user-title').textContent = 'עריכת משתמש';
  document.getElementById('u-name').value = u.name;
  document.getElementById('u-pass').value = u.pass || '';
  document.getElementById('u-nopass').checked = (!u.pass || u.pass === '');
  document.getElementById('u-pass').disabled  = (!u.pass || u.pass === '');
  document.getElementById('u-color').value = u.color || '#3b82f6';
  document.getElementById('u-role').value  = u.role || 'tech';
  document.getElementById('u-del-btn').style.display = '';

  // משיכת הטוקן הספציפי של המשתמש מתוך הנתונים שהבאנו מהענן
  const tkObj = (window.fcmTokens || []).find(t => t.id === u.name);
  document.getElementById('u-token').value = tkObj && tkObj.token ? tkObj.token : '';

  _renderPermsGrid(u);
  openM('M-user');
}

// ── Permissions Grid ───────────────────────────────────────────────────────
function _renderPermsGrid(u) {
  const el = document.getElementById('u-perms-grid');
  if (!el) return;
  const p = u.perms || DEFAULT_PERMS[u.role || 'tech'] || DEFAULT_PERMS.tech;
  
  el.innerHTML = PERM_MODULES.map(m => {
    const val = p[m.key] !== undefined ? p[m.key] : 0;
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
        <span style="font-size:13px">${m.label}</span>
        <select class="finp perm-sel" data-mod="${m.key}" style="width:120px;padding:4px 8px;font-size:12px;height:auto">
          <option value="0" ${val===0?'selected':''}>חסום</option>
          <option value="1" ${val===1?'selected':''}>1 (צפייה)</option>
          <option value="2" ${val===2?'selected':''}>2 (עריכה)</option>
          <option value="3" ${val===3?'selected':''}>3 (מלא)</option>
        </select>
      </div>
    `;
  }).join('');
}

// ── Save / Delete ──────────────────────────────────────────────────────────
export function saveSettings() {
  window.cfg.company = document.getElementById('s-company').value.trim();
  window.cfg.phone   = document.getElementById('s-phone').value.trim();
  window.cfg.email   = document.getElementById('s-email').value.trim();
  window.cfg.gcal    = document.getElementById('s-gcal').value.trim();
  
  if (window._dbSaveCfg) window._dbSaveCfg(window.cfg);
  toast('הגדרות נשמרו ✅');
}

export function saveUser() {
  const name = document.getElementById('u-name').value.trim();
  if (!name) { toast('הכנס שם משתמש', 'err'); return; }

  const nopass = document.getElementById('u-nopass').checked;
  const pass = nopass ? '' : document.getElementById('u-pass').value;

  const perms = {};
  document.querySelectorAll('.perm-sel').forEach(sel => {
    perms[sel.getAttribute('data-mod')] = parseInt(sel.value);
  });

  const uData = {
    name,
    pass,
    color: document.getElementById('u-color').value,
    role:  document.getElementById('u-role').value,
    perms
  };

  if (_editingUser) {
    if (name !== _editingUser && USERS.find(x => x.name === name)) {
      toast('שם משתמש כבר קיים', 'err'); return;
    }
    const idx = USERS.findIndex(x => x.name === _editingUser);
    if (idx >= 0) USERS[idx] = uData;
  } else {
    if (USERS.find(x => x.name === name)) {
      toast('שם משתמש כבר קיים', 'err'); return;
    }
    USERS.push(uData);
  }

  window.cfg.users = USERS;
  if (window._dbSaveCfg) window._dbSaveCfg(window.cfg);

  closeM('M-user');
  _renderUsersList();
  toast('משתמש נשמר ✅');
  
  if (name === window._currentUser) setTimeout(() => location.reload(), 1000);
}

export function deleteUser() {
  if (!_editingUser) return;
  if (_editingUser === window._currentUser) { toast('לא ניתן למחוק את עצמך', 'err'); return; }
  if (!confirm('למחוק את המשתמש ' + _editingUser + '?')) return;

  const idx = USERS.findIndex(x => x.name === _editingUser);
  if (idx >= 0) USERS.splice(idx, 1);

  window.cfg.users = USERS;
  if (window._dbSaveCfg) window._dbSaveCfg(window.cfg);

  closeM('M-user');
  _renderUsersList();
  toast('משתמש נמחק 🗑️');
}