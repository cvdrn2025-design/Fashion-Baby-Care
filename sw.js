// sw.js — BabyCare Shop
const VERSION = 'v2';
const STATIC_CACHE = `babycare-static-${VERSION}`;
const RUNTIME_CACHE = `babycare-runtime-${VERSION}`;

const PRECACHE = [
  './',
  './index.html',
  './admin.html',
  './firebase-config.js',
  './manifest.json',
  './offline.html',
  './icon-192.png',
  './icon-512.png',
  './qris.png'
];

// Permintaan ke API Firebase (Firestore/Auth) tidak boleh dicache/dicegat.
const isFirebaseApi = (url) =>
  /(^|\.)googleapis\.com$/.test(url.hostname) || url.hostname.endsWith('firebaseio.com');
const isFirebaseSdk = (url) =>
  url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/');

async function precache() {
  const cache = await caches.open(STATIC_CACHE);
  // allSettled: satu file yang belum ada tidak menggagalkan instalasi.
  await Promise.allSettled(PRECACHE.map(url => cache.add(url)));
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  clients.forEach(c => c.postMessage(message));
}

// ===== INSTALL / ACTIVATE =====
self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = [STATIC_CACHE, RUNTIME_CACHE];
    const names = await caches.keys();
    await Promise.all(names.filter(n => !keep.includes(n)).map(n => caches.delete(n)));
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// ===== FETCH =====
async function networkFirstPage(event) {
  try {
    const preload = await event.preloadResponse;
    const response = preload || await fetch(event.request);
    const cache = await caches.open(STATIC_CACHE);
    cache.put(event.request, response.clone());
    return response;
  } catch (err) {
    const cached = await caches.match(event.request, { ignoreSearch: true });
    return cached
      || await caches.match('./index.html')
      || await caches.match('./offline.html');
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request).then(response => {
    if (response && (response.ok || response.type === 'opaque')) cache.put(request, response.clone());
    return response;
  }).catch(() => cached);
  return cached || network;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (isFirebaseApi(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(event));
    return;
  }
  if (url.origin === self.location.origin || isFirebaseSdk(url)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

// ===== PUSH NOTIFICATION =====
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'BabyCare Shop';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || 'Ada pembaruan untuk Anda',
    icon: './icon-192.png',
    badge: './icon-192.png',
    data: { url: data.url || './index.html' }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || './index.html';
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) {
      if ('focus' in c) { await c.focus(); if ('navigate' in c) c.navigate(target); return; }
    }
    await self.clients.openWindow(target);
  })());
});

// ===== BACKGROUND SYNC =====
// Halaman dapat mendaftarkan tag 'sync-data' saat offline; saat online kembali, halaman diberi tahu untuk mencoba ulang.
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') event.waitUntil(notifyClients({ type: 'SYNC', tag: event.tag }));
});

// ===== PERIODIC BACKGROUND SYNC =====
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'refresh-content') event.waitUntil(precache());
});

