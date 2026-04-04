// ══ main.js — entry point, wires all modules, exposes globals for HTML onclick handlers ══

import { USERS }       from './config.js';
import { toast, openWA, openNav } from './utils.js';
import { initLogin, selectUser, doLogin, backToUsers, logout, applyUser } from './auth.js';
import { nav, jumpTo, openM, closeM, openDrawer, closeDrawer, navD, openGlobalSearch, runGlobalSearch } from './nav.js';
import { renderDash } from './dashboard.js';
import { renderCusts, openNewCust, editCustById, saveCust, viewCust, delCust, addContactRow, addAddressRow } from './customers.js';
import { renderWarr }  from './warranties.js';
import { renderDebts, markPaid, markFaultPaid } from './debts.js';
import { renderFaults, openNewFault, editFaultById, saveFault, delFault, toggleSelectMode, toggleSelect, deleteSelected, toggleGuestFields, requestNotificationPermission, updateFaultVatNote } from './faults.js';
import { renderNotes, openNewNote, editNoteById, saveNote, delNote, toggleNoteSelectMode, toggleNoteSelect, deleteSelectedNotes } from './notes.js';
import { renderArchive, restoreFault } from './archive.js';
import { renderReports, exportBackup, exportCustomersExcel } from './reports.js';
import { loadSettings, saveSettings, openAddUser, openEditUser, saveUser, deleteUser } from './settings.js';
import { renderLog, addLog, clearLog } from './log.js';
import { gcalInit, gcalSignIn, gcalSignOut, fetchWk, wkPrev, wkNext, wkToday, gcalFault } from './gcal.js';
import { loadAll } from './db.js';

window.custs       = [];
window.faults      = [];
window.notes       = [];
window.waMessages  = [];
window.logEntries  = [];
window.cfg         = {};
window._deletingIds = new Set();
window._gsResults  = [];

(function () {
  try {
    const b = localStorage.getItem('crm_cfg');
    if (b) Object.assign(window.cfg, JSON.parse(b));
  } catch (e) {}
})();

// Expose globals for HTML onclick handlers
window.doLogin          = doLogin;
window.backToUsers      = backToUsers;
window.logout           = logout;
window._selectUser      = selectUser;
window.nav              = nav;
window._nav             = nav;
window.openM            = openM;
window.closeM            = closeM;
window.openDrawer       = openDrawer;
window.closeDrawer      = closeDrawer;
window.navD             = navD;
window.openGlobalSearch = openGlobalSearch;
window.runGlobalSearch  = runGlobalSearch;
window.renderDash       = renderDash;
window._jumpTo          = jumpTo;
window.jumpTo           = jumpTo;
window._editNoteById    = editNoteById;
window.openNewCust      = openNewCust;
window.saveCust         = saveCust;
window.delCust          = delCust;
window.addContactRow    = addContactRow;
window.addAddressRow    = addAddressRow;
window.renderCusts      = renderCusts;
window._viewCust        = viewCust;
window.viewCust         = viewCust;
window._editCustById    = editCustById;
window.editCustById     = editCustById;
window._openWA          = openWA;
window.openWA           = openWA;
window._openNav         = openNav;
window.openNav          = openNav;
window.openNewFault     = openNewFault;
window._openNewFault    = openNewFault;
window.saveFault        = saveFault;
window.delFault         = delFault;
window.toggleGuestFields = toggleGuestFields;
window.renderFaults     = renderFaults;
window._editFaultById   = editFaultById;
window.editFaultById    = editFaultById;
window.toggleSelectMode = toggleSelectMode;
window._toggleSelect    = toggleSelect;
window.deleteSelected   = deleteSelected;
window.requestNotificationPermission = requestNotificationPermission;
window._updateFaultVatNote = updateFaultVatNote;
window.openNewNote          = openNewNote;
window.saveNote             = saveNote;
window.delNote              = delNote;
window.editNoteById         = editNoteById;
window.toggleNoteSelectMode = toggleNoteSelectMode;
window._toggleNoteSelect    = toggleNoteSelect;
window.deleteSelectedNotes  = deleteSelectedNotes;
window.renderNotes          = renderNotes;
window.renderArchive    = renderArchive;
window._restoreFault    = restoreFault;
window._markPaid        = markPaid;
window._markFaultPaid   = markFaultPaid;
window.renderReports    = renderReports;
window.exportBackup     = exportBackup;
window.exportCustomersExcel = exportCustomersExcel;
window.renderWarr       = renderWarr;
window.renderDebts      = renderDebts;
window.loadSettings     = loadSettings;
window.saveSettings     = saveSettings;
window.openAddUser      = openAddUser;
window._openEditUser    = openEditUser;
window.saveUser         = saveUser;
window.deleteUser       = deleteUser;
window.addLog           = addLog;
window.clearLog         = clearLog;
window.renderLog        = renderLog;
window.gcalInit         = gcalInit;
window.gcalSignIn       = gcalSignIn;
window.gcalSignOut      = gcalSignOut;
window.fetchWk          = fetchWk;
window.wkPrev           = wkPrev;
window.wkNext           = wkNext;
window.wkToday          = wkToday;
window._gcalFault       = gcalFault;

initLogin();
loadAll();

// TASKS BOARD & PUSH LOGIC
let isBoardMode = localStorage.getItem('vd_tasks_mode') === 'board';
window.toggleBoardMode = function() {
    isBoardMode = !isBoardMode;
    localStorage.setItem('vd_tasks_mode', isBoardMode ? 'board' : 'list');
    updateTasksUI();
};
function updateTasksUI() {
    const listV = document.getElementById('tasks-list-view');
    const boardV = document.getElementById('tasks-board-view');
    const toggleTxt = document.getElementById('board-toggle-txt');
    if (!listV || !boardV) return;
    if (isBoardMode) {
        listV.style.display = 'none'; boardV.style.display = 'grid';
        toggleTxt.textContent = '📋 תצוגת רשימה'; renderBoard();
    } else {
        listV.style.display = 'block'; boardV.style.display = 'none';
        toggleTxt.textContent = '🔲 תצוגת כרטיסיות'; renderFaults();
    }
}
function renderBoard() {
    const cols = { open: document.getElementById('board-open'), scheduled: document.getElementById('board-scheduled'), done: document.getElementById('board-done') };
    if (!cols.open) return;
    Object.values(cols).forEach(el => el.innerHTML = '');
    window.faults.filter(f => !f.archived).forEach(f => {
        const card = document.createElement('div');
        card.className = 'board-card'; card.dataset.id = f.id;
        const custName = window.custs.find(c => c.id === f.customerId)?.name || f.guestName || 'לקוח';
        card.innerHTML = `<strong>${custName}</strong><p style="font-size:12px; margin:4px 0">${f.description.substring(0,40)}...</p>`;
        card.onclick = () => window.editFaultById(f.id);
        if (cols[f.status]) cols[f.status].appendChild(card);
    });
    initSortable();
}
function initSortable() {
    document.querySelectorAll('.board-col-list').forEach(el => {
        new Sortable(el, { group: 'tasks', animation: 150, onEnd: (evt) => {
            const id = evt.item.dataset.id; const status = evt.to.parentElement.dataset.status;
            const task = window.faults.find(f => f.id === id);
            if (task && task.status !== status) {
                task.status = status; if(window.saveFault) window.saveFault(task);
                sendPush(`משימה של ${task.guestName || 'לקוח'} עודכנה ל-${status}`);
            }
        }});
    });
}
function sendPush(msg) {
    if (Notification.permission === "granted") {
        new Notification("CRM עדכון", { body: msg, icon: "app-icon-192.jpg" });
    }
}
if (/iPhone|iPad|iPod/.test(navigator.userAgent) && !window.navigator.standalone) {
    setTimeout(() => toast('📱 לקבלת התראות: לחץ על "שתף" ואז "הוסף למסך הבית"', 'info'), 4000);
}
setTimeout(updateTasksUI, 500);