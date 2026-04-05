// Service Worker — וידאו דיזיין PWA + Push Notifications
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(clients.claim()); });

// קבלת הודעת Push
self.addEventListener('push', e => {
  if(!e.data) return;
  let data;
  try { 
      data = e.data.json(); 
  } catch(err) { 
      data = { title: 'וידאו דיזיין', body: e.data.text() }; 
  }
  
  const n = data.notification || data;

  e.waitUntil(
    self.registration.showNotification(n.title || 'וידאו דיזיין', {
      body: n.body || '',
      icon: './app-icon-192.jpg',
      badge: './app-icon-192.jpg',
      vibrate: [200, 100, 200],
      data: { url: n.click_action || n.url || './' },
      dir: 'rtl', lang: 'he',
      tag: 'vd-notif',
      renotify: true
    })
  );
});

// לחיצה על התראה
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || './';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(location.origin) && 'focus' in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});

// תאימות ל-Firebase background messaging
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBDclbzeGdzxzS1rklQRDYp3cnndVOVTuA",
  authDomain: "vd-clientpro.firebaseapp.com",
  projectId: "vd-clientpro",
  storageBucket: "vd-clientpro.firebasestorage.app",
  messagingSenderId: "35797095244",
  appId: "1:35797095244:web:d1d0d572fb26571cf6b5e9"
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage(payload => {
  const n = payload.notification || {};
  return self.registration.showNotification(n.title || 'וידאו דיזיין', {
    body: n.body || '',
    icon: './app-icon-192.jpg',
    dir: 'rtl', tag: 'vd-notif', renotify: true
  });
});