// ══ main.js — entry point, wires all modules, exposes globals for HTML onclick handlers ══

import { USERS }       from './config.js';
import { toast, openWA, openNav } from './utils.js';
import { initLogin, selectUser, doLogin, backToUsers, logout, applyUser } from './auth.js';
import { nav, jumpTo, openM, closeM, openDrawer, closeDrawer, navD, openGlobalSearch, runGlobalSearch } from './nav.js';
import { renderDash } from './dashboard.js';
import { renderCusts, openNewCust, editCustById, saveCust, viewCust, delCust, addContactRow, addAddressRow } from './customers.js';
import { renderWarr }  from './warranties.js';
import { renderDebts, markPaid, markFaultPaid } from './debts.js';
import { renderFaults, openNewFault, editFaultById, saveFault, delFault, toggleSelectMode, toggleSelect, deleteSelected, toggleGuestFields, requestNotificationPermission } from './faults.js';
import { renderNotes, openNewNote, editNoteById, saveNote, delNote, toggleNoteSelectMode, toggleNoteSelect, deleteSelectedNotes } from './notes.js';
import { renderArchive, restoreFault } from './archive.js';
import { renderReports, exportBackup, exportCustomersExcel } from './reports.js';
import { loadSettings, saveSettings, openAddUser, openEditUser, saveUser, deleteUser } from './settings.js';
import { renderLog, addLog, clearLog } from './log.js';
import { gcalInit, gcalSignIn, gcalSignOut, fetchWk, wkPrev, wkNext, wkToday, gcalFault } from './gcal.js';
import { loadAll } from './db.js';

// ── Global state initialisation ────────────────────────────────────────────
window.custs       = [];
window.faults      = [];
window.notes       = [];
window.waMessages  = [];
window.logEntries  = [];
window.cfg         = {};
window._deletingIds = new Set();
window._gsResults  = [];

// ── Restore cfg from localStorage ─────────────────────────────────────────
(function () {
  try {
    const b = localStorage.getItem('crm_cfg');
    if (b) Object.assign(window.cfg, JSON.parse(b));
  } catch (e) {}
})();

// ── Expose functions for inline HTML onclick handlers ─────────────────────
// auth
window.doLogin          = doLogin;
window.backToUsers      = backToUsers;
window.logout           = logout;
window._selectUser      = selectUser;

// nav / modals
window.nav              = nav;
window._nav             = nav;
window.openM            = openM;
window.closeM           = closeM;
window.openDrawer       = openDrawer;
window.closeDrawer      = closeDrawer;
window.navD             = navD;
window.openGlobalSearch = openGlobalSearch;
window.runGlobalSearch  = runGlobalSearch;

// dashboard
window.renderDash       = renderDash;
window._jumpTo          = jumpTo;
window.jumpTo           = jumpTo;
window._editNoteById    = editNoteById;

// customers
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

// faults
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

// notes
window.openNewNote          = openNewNote;
window.saveNote             = saveNote;
window.delNote              = delNote;
window.editNoteById         = editNoteById;
window.toggleNoteSelectMode = toggleNoteSelectMode;
window._toggleNoteSelect    = toggleNoteSelect;
window.deleteSelectedNotes  = deleteSelectedNotes;
window.renderNotes          = renderNotes;

// archive
window.renderArchive    = renderArchive;
window._restoreFault    = restoreFault;

// debts
window._markPaid        = markPaid;
window._markFaultPaid   = markFaultPaid;

// reports
window.renderReports    = renderReports;
window.exportBackup     = exportBackup;
window.exportCustomersExcel = exportCustomersExcel;

// warranties / debts (renderers nav.js calls via window.*)
window.renderWarr       = renderWarr;
window.renderDebts      = renderDebts;

// settings
window.loadSettings     = loadSettings;
window.saveSettings     = saveSettings;
window.openAddUser      = openAddUser;
window._openEditUser    = openEditUser;
window.saveUser         = saveUser;
window.deleteUser       = deleteUser;

// log
window.addLog           = addLog;
window.clearLog         = clearLog;
window.renderLog        = renderLog;

// gcal
window.gcalInit         = gcalInit;
window.gcalSignIn       = gcalSignIn;
window.gcalSignOut      = gcalSignOut;
window.fetchWk          = fetchWk;
window.wkPrev           = wkPrev;
window.wkNext           = wkNext;
window.wkToday          = wkToday;
window._gcalFault       = gcalFault;

// ── Boot ───────────────────────────────────────────────────────────────────
initLogin();
loadAll();
