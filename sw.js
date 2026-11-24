/* PitchFrame service worker
 * - 只快取本站檔案；影片從不經過這裡（影片是 blob:，不會被攔截或儲存）
 * - 頁面：先連網取最新版，離線時用快取
 * - 程式與模型：快取優先。第一次用 AI 時載入的模型會留在手機，球場沒訊號也能分析
 * 發新版時改 VERSION，舊快取會在啟用時清掉。
 */
const VERSION = 'pf-2026-11-24p';
const CACHE = `pitchframe-${VERSION}`;
const SHELL = ['./', './index.html', './tailwind.js', './pose.js', './pitchframe_events.js', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './assets/pitchframe-preview.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('pitchframe-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(CACHE);
        cache.put('./index.html', fresh.clone());
        return fresh;
      } catch (_) {
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE);
      cache.put(request, response.clone());
    }
    return response;
  })());
});
