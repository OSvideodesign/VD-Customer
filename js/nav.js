// ══ nav.js — Navigation & Modals ══
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
  document.querySelectorAll('.nav-btn,.mnb').forEach(e => e.classList.remove('on'));

  const pg = document.getElementById('pg-' + page);
  if (!pg) return;
  pg.classList.add('on');

  const nb = document.getElementById('nb-' + page);
  if (nb) nb.classList.add('on');
  
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
  window.scrollTo(0,0);
}

// תיקון: ייצוא פונקציות המודלים עבור שאר המערכת
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

window.nav = nav;
window.openM = openM;
window.closeM = closeM;
window.openDrawer = openDrawer;
window.closeDrawer = closeDrawer;