// ══ main.js — Global Bridge ══
import { initLogin, selectUser, doLogin, backToUsers, logout, applyUser } from './auth.js';
import { initNav, nav, openM, closeM, openDrawer, closeDrawer } from './nav.js';

document.addEventListener('DOMContentLoaded', () => {
    initLogin();
    const savedUser = localStorage.getItem('cv_user');
    if (savedUser) {
        applyUser(savedUser);
    }
});

// הגדרת פונקציות גלובליות כדי שה-HTML הישן והחדש יעבדו יחד
window.initNav = initNav;
window.logout = logout;
window.backToUsers = backToUsers;
window.selectUser = selectUser;
window.doLogin = doLogin;
window.nav = nav;
window.openM = openM;
window.closeM = closeM;
window.openDrawer = openDrawer;
window.closeDrawer = closeDrawer;