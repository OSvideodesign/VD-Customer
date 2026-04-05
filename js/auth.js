// ══ auth.js — login, logout, session, permissions ══

import { initializeApp, getApp, getApps } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js';
import { getMessaging, getToken, deleteToken } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging.js';
import { FIREBASE_CONFIG, USERS, DEFAULT_PERMS, VAPID_KEY } from './config.js';
import { toast } from './utils.js';
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
      if (u && u.name && USERS.find(x => x.name === u.name)) {
        applyUser(u);
        return;
      }
    } catch (e) {}
  }
  
  const btns = document.getElementById('user-btns');
  if (btns) {
    btns.innerHTML = USERS.map(u => {
      const glowColor = u.color + '40';
      return `<button class="login-user-btn" onclick="window._selectUser('${u.name}')" style="--user-glow: ${glowColor}; color: ${u.color};">
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
  location.reload();
}

export async function applyUser(u) {
  if (!u || !u.name) return;
  window._currentUser  = u.name;
  window._currentColor = u.color;
  window._currentRole  = u.role || 'tech';

  document.getElementById('login-screen').style.display = 'none';
  toggleAppView(true);

  const badgeDisplay = document.getElementById('user-badge-display');
  if (badgeDisplay) badgeDisplay.innerHTML = `<span style="color:${u.color}; font-size:16px;">👤</span> מחובר כ: ${u.name}`;

  const perms = getPerms(u);
  const moduleToNav = { customers: 'nb-customers', faults: 'nb-faults', archive: 'nb-archive', notes: 'nb-notes', warranties: 'nb-warranties', debts: 'nb-debts', reports: 'nb-reports' };
  Object.entries(moduleToNav).forEach(([mod, nbId]) => {
    const el = document.getElementById(nbId);
    if (el) el.style.display = (perms[mod] || 0) >= 1 ? '' : 'none';
  });

  const canSeeLog = ['רז', 'אופיר'].includes(u.name) || ['owner', 'admin'].includes(u.role);
  ['nb-log', 'm-drawer-log'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = canSeeLog ? '' : 'none';
  });

  window._registerPushToken = () => registerPushToken(u.name);
  setTimeout(window._registerPushToken, 3000);

  setTimeout(() => { try { addLog('other', 'כניסה למערכת', u.name); } catch (e) {} }, 3000);
}

async function registerPushToken(userName) {
    try {
        const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApp();
        const messaging = getMessaging(app);
        const registration = await navigator.serviceWorker.ready;
        
        // ניקוי טוקן קודם למניעת שגיאות
        try { await deleteToken(messaging); } catch(e) {}

        const token = await getToken(messaging, { 
            serviceWorkerRegistration: registration, 
            vapidKey: VAPID_KEY 
        });

        if (token) {
            console.log("Token generated:", token);
            const u = USERS.find(x => x.name === userName);
            if (u) {
                u.tokens = u.tokens || [];
                if (!u.tokens.includes(token)) {
                    u.tokens.push(token);
                    if (window._dbSaveCfg) window._dbSaveCfg({ ...window.cfg, users: USERS });
                }
            }
            return true;
        }
    } catch (err) { 
        console.error("Push Reg Failed:", err); 
    }
    return false;
}