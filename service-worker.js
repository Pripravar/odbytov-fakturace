// Minimální service worker — umožní instalaci PWA. Záměrně BEZ cachování,
// aby se aplikace i data (Firebase) vždy načítaly aktuální (fakturace musí být live).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* síťová strategie default (žádná cache) */ });
