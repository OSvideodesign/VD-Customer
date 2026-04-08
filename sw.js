// ══ sw.js — Service Worker for Smart Offline Mode + Push Notifications ══

const CACHE_NAME = 'vd-crm-offline-v1';

// רשימת הקבצים שאנחנו שומרים קבוע על המכשיר (כדי שיעלו גם ללא אינטרנט)
const FILES_TO_CACHE = [
  './',
  './index.html',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/pages.css',
  './js/main.js',
  './js/config.js',
  './js/utils.js',
  './js/db.js',
  './js/auth.js',
  './js/nav.js',
  './js/dashboard.js',
  './js/customers.js',
  './js/faults.js',
  './js/notes.js',
  './js/warranties.js',
  './js/debts.js',
  './js/archive.js',
  './js/log.js',
  './js/reports.js',
  './js/settings.js',
  './js/gcal.js',
  './app-icon-192.jpg',
  './app-icon-512.jpg',
  './logo.jpg',
  './login-header.jpg',
  './manifest.json'
];

// שלב 1: התקנה - הורדת כל הקבצים לזיכרון של הטלפון
self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching offline files');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// שלב 2: הפעלה - מחיקת זיכרון ישן אם שחררנו עדכון
self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[ServiceWorker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

// שלב 3: משיכת נתונים (חכם) - מגיש מהזיכרון מיד, ומעדכן מהאינטרנט ברקע
self.addEventListener('fetch', (evt) => {
  // מתערבים רק בבקשות לקבצים שלנו (לא פיירבייס או גוגל)
  if (!evt.request.url.startsWith(self.location.origin)) return;

  evt.respondWith(
    caches.match(evt.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(evt.request).then((networkResponse) => {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(evt.request, networkResponse.clone());
          });
        }).catch(() => {}); 
        return cachedResponse;
      }
      return fetch(evt.request);
    })
  );
});

// ──────────────────────────────────────────────────────────────────────────
// ══ Firebase Push Notifications (הקוד המקורי שלך שהושאר בשלמותו) ══

self.addEventListener('push', e => {
  if(!e.data) return;
  let data;
  try{ data=e.data.json(); }catch(err){ data={title:'וידאו דיזיין',body:e.data.text()}; }
  e.waitUntil(
    self.registration.showNotification(data.title||'וידאו דיזיין',{
      body: data.body||'',
      icon: '/Client-PRO/icon.png',
      badge: '/Client-PRO/icon.png',
      vibrate: [200,100,200],
      data: {url: data.url||'/Client-PRO/'},
      dir: 'rtl', lang: 'he',
      tag: data.tag||'vd-notif',
      renotify: true
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url||'/Client-PRO/';
  e.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
      for(const c of list){
        if(c.url.includes('Client-PRO')&&'focus' in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});

importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:"AIzaSyBDclbzeGdzxzS1rklQRDYp3cnndVOVTuA",
  authDomain:"vd-clientpro.firebaseapp.com",
  projectId:"vd-clientpro",
  storageBucket:"vd-clientpro.firebasestorage.app",
  messagingSenderId:"35797095244",
  appId:"1:35797095244:web:d1d0d572fb26571cf6b5e9"
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage(payload=>{
  const n = payload.notification||{};
  return self.registration.showNotification(n.title||'וידאו דיזיין',{
    body: n.body||'',
    icon: '/Client-PRO/icon.png',
    dir: 'rtl', lang: 'he', tag: 'vd-notif', renotify: true
  });
});