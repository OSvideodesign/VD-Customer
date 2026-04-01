// Service Worker — וידאו דיזיין PWA + Push Notifications
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(clients.claim()); });

// Push notification received (foreground handled by app)
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

// Click on notification → open app
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

// Firebase background messaging
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
