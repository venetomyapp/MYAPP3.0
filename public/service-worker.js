/**
 * Service Worker per MyApp
 * Gestisce la cache e il funzionamento offline
 * Versione: 4.0.0 - Aggiornato per Supabase
 */

// Nome della cache
const CACHE_NAME = 'myapp-v4';

// Risorse statiche da cachare
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/auth.html',
  '/home.html',
  '/home_dirigenti.html',
  '/profilo.html',
  '/tessera.html',
  '/convenzioni.html',
  '/news.html',
  '/offline.html',
  // Icone dalla cartella icons
  '/icons/icon-16x16.png',
  '/icons/icon-32x32.png',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-180x180.png',
  '/icons/icon-192x192.png',
  '/icons/icon-256x256.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-16x16.png',
  '/icons/favicon-32x32.png',
  // CDN Essenziali
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Installazione del Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installazione MyApp v4.0');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching risorse statiche...');
        
        // Cache le risorse una per una per evitare errori
        return Promise.allSettled(
          STATIC_ASSETS.map(url => {
            return cache.add(url).catch(error => {
              console.warn(`[Service Worker] Impossibile cachare ${url}:`, error);
            });
          })
        );
      })
      .then(() => {
        console.log('✅ [Service Worker] Risorse cachate con successo');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ [Service Worker] Errore durante installazione:', error);
      })
  );
});

// Attivazione del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Attivazione MyApp v4.0');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => {
          // Mantieni solo la cache corrente
          return cacheName !== CACHE_NAME;
        }).map((cacheName) => {
          console.log('[Service Worker] Eliminazione cache vecchia:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('✅ [Service Worker] Attivato e pronto!');
      return self.clients.claim();
    })
  );
});

// Gestione delle richieste di rete
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  
  // ⚡ REGOLE SPECIALI PER SUPABASE
  if (requestUrl.hostname.includes('supabase.co')) {
    // Non cachare mai le richieste Supabase (dati dinamici)
    return;
  }
  
  // 🚫 NON CACHARE RICHIESTE API DINAMICHE
  if (requestUrl.pathname.includes('/api/') || 
      requestUrl.pathname.includes('/auth/') ||
      event.request.method !== 'GET') {
    return;
  }
  
  // 📱 RICHIESTE DI NAVIGAZIONE (pagine HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Se la richiesta ha successo, restituisci la risposta
          return response;
        })
        .catch(() => {
          // Se offline, servi la pagina offline
          console.log('[Service Worker] Offline - servendo pagina offline');
          return caches.match('/offline.html').then(cachedResponse => {
            return cachedResponse || new Response(
              '<html><body><h1>App non disponibile offline</h1><p>Controlla la connessione internet.</p></body></html>',
              { headers: { 'Content-Type': 'text/html' } }
            );
          });
        })
    );
    return;
  }
  
  // 🎯 STRATEGIA CACHE FIRST per risorse statiche
  if (isStaticAsset(event.request.url)) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log('[Service Worker] Servendo da cache:', event.request.url);
            return cachedResponse;
          }
          
          // Non in cache - fetch dalla rete
          return fetch(event.request)
            .then((networkResponse) => {
              // Aggiungi alla cache solo se la risposta è OK
              if (networkResponse.status === 200) {
                return caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                  });
              }
              return networkResponse;
            })
            .catch((error) => {
              console.warn('[Service Worker] Errore fetch risorsa statica:', error);
              throw error;
            });
        })
    );
    return;
  }
  
  // 🌐 STRATEGIA NETWORK FIRST per tutto il resto
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache solo risposte GET con successo
        if (event.request.method === 'GET' && networkResponse.status === 200) {
          return caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, networkResponse.clone());
              return networkResponse;
            });
        }
        return networkResponse;
      })
      .catch((error) => {
        console.log('[Service Worker] Tentativo fallback cache per:', event.request.url);
        
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[Service Worker] Servendo da cache (fallback):', event.request.url);
              return cachedResponse;
            }
            throw error;
          });
      })
  );
});

// 📋 Funzione per identificare risorse statiche
function isStaticAsset(url) {
  const staticPatterns = [
    // File con estensioni statiche
    /\.(css|js|svg|png|jpg|jpeg|gif|ico|woff|woff2|ttf|eot)$/,
    // CDN di librerie
    /cdn\.tailwindcss\.com/,
    /cdn\.jsdelivr\.net/,
    /cdnjs\.cloudflare\.com/,
    // Cartelle statiche
    /\/assets\//,
    /\/icons\//,
    /\/images\//,
    /\/public\//
  ];
  
  return staticPatterns.some(pattern => pattern.test(url));
}

// 🔄 Gestione sincronizzazione in background
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-myapp-data') {
    event.waitUntil(
      syncOfflineData()
    );
  }
});

// Funzione per sincronizzare dati offline (implementazione futura)
async function syncOfflineData() {
  try {
    console.log('[Service Worker] Sincronizzazione dati offline...');
    // Qui implementeremo la sincronizzazione dei dati salvati offline
    // con il database Supabase quando la connessione torna disponibile
  } catch (error) {
    console.error('[Service Worker] Errore sincronizzazione:', error);
  }
}

// 🔔 Gestione notifiche push
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.warn('[Service Worker] Push ricevuto senza dati');
    return;
  }
  
  try {
    const notificationData = event.data.json();
    
    const notificationOptions = {
      body: notificationData.body || 'Nuova notifica da MyApp',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      data: notificationData.data || {},
      actions: notificationData.actions || [],
      tag: notificationData.tag || 'myapp-notification',
      requireInteraction: notificationData.urgent || false,
      vibrate: [200, 100, 200],
      timestamp: Date.now()
    };
    
    event.waitUntil(
      self.registration.showNotification(
        notificationData.title || 'MyApp',
        notificationOptions
      )
    );
  } catch (error) {
    console.error('[Service Worker] Errore processing push:', error);
  }
});

// 👆 Gestione click sulle notifiche
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notifica cliccata:', event.notification);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/home.html';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Cerca se c'è già una finestra MyApp aperta
        for (let client of windowClients) {
          if (client.url.includes('myapp') && 'focus' in client) {
            console.log('[Service Worker] Focus su finestra esistente');
            return client.focus();
          }
        }
        
        // Apri nuova finestra
        if (clients.openWindow) {
          console.log('[Service Worker] Apertura nuova finestra:', urlToOpen);
          return clients.openWindow(urlToOpen);
        }
      })
      .catch(error => {
        console.error('[Service Worker] Errore gestione click notifica:', error);
      })
  );
});

// 📊 Gestione messaggi dal client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] Richiesta skip waiting dal client');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_CACHE_STATUS') {
    event.ports[0].postMessage({
      cacheVersion: CACHE_NAME,
      isOnline: navigator.onLine
    });
  }
});

// 🌐 Gestione cambio stato online/offline
self.addEventListener('online', () => {
  console.log('🌐 [Service Worker] Connessione ripristinata');
  // Trigger sincronizzazione quando si torna online
  self.registration.sync.register('sync-myapp-data');
});

self.addEventListener('offline', () => {
  console.log('📴 [Service Worker] Modalità offline attiva');
});

console.log('🚀 [Service Worker] MyApp v4.0 pronto a gestire le richieste!');
