// ══ utils.js — pure helper / utility functions ══

import { USERS } from './config.js';

export function uid() { return Math.random().toString(36).slice(2, 12); }

export function today() { return new Date().toISOString().split('T')[0]; }

export function fmtD(d) {
  if (!d) return '—';
  const p = d.split('-');
  return p[2] + '/' + p[1] + '/' + p[0];
}

export function toast(msg, type) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.style.background = type === 'err' ? '#7f1d1d' : type === 'warn' ? '#78350f' : '#1e293b';
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

export function avClr(n) {
  const c = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#fb923c', '#ec4899'];
  let h = 0;
  for (const x of (n || '?')) h = (h * 31 + x.charCodeAt(0)) % c.length;
  return c[h];
}

export function ini(n) {
  if (!n) return '?';
  const p = n.trim().split(' ');
  return p.length >= 2 ? p[0][0] + p[1][0] : n.slice(0, 2);
}

export function wExp(c) {
  if (!c.installDate || !c.warrantyYears) return null;
  const d = new Date(c.installDate);
  d.setFullYear(d.getFullYear() + parseInt(c.warrantyYears || 0));
  return d.toISOString().split('T')[0];
}

export function dLeft(s) { return Math.round((new Date(s) - new Date()) / 86400000); }

export function wStat(c) {
  const e = wExp(c);
  if (!e) return null;
  const d = dLeft(e);
  return { d, exp: e, cls: d < 0 ? 'br' : d < 90 ? 'by' : 'bg', lbl: d < 0 ? 'פגה' : 'בתוקף' };
}

export function userColor(name) {
  const u = USERS.find(x => x.name === name);
  return u ? u.color : 'var(--tx3)';
}

export function openWA(phone) {
  const clean = phone.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '').replace(/^0/, '972');
  const link = document.createElement('a');
  link.href = 'https://wa.me/' + clean;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => link.remove(), 300);
}

export function openNav(encodedAddr) {
  const addr = decodeURIComponent(encodedAddr);
  const link = document.createElement('a');
  link.href = 'https://waze.com/ul?q=' + encodeURIComponent(addr) + '&navigate=yes';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => link.remove(), 300);
}

export function loader(msg) {
  let el = document.getElementById('_ldr');
  if (!el) {
    el = document.createElement('div');
    el.id = '_ldr';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(10,14,26,.96);z-index:9998;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px';
    const sp = document.createElement('div');
    sp.style.cssText = 'width:38px;height:38px;border:3px solid #1e293b;border-top-color:#3b82f6;border-radius:50%;animation:spin .7s linear infinite';
    const tx = document.createElement('div');
    tx.id = '_ldr_t';
    tx.style.cssText = 'font-size:13px;color:#94a3b8;font-family:Heebo,sans-serif';
    el.append(sp, tx);
    document.body.appendChild(el);
  }
  document.getElementById('_ldr_t').textContent = msg || '';
}

export function hideLoader() {
  const el = document.getElementById('_ldr');
  if (el) el.remove();
}
