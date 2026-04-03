// ══ main.js — entry point ══
import { initLogin, selectUser, doLogin, backToUsers, logout, applyUser } from './auth.js';
import { initNav, nav, openM, closeM, openDrawer, closeDrawer } from './nav.js';

document.addEventListener('DOMContentLoaded', () => {
    initLogin();
    const savedUser = localStorage.getItem('cv_user');
    if (savedUser) {
        applyUser(savedUser);
    }
});

// חשיפה ל-window עבור onclick ב-HTML
window.initNav = initNav;
window.logout = logout;
window.backToUsers = backToUsers;
window.selectUser = selectUser;
window.doLogin = doLogin;