// 本站内容每日更新，离线缓存弊大于利。此 SW 仅用于清理旧缓存后自我注销。
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.registration.unregister();
  })());
});
