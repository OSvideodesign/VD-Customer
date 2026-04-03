// ══ auth.js — authentication & permission management ══

const DEFAULT_USERS = [
  { name: 'רז',    pass: '',     color: '#6366f1', role: 'owner',
    perms: { customers:3, faults:3, archive:3, notes:3, warranties:3, debts:3, reports:3 } },
  { name: 'אופיר', pass: '',     color: '#3b82f6', role: 'admin',
    perms: { customers:3, faults:3, archive:3, notes:3, warranties:3, debts:3, reports:3 } },
  { name: 'גלאל',  pass: '1234', color: '#10b981', role: 'installer',
    perms: { customers:2, faults:3, archive:2, notes:2, warranties:1, debts:1, reports:1 } },
  { name: 'מוטי',  pass: '1234', color: '#06b6d4', role: 'installer',
    perms: { customers:2, faults:3, archive:2, notes:2, warranties:1, debts:1, reports:1 } },
];

let _users       = [];
let _currentUser = null;
let _pendingUser = null;

// ── Load / save ────────────────────────────────────────────────────────────
export function loadUsers() {
  try {
    const saved = localStorage.getItem('cv_users');
    _users = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_USERS));
  } catch {
    _users = JSON.parse(JSON.stringify(DEFAULT_USERS));
  }
  _users.forEach(u => {
    u.perms = u.perms || {};
    ['customers','faults','archive','notes','warranties','debts','reports']
      .forEach(k => { if (u.perms[k] == null) u.perms[k] = 1; });
  });
}

export function saveUsersToStorage() {
  localStorage.setItem('cv_users', JSON.stringify(_users));
}

export function getUsers()       { return _users; }
export function getCurrentUser() { return _currentUser; }

// ── Permissions ────────────────────────────────────────────────────────────
// level: 1=view  2=edit  3=full (delete)
export function canDo(module, level = 1) {
  if (!_currentUser) return false;
  const u = _users.find(x => x.name === _currentUser);
  if (!u) return false;
  if (u.role === 'owner') return true;
  return (u.perms?.[module] ?? 0) >= level;
}

// ── getPerms — used by settings.js ────────────────────────────────────────
export function getPerms(user) {
  return user?.perms || {};
}

// ── Boot ───────────────────────────────────────────────────────────────────
// ── initLogin — show user buttons or restore session ───────────────────────
export function initLogin() {
  const ub = document.getElementById('user-btns');
  if (!ub) return;
  
  ub.innerHTML = '';
  // וודא שיש לך את המערך _users מעודכן (רז, אופיר, גלאל, מוטי)
  _users.forEach(u => {
    const btn = document.createElement('button');
    btn.className = 'user-btn';
    // יצירת מבנה ה-HTML של כל כפתור עם הקלאסים לעיצוב הכסוף
    btn.innerHTML = `
      <span class="ub-letter">${u.name.charAt(0)}</span>
      <span class="ub-name">${u.name}</span>
    `;
    btn.onclick = () => selectUser(u.name);
    ub.appendChild(btn);
  });
}

// ── selectUser — בחירת משתמש מהגריד ────────────────────────────────────────
window.selectUser = function(name) {
  _loginTarget = name;
  
  // מסמן את הכפתור שנבחר עם הגבול המוזהב
  document.querySelectorAll('.user-btn').forEach(b => {
    b.classList.remove('selected');
    if (b.querySelector('.ub-name').textContent === name) {
      b.classList.add('selected');
    }
  });

  const u = _users.find(x => x.name === name);
  
  // מציג את אזור הסיסמה ואת כפתור הכניסה
  const passArea = document.getElementById('pass-area');
  const enterBtn = document.getElementById('login-enter-btn');
  
  if (passArea) passArea.style.display = 'block';
  if (enterBtn) enterBtn.style.display = 'block';
  
  const passInput = document.getElementById('pass-inp');
  if (passInput) {
    passInput.value = '';
    passInput.focus();
  }
}

// ── Login-screen rendering ─────────────────────────────────────────────────
function _renderUserBtns() {
  const container = document.getElementById('user-btns');
  if (!container) return;
  container.innerHTML = '';
  container.style.cssText =
    'display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px';

  _users.forEach(u => {
    const btn = document.createElement('button');
    btn.className = 'login-user-btn';
    btn.style.cssText =
      'display:flex;flex-direction:column;align-items:center;gap:8px;' +
      'padding:16px 12px;border-radius:14px;border:2px solid transparent;' +
      'background:rgba(255,255,255,0.05);cursor:pointer;transition:all .2s;' +
      'color:#fff;font-family:inherit';
    btn.innerHTML = `
      <div style="width:52px;height:52px;border-radius:50%;background:${u.color};
                  display:flex;align-items:center;justify-content:center;
                  font-size:22px;font-weight:700;color:#fff">
        ${u.name.charAt(0)}
      </div>
      <span style="font-size:14px;font-weight:600">${u.name}</span>`;
    btn.onmouseover = () => {
      btn.style.borderColor = u.color;
      btn.style.background  = 'rgba(255,255,255,0.1)';
    };
    btn.onmouseout = () => {
      btn.style.borderColor = 'transparent';
      btn.style.background  = 'rgba(255,255,255,0.05)';
    };
    btn.onclick = () => selectUser(u.name);
    container.appendChild(btn);
  });

  _hidePassArea();
}

export function selectUser(name) {
  _pendingUser = name;
  const u = _users.find(x => x.name === name);
  if (!u) return;

  document.querySelectorAll('.login-user-btn').forEach((b, i) => {
    const sel = _users[i]?.name === name;
    b.style.borderColor = sel ? u.color : 'transparent';
    b.style.background  = sel ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)';
  });

  if (!u.pass) { _doLogin(name); return; }

  const label = document.getElementById('pass-label');
  if (label) label.textContent = `סיסמה עבור ${name}`;
  const inp = document.getElementById('pass-inp');
  if (inp)  inp.value = '';
  const err = document.getElementById('pass-err');
  if (err)  err.style.display = 'none';
  const area = document.getElementById('pass-area');
  if (area) area.style.display = 'block';
  if (inp)  setTimeout(() => inp.focus(), 50);
}

function _hidePassArea() {
  const area = document.getElementById('pass-area');
  if (area) area.style.display = 'none';
  const err  = document.getElementById('pass-err');
  if (err)  err.style.display  = 'none';
}

export function doLogin() {
  if (!_pendingUser) return;
  const u       = _users.find(x => x.name === _pendingUser);
  if (!u) return;
  const inp     = document.getElementById('pass-inp');
  const entered = (inp?.value || '').trim();
  if (entered === u.pass) {
    _doLogin(_pendingUser);
  } else {
    const err = document.getElementById('pass-err');
    if (err) err.style.display = 'block';
    if (inp) { inp.value = ''; inp.focus(); }
  }
}

export function backToUsers() {
  _pendingUser = null;
  _renderUserBtns();
}

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const area = document.getElementById('pass-area');
  if (area && area.style.display !== 'none') doLogin();
});

// ── Core login / show-app ──────────────────────────────────────────────────
function _doLogin(name) {
  _currentUser        = name;
  window._currentUser = name;
  localStorage.setItem('cv_user', name);
  _showApp();
}

function _showApp() {
  const ls = document.getElementById('login-screen');
  if (ls) ls.style.display = 'none';

  document.querySelector('.sidebar')?.style.removeProperty('display');
  document.querySelector('.main')?.style.removeProperty('display');
  document.getElementById('mnav')?.style.removeProperty('display');

  _updateBadge();

  const isAdmin = ['רז', 'אופיר'].includes(_currentUser);
  const logBtn    = document.getElementById('nb-log');
  const drawerLog = document.getElementById('m-drawer-log');
  if (logBtn)    logBtn.style.display    = isAdmin ? '' : 'none';
  if (drawerLog) drawerLog.style.display = isAdmin ? '' : 'none';

  const u  = _users.find(x => x.name === _currentUser);
  window._currentRole = u?.role || '';
  const up = document.getElementById('s-users-panel');
  if (up) up.style.display = (u?.role === 'owner') ? '' : 'none';

  window.dispatchEvent(new Event('app-ready'));
}

function _updateBadge() {
  const badge = document.getElementById('user-badge');
  if (!badge || !_currentUser) return;
  const u     = _users.find(x => x.name === _currentUser);
  const color = u?.color || '#6366f1';
  badge.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;
                background:rgba(255,255,255,0.06);border-radius:10px;margin:0 12px 8px">
      <div style="width:32px;height:32px;border-radius:50%;background:${color};
                  display:flex;align-items:center;justify-content:center;
                  font-size:14px;font-weight:700;color:#fff;flex-shrink:0">
        ${_currentUser.charAt(0)}
      </div>
      <div style="min-width:0">
        <div style="font-size:13px;font-weight:600;color:#fff;
                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          ${_currentUser}
        </div>
        <div style="font-size:10px;color:rgba(255,255,255,0.45)">${u?.role || ''}</div>
      </div>
    </div>`;
}

// ── Logout ─────────────────────────────────────────────────────────────────
export function logout() {
  localStorage.removeItem('cv_user');
  location.reload();
}

// ── User-management (called from settings.js) ──────────────────────────────
export function openAddUser()      { window.openAddUser?.(); }
export function openEditUser(name) { window._openEditUser?.(name); }