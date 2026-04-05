// ══ settings.js — settings page + user management ══

import { USERS, DEFAULT_PERMS, PERM_MODULES } from './config.js';
import { getPerms } from './auth.js';
import { toast } from './utils.js';
import { openM, closeM } from './nav.js';

let _editUserName = null;

export function loadSettings() {
  document.getElementById('s-company').value = window.cfg.company || '';
  document.getElementById('s-phone').value   = window.cfg.phone   || '';
  document.getElementById('s-email').value   = window.cfg.email   || '';
  document.getElementById('s-gcal').value    = window.cfg.gcal    || '';

  const design = JSON.parse(localStorage.getItem('vd_crm_design') || '{}');
  if (document.getElementById('ds-logo-side')) {
    document.getElementById('ds-logo-side').value = design.logoSide || '';
    document.getElementById('ds-logo-login').value = design.logoLogin || '';
  }

  const canManageUsers = ['owner', 'admin'].includes(window._currentRole);
  const panel = document.getElementById('s-users-panel');
  if (panel) panel.style.display = canManageUsers ? '' : 'none';
  if (canManageUsers) renderUsersList();
}

export function saveSettings() {
  window.cfg.company = document.getElementById('s-company').value.trim();
  window.cfg.phone   = document.getElementById('s-phone').value.trim();
  window.cfg.email   = document.getElementById('s-email').value.trim();
  window.cfg.gcal    = document.getElementById('s-gcal').value.trim();
  
  if (window._dbSaveCfg) window._dbSaveCfg(window.cfg);
  localStorage.setItem('crm_cfg', JSON.stringify(window.cfg));
  toast('הגדרות נשמרו ✅');
}

export function renderUsersList() {
  const el = document.getElementById('s-users-list');
  if (!el) return;
  const ROLE_LBL = { owner: '👑 בעלים', admin: '🔧 אדמין', manager: '📋 מנהל', installer: '🔨 מתקין', tech: '🔧 טכנאי' };
  el.innerHTML = USERS.map(u => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--sur2);border-radius:8px;margin-bottom:8px">
      <div style="width:32px;height:32px;border-radius:50%;background:${u.color};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#fff">${u.name[0]}</div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:13px">${u.name}</div>
        <div style="font-size:11px;color:var(--tx3)">${ROLE_LBL[u.role || 'tech'] || u.role} • ${u.tokens?.length || 0} מכשירים</div>
      </div>
      <button class="btn bs btn-sm" onclick="window._openEditUser('${u.name}')">✏️ ערוך</button>
    </div>`).join('');
}

export function openAddUser() {
  _editUserName = null;
  document.getElementById('M-user-title').textContent = 'משתמש חדש';
  document.getElementById('u-name').value   = '';
  document.getElementById('u-pass').value   = '';
  document.getElementById('u-pass').disabled = false;
  document.getElementById('u-nopass').checked = false;
  document.getElementById('u-color').value  = '#3b82f6';
  document.getElementById('u-role').value   = 'tech';
  document.getElementById('u-name').disabled = false;
  document.getElementById('u-del-btn').style.display = 'none';
  renderPermsGrid(DEFAULT_PERMS.tech);
  renderTokenManager([]);
  openM('M-user');
}

export function openEditUser(name) {
  const u = USERS.find(x => x.name === name); if (!u) return;
  _editUserName = name;
  document.getElementById('M-user-title').textContent = 'עריכת ' + name;
  document.getElementById('u-name').value   = u.name;
  document.getElementById('u-pass').value   = u.pass || '';
  const nopass = !u.pass || u.pass === '';
  document.getElementById('u-nopass').checked  = nopass;
  document.getElementById('u-pass').disabled   = nopass;
  document.getElementById('u-color').value = u.color;
  document.getElementById('u-role').value  = u.role || 'tech';
  document.getElementById('u-name').disabled = true;
  document.getElementById('u-del-btn').style.display = name === 'רז' ? 'none' : '';
  renderPermsGrid(getPerms(u));
  renderTokenManager(u.tokens || []);
  openM('M-user');
}

export function renderTokenManager(tokens) {
  const grid = document.getElementById('u-perms-grid');
  const old = document.getElementById('token-mgmt-sec');
  if (old) old.remove();

  let tokenHtml = `
    <div id="token-mgmt-sec" style="grid-column: 1/-1; margin-top: 20px; border-top:1px solid #333; padding-top:15px;">
      <div class="stit">📱 ניהול מכשירים (Push Tokens)</div>
      <div id="token-list" style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px;">
        ${tokens.map((t, i) => `
          <div style="display:flex; gap:6px; align-items:center; background:var(--sur3); padding:6px 10px; border-radius:6px;">
            <input class="finp token-val" style="font-size:10px; padding:5px; flex:1" value="${t}" readonly>
            <button class="btn bs btn-sm" onclick="this.parentElement.remove()" style="color:var(--red)">✕</button>
          </div>
        `).join('')}
      </div>
      <div style="display:flex; gap:8px;">
        <input class="finp" id="new-token-inp" placeholder="הדבק טוקן חדש..." style="font-size:12px; flex:1">
        <button class="btn bp btn-sm" onclick="window._addTokenRow()">+</button>
      </div>
    </div>
  `;
  grid.insertAdjacentHTML('afterend', tokenHtml);
}

window._addTokenRow = () => {
    const val = document.getElementById('new-token-inp').value.trim();
    if(!val) return;
    const div = document.createElement('div');
    div.style.cssText = "display:flex; gap:6px; align-items:center; background:var(--sur3); padding:6px 10px; border-radius:6px;";
    div.innerHTML = `<input class="finp token-val" style="font-size:10px; padding:5px; flex:1" value="${val}" readonly><button class="btn bs btn-sm" onclick="this.parentElement.remove()" style="color:var(--red)">✕</button>`;
    document.getElementById('token-list').appendChild(div);
    document.getElementById('new-token-inp').value = '';
};

export function saveUser() {
  const name  = _editUserName || document.getElementById('u-name').value.trim();
  const nopass = document.getElementById('u-nopass').checked;
  const pass   = nopass ? '' : document.getElementById('u-pass').value.trim();
  const color  = document.getElementById('u-color').value;
  const role   = document.getElementById('u-role').value;
  
  const tokens = [...document.querySelectorAll('.token-val')].map(i => i.value);
  const perms = getPermsFromGrid();

  if (_editUserName) {
    const idx = USERS.findIndex(x => x.name === _editUserName);
    if (idx >= 0) USERS[idx] = { ...USERS[idx], pass, color, role, perms, tokens };
  } else {
    if (USERS.find(x => x.name === name)) { toast('משתמש עם שם זה כבר קיים', 'err'); return; }
    USERS.push({ name, pass, color, role, perms, tokens });
  }
  if (window._dbSaveCfg) window._dbSaveCfg({ ...window.cfg, users: USERS });
  closeM('M-user');
  renderUsersList();
  toast('משתמש נשמר ✅');
}

export function deleteUser() {
  if (!_editUserName) return;
  if (_editUserName === 'רז') { toast('לא ניתן למחוק את רז', 'err'); return; }
  if (!confirm('למחוק את המשתמש ' + _editUserName + '?')) return;
  const idx = USERS.findIndex(x => x.name === _editUserName);
  if (idx >= 0) USERS.splice(idx, 1);
  if (window._dbSaveCfg) window._dbSaveCfg({ ...window.cfg, users: USERS });
  closeM('M-user');
  renderUsersList();
  toast('משתמש נמחק ✅');
}

export function renderPermsGrid(perms) {
  const grid = document.getElementById('u-perms-grid');
  if (!grid) return;
  grid.innerHTML = PERM_MODULES.map(m => `
    <div style="background:var(--sur2);border-radius:8px;padding:8px 10px">
      <div style="font-size:12px;font-weight:600;margin-bottom:6px">${m.label}</div>
      <select class="finp perm-sel" data-key="${m.key}" style="font-size:12px;padding:5px 8px">
        <option value="0">🚫 אין גישה</option>
        <option value="1">👁️ צפייה בלבד</option>
        <option value="2">✏️ צפייה + עריכה</option>
        <option value="3">🔓 גישה מלאה</option>
      </select>
    </div>`).join('');
  PERM_MODULES.forEach(m => {
    const sel = grid.querySelector(`[data-key="${m.key}"]`);
    if (sel) sel.value = String(perms[m.key] || 0);
  });
}

function getPermsFromGrid() {
  const perms = {};
  document.querySelectorAll('.perm-sel').forEach(sel => { perms[sel.dataset.key] = parseInt(sel.value); });
  return perms;
}