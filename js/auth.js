// ══ auth.js — login, logout, session, permissions ══

import { USERS, DEFAULT_PERMS } from './config.js';
import { toast, ini } from './utils.js';
import { addLog } from './log.js';

let _loginTarget = null;

function toggleAppView(show) {
  const els = ['.sidebar', '.main', '#mnav'];
  els.forEach(sel => {
    const el = document.querySelector(sel);
    if (el) el.style.display = show ? '' : 'none';
  });
}

(function () {
  try {
    const s = sessionStorage.getItem('crm_user');
    if (s) {
      const u = JSON.parse(s);
      if (!u || !u.name || u.pass === undefined) sessionStorage.removeItem('crm_user');
    }
  } catch (e) { sessionStorage.removeItem('crm_user'); }
})();

export function getPerms(u) {
  return u.perms || DEFAULT_PERMS[u.role || 'tech'] || DEFAULT_PERMS.tech;
}

export function canDo(module, level) {
  const u = USERS.find(x => x.name === window._currentUser);
  if (!u) return false;
  return (getPerms(u)[module] || 0) >= level;
}

export function initLogin() {
  toggleAppView(false);

  const saved = sessionStorage.getItem('crm_user');
  if (saved) {
    try {
      const u = JSON.parse(saved);
      if (u && u.name && u.pass !== undefined && USERS.find(x => x.name === u.name && x.pass === u.pass)) {
        applyUser(u);
        return;
      } else {
        sessionStorage.removeItem('crm_user');
      }
    } catch (e) { sessionStorage.removeItem('crm_user'); }
  }

  const btns = document.getElementById('user-btns');
  if (btns) {
    btns.innerHTML = USERS.map(u => {
      const glowColor = (u.color || '#444') + '40';
      return `<button class="login-user-btn" onclick="window._selectUser('${u.name}')" style="--user-glow: ${glowColor}; color: ${u.color || '#fff'};">
         <div class="login-user-icon">${u.name[0]}</div>
         <div class="login-user-name">${u.name}</div>
       </button>`;
    }).join('');
  }
  
  document.getElementById('login-screen').style.display = 'flex';
}

export function selectUser(name) {
  _loginTarget = USERS.find(u => u.name === name);
  if (!_loginTarget) return;
  
  if (_loginTarget.pass === 'NOPASS') {
    sessionStorage.setItem('crm_user', JSON.stringify(_loginTarget));
    applyUser(_loginTarget);
    return;
  }
  
  document.getElementById('pass-label').textContent = 'שלום ' + name + ', הכנס סיסמה:';
  document.getElementById('pass-area').style.display = 'block';
  document.getElementById('user-btns').style.display = 'none';
  document.getElementById('pass-err').style.display = 'none';
  
  const inp = document.getElementById('pass-inp');
  if(inp) inp.value = '';
  
  const fMsg = document.getElementById('first-time-msg');
  if(fMsg) {
      if (!_loginTarget.pass || _loginTarget.pass === '') {
          fMsg.style.display = 'block'; 
          if(inp) inp.placeholder = 'הקלד סיסמה חדשה...';
      } else {
          fMsg.style.display = 'none';
          if(inp) inp.placeholder = 'סיסמה';
      }
  }
  
  setTimeout(() => { if(inp) inp.focus(); }, 100);
}

export function doLogin() {
  const inp = document.getElementById('pass-inp').value;
  const err = document.getElementById('pass-err');
  
  if (!_loginTarget) return;
  
  if (!_loginTarget.pass || _loginTarget.pass === '') {
      if (inp.length < 3) {
          if(err) { err.textContent = 'הסיסמה חייבת להכיל לפחות 3 תווים'; err.style.display = 'block'; }
          return;
      }
      _loginTarget.pass = inp; 
      
      if (window.cfg) {
          window.cfg.users = window.cfg.users || [...USERS]; 
          const cfgU = window.cfg.users.find(x => x.name === _loginTarget.name);
          if (cfgU) {
              cfgU.pass = inp;
          } else {
              window.cfg.users.push(_loginTarget);
          }
          if (window._dbSaveCfg) window._dbSaveCfg(window.cfg); 
      }
      toast('הסיסמה האישית נשמרה בהצלחה!', 'success');
  } 
  else if (inp !== _loginTarget.pass) {
    if(err) { err.textContent = 'סיסמה שגויה ❌'; err.style.display = 'block'; }
    return;
  }
  
  sessionStorage.setItem('crm_user', JSON.stringify(_loginTarget));
  applyUser(_loginTarget);
}

export function backToUsers() {
  _loginTarget = null;
  document.getElementById('pass-area').style.display = 'none';
  document.getElementById('user-btns').style.display = 'grid'; 
}

export function logout() {
  sessionStorage.removeItem('crm_user');
  document.getElementById('login-screen').style.display = 'flex';
  toggleAppView(false); 
  backToUsers();
}

export function applyUser(u) {
  if (!u || !u.name) return;
  window._currentUser  = u.name;
  window._currentColor = u.color;
  window._currentRole  = u.role || 'tech';

  document.getElementById('login-screen').style.display = 'none';
  toggleAppView(true);

  if (window.applyUserDesign) window.applyUserDesign(u);

  const badgeDisplay = document.getElementById('user-badge-display');
  if (badgeDisplay) {
    badgeDisplay.innerHTML = `<span style="color:${u.color || '#fff'}; font-size:16px;">👤</span> מחובר כ: ${u.name}`;
  }

  const mBadgeDisplay = document.getElementById('m-user-badge-display');
  if (mBadgeDisplay) {
    mBadgeDisplay.innerHTML = `<span style="color:${u.color || '#fff'}; font-size:15px; margin-left:6px;">👤</span> שלום, <strong style="color:${u.color || '#fff'}">${u.name}</strong>`;
  }

  const perms = getPerms(u);
  const checkPerm = (btns, key) => {
      if(perms[key] === 0) {
          btns.forEach(b => { const el = document.getElementById(b); if(el) el.style.display = 'none'; });
      } else {
          btns.forEach(b => { const el = document.getElementById(b); if(el) el.style.display = ''; });
      }
  };

  checkPerm(['nb-customers', 'mn-cust', 'md-customers'], 'customers');
  checkPerm(['nb-faults', 'mn-fault', 'md-faults'], 'faults');
  checkPerm(['nb-notes', 'mn-note', 'md-notes'], 'notes');
  checkPerm(['nb-archive', 'md-archive'], 'archive');
  checkPerm(['nb-warranties', 'md-warranties'], 'warranties');
  checkPerm(['nb-debts', 'md-debts'], 'debts');
  checkPerm(['nb-reports', 'md-reports'], 'reports');

  const canSeeLog = ['רז', 'אופיר'].includes(u.name) || ['owner', 'admin'].includes(u.role);
  ['nb-log', 'm-drawer-log'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = canSeeLog ? '' : 'none';
  });

  const isMobile = /iPhone|iPad|Android/.test(navigator.userAgent);
  setTimeout(() => {
    try { addLog('other', 'כניסה למערכת', u.name + ' — ' + (isMobile ? '📱 מובייל' : '💻 מחשב')); } catch (e) {}
  }, 3000);
}

window._selectUser = selectUser;
window.doLogin = doLogin;
window.backToUsers = backToUsers;
window.logout = logout;