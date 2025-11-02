/* FitAI Service Worker (Sprint 3) */
const CACHE = 'fitai-s3-v1';
const ASSETS = [
  '/', '/index.html', '/manifest.json',
  '/assets/icons/fitai-icon-192.png','/assets/icons/fitai-icon-256.png','/assets/icons/fitai-icon-384.png','/assets/icons/fitai-icon-512.png','/assets/icons/fitai-icon-maskable.png'
];

self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate', (e)=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k===CACHE?null:caches.delete(k)))).then(()=>self.clients.claim()));
});

self.addEventListener('fetch', (event)=>{
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')){
    return event.respondWith(fetch(event.request)); // no cache para IA
  }
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(hit => hit || fetch(event.request).then(res=>{
      const copy = res.clone();
      caches.open(CACHE).then(c=>c.put(event.request, copy));
      return res;
    }).catch(()=>caches.match('/index.html')))
  );
});
