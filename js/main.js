// ══ main.js — entry point ══
import { initLogin, selectUser, doLogin, backToUsers, logout } from './auth.js';
import { initNav, nav, openM, closeM, openDrawer, closeDrawer } from './nav.js';

// Init on load
document.addEventListener('DOMContentLoaded', () => {
    initLogin();
    // Re-check session
    const savedUser = localStorage.getItem('cv_user');
    if (savedUser) {
        import('./auth.js').then(m => m.applyUser(savedUser));
    }
});

// Expose globals for HTML
window.initNav = initNav;
window.logout = logout;
window.backToUsers = backToUsers;