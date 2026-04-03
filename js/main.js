// ══ main.js — entry point ══
import { initLogin, selectUser, doLogin, backToUsers, logout, applyUser, getPerms } from './auth.js';
import { initNav, nav, openM, closeM, openDrawer, closeDrawer } from './nav.js';

document.addEventListener('DOMContentLoaded', () => {
    initLogin();
    const savedUser = localStorage.getItem('cv_user');
    if (savedUser) applyUser(savedUser);
});

// חשיפה ל-window כדי שה-onclick ב-HTML יעבוד
window.initNav = initNav;
window.logout = logout;
window.backToUsers = backToUsers;
window.selectUser = selectUser;
window.doLogin = doLogin;
window.getPerms = getPerms;
window.nav = nav;
window.openM = openM;
window.closeM = closeM;
window.openDrawer = openDrawer;
window.closeDrawer = closeDrawer;