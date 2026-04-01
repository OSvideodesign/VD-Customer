// ══ auth.js — login, logout, session, permissions ══

import { USERS, DEFAULT_PERMS } from './config.js';
import { toast } from './utils.js';
import { addLog } from './log.js';

let _loginTarget = null;

// ── Clean corrupt session on load ──────────────────────────────────────────
(function () {
  try {
    const s = sessionStorage.getItem('crm_user');
    if (s) {
      const u = JSON.parse(s);
      if (!u || !u.name || u.pass === undefined) sessionStorage.removeItem('crm_user');
    }
  } catch (e) { sessionStorage.removeItem('crm_user'); }
})();

// ── Public: getPerms, canDo ────────────────────────────────────────────────
export function getPerms(u) {
  return u.perms || DEFAULT_PERMS[u.role || 'tech'] || DEFAULT_PERMS.tech;
}

export function canDo(module, level) {
  const u = USERS.find(x => x.name === window._currentUser);
  if (!u) return false;
  return (getPerms(u)[module] || 0) >= level;
}

// ── initLogin — show user buttons or restore session ───────────────────────
export function initLogin() {
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
  btns.innerHTML = USERS.map(u =>
    `<button onclick="window._selectUser('${u.name}')"
       style="background:${u.color}22;border:2px solid ${u.color};border-radius:10px;padding:14px 8px;cursor:pointer;font-family:Heebo,sans-serif;color:${u.color};font-weight:700;font-size:15px">
       <div style="font-size:24px;margin-bottom:4px">${u.name[0]}</div>${u.name}</button>`
  ).join('');
  document.getElementById('login-screen').style.display = 'flex';
}

export function selectUser(name) {
  _loginTarget = USERS.find(u => u.name === name);
  if (!_loginTarget) return;
  if (!_loginTarget.pass || _loginTarget.pass === '') {
    sessionStorage.setItem('crm_user', JSON.stringify(_loginTarget));
    applyUser(_loginTarget);
    return;
  }
  document.getElementById('pass-label').textContent = 'שלום ' + name + ', הכנס סיסמה:';
  document.getElementById('pass-area').style.display = 'block';
  document.getElementById('user-btns').style.display = 'none';
  document.getElementById('pass-err').style.display = 'none';
  document.getElementById('pass-inp').value = '';
  setTimeout(() => document.getElementById('pass-inp').focus(), 100);
}

export function doLogin() {
  const inp = document.getElementById('pass-inp').value;
  if (!_loginTarget || inp !== _loginTarget.pass) {
    document.getElementById('pass-err').style.display = 'block';
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
  backToUsers();
}

// ── applyUser — set globals, show/hide nav, log entry ─────────────────────
export function applyUser(u) {
  if (!u || !u.name) return;
  window._currentUser  = u.name;
  window._currentColor = u.color;
  window._currentRole  = u.role || 'tech';

  document.getElementById('login-screen').style.display = 'none';

  const b = document.getElementById('user-badge');
  if (b) {
    b.textContent = u.name;
    b.style.background = u.color + '22';
    b.style.color = u.color;
    b.style.border = '1px solid ' + u.color + '44';
  }

  const perms = getPerms(u);
  const moduleToNav = {
    customers: 'nb-customers', faults: 'nb-faults', archive: 'nb-archive',
    notes: 'nb-notes', warranties: 'nb-warranties', debts: 'nb-debts', reports: 'nb-reports',
  };
  Object.entries(moduleToNav).forEach(([mod, nbId]) => {
    const el = document.getElementById(nbId);
    if (el) el.style.display = (perms[mod] || 0) >= 1 ? '' : 'none';
  });

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
