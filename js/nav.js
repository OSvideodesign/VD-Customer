// ══ nav.js — navigation, modals, drawer ══
import { canDo } from './auth.js';
import { toast }  from './utils.js';

export function initNav() {
  const logoImg = document.querySelector('.sidebar-logo-img');
  if (logoImg) {
    logoImg.src = 'assets/Main Header 2.png';
    logoImg.onerror = () => { logoImg.style.display = 'none'; };
  }
}

export function nav(page) {
  const restricted = ['customers','faults','archive','notes','warranties','debts','reports'];
  if (restricted.includes(page) && !canDo(page, 1)) {
    toast('אין הרשאה לדף זה ❌', 'err');
    return;
  }
  
  document.querySelectorAll('.pg').forEach(e => e.classList.remove('on'));
  const pg = document.getElementById('pg-' + page);
  if (pg) pg.classList.add('on');

  // קריאה לפונקציות הרינדור של כל דף
  const R = {
    dashboard:  () => window.renderDash?.(),
    customers:  () => window.renderCusts?.(),
    faults:     () => window.renderFaults?.(),
    notes:      () => window.renderNotes?.(),
    archive:    () => window.renderArchive?.(),
    warranties: () => window.renderWarr?.(),
    debts:      () => window.renderDebts?.(),
    reports:    () => window.renderReports?.(),
    settings:   () => window.loadSettings?.(),
    log:        () => window.renderLog?.(),
  };
  if (R[page]) R[page]();
  if (window.innerWidth <= 1024) closeDrawer();
}

// פונקציות מודלים - מיוצאות כדי שקבצים אחרים יוכלו להשתמש בהן
export const openM = (id) => { 
  const m = document.getElementById(id);
  if (m) m.classList.add('open');
};

export const closeM = (id) => {
  const m = document.getElementById(id);
  if (m) m.classList.remove('open');
};

export function openDrawer() { 
    const d = document.getElementById('m-drawer');
    if (d) d.classList.add('open'); 
}
export function closeDrawer() { 
    const d = document.getElementById('m-drawer');
    if (d) d.classList.remove('open'); 
}

// חשיפה ל-window עבור onclick ב-HTML
window.nav = nav;
window.openM = openM;
window.closeM = closeM;
window.openDrawer = openDrawer;
window.closeDrawer = closeDrawer;