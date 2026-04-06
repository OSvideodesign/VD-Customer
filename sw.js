// Service Worker — וידאו דיזיין PWA + Push Notifications
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

// טיפול בהתראות כשהאפליקציה סגורה
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message ', payload);
  const notificationTitle = payload.notification.title || 'וידאו דיזיין';
  const notificationOptions = {
    body: payload.notification.body || '',
    icon: 'app-icon-192.jpg',
    badge: 'app-icon-192.jpg',
    dir: 'rtl',
    lang: 'he',
    tag: 'vd-push',
    renotify: true
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(clients.claim()); });

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({type:'window', includeUncontrolled:true}).then(list => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow('/');
    })
  );
});