const CACHE_NAME = 'secretary-pwa-v1';

// 💡 รายชื่อไฟล์พื้นฐานที่ต้องการให้ระบบจำไว้เผื่อตอนไม่มีเน็ต
const ASSETS_TO_CACHE = [
  './',
  './index.html', 
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ==========================================
// 1. Install Event: ติดตั้งและเก็บไฟล์ลงแคช
// ==========================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] 📦 กำลังเก็บแคชไฟล์ระบบ...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// ==========================================
// 2. Activate Event: ล้างแคชเก่าทิ้งเมื่อมีการอัปเดตเวอร์ชัน
// ==========================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] 🧹 ล้างแคชเวอร์ชันเก่า: ', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ==========================================
// 3. Fetch Event: ดักจับคำขอ (Network First Strategy)
// ==========================================
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // 💡 กฎเหล็ก: ปล่อยผ่าน Request ที่วิ่งไปหา Supabase ไม่ต้องเอามาแคช (เพราะเราเก็บข้อมูลลง localStorage อยู่แล้ว)
  if (requestUrl.hostname.includes('supabase.co')) {
    return;
  }

  // 💡 กฎเหล็ก 2: ปล่อยผ่าน Request ที่เป็นพวก Extension ของเบราว์เซอร์
  if (requestUrl.protocol === 'chrome-extension:') {
    return;
  }

  event.respondWith(
    // พยายามดึงข้อมูลจากอินเทอร์เน็ตก่อน (Network First)
    fetch(event.request)
      .then((response) => {
        // ถ้าต่อเน็ตได้ และได้ไฟล์มาปกติ ให้เอาไปอัปเดตในแคชด้วย
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // ถ้า "ออฟไลน์" (ไม่มีเน็ต) ให้ไปงัดไฟล์จากในแคช (Cache) ออกมาแสดงแทน
        return caches.match(event.request);
      })
  );
});
