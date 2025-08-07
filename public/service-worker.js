/**
 * Service Worker per MyApp
 * Gestisce la cache e il funzionamento offline
 * Versione: 1.0.0
 */

// Nome della cache
const CACHE_NAME = 'myapp-v1';

// Risorse statiche da cachare
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/public/index.html',
  '/public/offline.html',
  '/public/login.html',
  '/app/home.html',
  '/app/profilo.html',
  '/app/tessera.html',
  '/public/convenzioni.html',
  '/assets/js/app-config.js',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js',
  'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Installazione del Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installazione');
  
  // Apri la cache e aggiungi tutte le risorse statiche
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Risorse in cache');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Attiva immediatamente il nuovo service worker
        return self.skipWaiting();
      })
  );
});

// Attivazione del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Attivazione');
  
  // Elimina vecchie cache
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => {
          return cacheName !== CACHE_NAME;
        }).map((cacheName) => {
          console.log('[Service Worker] Eliminazione cache vecchia:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('[Service Worker] Attivato e pronto!');
      // Prendi il controllo di tutte le pagine aperte
      return self.clients.claim();
    })
  );
});

// Gestione delle richieste di rete
self.addEventListener('fetch', (event) => {
  // Skip per richieste a Supabase (no cache per dati dinamici)
  if (event.request.url.includes('supabase.co')) {
    return;
  }
  
  // Se è una richiesta di navigazione (per una pagina HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Se offline, servi la pagina offline
          return caches.match('/public/offline.html');
        })
    );
    return;
  }
  
  // Strategia Cache First per risorse statiche
  if (isStaticAsset(event.request.url)) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          // Usa la versione cache se disponibile
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // Altrimenti fetch dalla rete
          return fetch(event.request)
            .then((networkResponse) => {
              // Aggiungi alla cache per uso futuro
              return caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, networkResponse.clone());
                  return networkResponse;
                });
            })
            .catch((error) => {
              console.error('[Service Worker] Errore fetch:', error);
              // Se una risorsa statica non è in cache e siamo offline
              // Non possiamo fare molto, ritorna error
              throw error;
            });
        })
    );
    return;
  }
  
  // Strategia Network First per tutto il resto
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Aggiungi alla cache solo se la richiesta è GET
        if (event.request.method === 'GET') {
          return caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            });
        } else {
          return networkResponse;
        }
      })
      .catch((error) => {
        console.log('[Service Worker] Fallback a cache per:', event.request.url);
        
        // Prova a servire dalla cache
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Se non è in cache e siamo offline, ritorna errore
            throw error;
          });
      })
  );
});

// Controlla se l'URL è una risorsa statica
function isStaticAsset(url) {
  const staticPatterns = [
    /\.(css|js|svg|png|jpg|jpeg|gif|woff|woff2|ttf|eot)$/,
    /\/assets\//,
    /\/icons\//
  ];
  
  return staticPatterns.some(pattern => pattern.test(url));
}

// Gestione degli eventi di sincronizzazione in background
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    // Implementazione futura per sincronizzare dati quando si torna online
    console.log('[Service Worker] Sincronizzazione dati in background');
  }
});

// Gestione delle notifiche push
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const notificationData = event.data.json();
  
  const notificationOptions = {
    body: notificationData.body || 'Nuova notifica da MyApp',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    data: notificationData.data || {},
    actions: notificationData.actions || []
  };
  
  event.waitUntil(
    self.registration.showNotification(
      notificationData.title || 'MyApp',
      notificationOptions
    )
  );
});

// Gestione del click sulle notifiche
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Apri una finestra specifica basata sui dati della notifica
  const urlToOpen = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.matchAll({type: 'window'})
      .then((windowClients) => {
        // Controlla se c'è già una finestra aperta con l'URL
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Altrimenti apri una nuova finestra
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Log quando il service worker è pronto
console.log('[Service Worker] Pronto a gestire le richieste!');