// ══ auth.js — הליבה של ניהול המשתמשים ══

const DEFAULT_USERS = [
  { name: 'רז',    pass: 'Raz4123',   color: '#f1f5f9', role: 'owner', perms: { customers:3, faults:3, archive:3, notes:3, warranties:3, debts:3, reports:3 } },
  { name: 'אופיר', pass: '',          color: '#3b82f6', role: 'admin', perms: { customers:3, faults:3, archive:3, notes:3, warranties:3, debts:3, reports:3 } },
  { name: 'גלאל',  pass: 'Jalal4123', color: '#10b981', role: 'installer', perms: { customers:2, faults:3, archive:2, notes:2, warranties:1, debts:1, reports:1 } },
  { name: 'מוטי',  pass: 'Moti4123',  color: '#06b6d4', role: 'installer', perms: { customers:2, faults:3, archive:2, notes:2, warranties:1, debts:1, reports:1 } },
];

let _users = [];
let _loginTarget = null;

export function loadUsers() {
    const saved = localStorage.getItem('cv_users');
    _users = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_USERS));
    return _users;
}

export function getPerms(name) {
    if (_users.length === 0) loadUsers();
    const u = _users.find(x => x.name === name);
    return u ? (u.perms || {}) : {};
}

export function initLogin() {
    const ub = document.getElementById('user-btns');
    if (!ub) return;
    loadUsers();
    ub.innerHTML = '';
    _users.forEach(u => {
        const btn = document.createElement('button');
        btn.className = 'user-btn-silver';
        btn.innerHTML = `
            <div class="ub-glass"></div>
            <span class="ub-letter" style="color: ${u.color}; text-shadow: 0 0 10px ${u.color}66;">${u.name.charAt(0)}</span>
            <span class="ub-name" style="color: ${u.color};">${u.name}</span>
        `;
        btn.onclick = () => window.selectUser(u.name);
        ub.appendChild(btn);
    });
}

export function selectUser(name) {
    _loginTarget = name;
    document.querySelectorAll('.user-btn-silver').forEach(b => {
        b.classList.remove('selected');
        if (b.querySelector('.ub-name').textContent === name) b.classList.add('selected');
    });
    document.getElementById('pass-area').style.display = 'block';
    document.getElementById('login-enter-btn').style.display = 'block';
    const inp = document.getElementById('pass-inp');
    if (inp) { inp.value = ''; inp.focus(); }
}

export function backToUsers() {
    _loginTarget = null;
    document.getElementById('pass-area').style.display = 'none';
    document.getElementById('login-enter-btn').style.display = 'none';
    document.querySelectorAll('.user-btn-silver').forEach(b => b.classList.remove('selected'));
}

export async function doLogin() {
    const p = document.getElementById('pass-inp').value;
    const u = _users.find(x => x.name === _loginTarget);
    if (!u) return;
    if (u.pass && p !== u.pass) {
        document.getElementById('pass-err').style.display = 'block';
        return;
    }
    applyUser(u.name);
}

export function applyUser(name) {
    localStorage.setItem('cv_user', name);
    window._currentUser = name;
    if (_users.length === 0) loadUsers();
    const u = _users.find(x => x.name === name);
    window._currentRole = u?.role || 'user';
    
    const loginScr = document.getElementById('login-screen');
    if (loginScr) loginScr.style.display = 'none';
    const shell = document.getElementById('app-shell');
    if (shell) shell.style.display = 'block';
    
    if (window.initNav) window.initNav();
    window.dispatchEvent(new Event('app-ready'));
}

export function canDo(mod, lvl) {
    const user = localStorage.getItem('cv_user');
    if (!user) return false;
    if (_users.length === 0) loadUsers();
    const u = _users.find(x => x.name === user);
    if (!u) return false;
    if (u.role === 'owner') return true;
    return (u.perms?.[mod] || 0) >= lvl;
}

export function logout() {
    localStorage.removeItem('cv_user');
    location.reload();
}