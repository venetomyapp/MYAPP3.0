// ===== SERVICE WORKER MYAPP BY SIM =====
// File: /sw.js (root del sito)

const CACHE_NAME = 'myapp-sim-v1.0';
const APP_VERSION = '1.0';

// File da cacheare per funzionamento offline
const urlsToCache = [
    '/',
    '/password-recovery.html',
    '/reset-password.html', 
    '/login.html',
    '/home.html',
    '/home_dirigenti.html',
    '/manifest.json',
    // Aggiungi altre pagine principali qui
    
    // Assets esterni critici
    'https://cdn.tailwindcss.com',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
];

// File che devono sempre essere aggiornati (no cache)
const noCacheUrls = [
    '/api/',
    'supabase.co',
    'google',
    'facebook'
];

// ===== INSTALLAZIONE =====
self.addEventListener('install', event => {
    console.log('MyApp by SIM SW - Installazione v' + APP_VERSION);
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('MyApp by SIM SW - Cache aperto');
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('MyApp by SIM SW - File cachati con successo');
                // Forza l'attivazione immediata
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('MyApp by SIM SW - Errore installazione:', error);
            })
    );
});

// ===== ATTIVAZIONE =====
self.addEventListener('activate', event => {
    console.log('MyApp by SIM SW - Attivazione');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Pulisci cache vecchie
                    if (cacheName !== CACHE_NAME) {
                        console.log('MyApp by SIM SW - Rimozione cache vecchia:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('MyApp by SIM SW - Cache pulite, prendendo controllo');
            
            // Notifica l'app dell'attivazione
            self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SW_ACTIVATED',
                        message: 'MyApp by SIM SW attivo v' + APP_VERSION
                    });
                });
            });
            
            return self.clients.claim();
        })
    );
});

// ===== FETCH - GESTIONE RICHIESTE =====
self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Skip richieste non GET
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip richieste che non devono essere cachate
    if (noCacheUrls.some(noCache => url.href.includes(noCache))) {
        return;
    }
    
    // Strategia Cache First per assets statici
    if (url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2)$/)) {
        event.respondWith(
            caches.match(request).then(response => {
                return response || fetch(request).then(fetchResponse => {
                    // Cache la risorsa per il futuro
                    const responseClone = fetchResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, responseClone);
                    });
                    return fetchResponse;
                });
            }).catch(() => {
                // Fallback per immagini rotte
                if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg)$/)) {
                    return new Response(
                        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f3f4f6"/><text x="100" y="100" text-anchor="middle" dy="0.3em" font-family="sans-serif" font-size="14" fill="#6b7280">Immagine non disponibile</text></svg>',
                        { headers: { 'Content-Type': 'image/svg+xml' } }
                    );
                }
            })
        );
        return;
    }
    
    // Strategia Network First per pagine HTML
    if (request.headers.get('accept').includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Cache la pagina se la richiesta ha successo
                    if (response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Fallback alla cache se offline
                    return caches.match(request).then(response => {
                        if (response) {
                            return response;
                        }
                        
                        // Pagina offline personalizzata
                        return new Response(`
                            <!DOCTYPE html>
                            <html lang="it">
                            <head>
                                <meta charset="UTF-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <title>Offline - MyApp by SIM</title>
                                <style>
                                    body {
                                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                        background: linear-gradient(180deg, #4a148c 0%, #ad1457 50%, #d32f2f 100%);
                                        color: white;
                                        margin: 0;
                                        padding: 20px;
                                        min-height: 100vh;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        text-align: center;
                                    }
                                    .container {
                                        max-width: 400px;
                                        background: rgba(255, 255, 255, 0.1);
                                        backdrop-filter: blur(10px);
                                        border-radius: 20px;
                                        padding: 40px 30px;
                                        border: 1px solid rgba(255, 255, 255, 0.2);
                                    }
                                    h1 { margin: 0 0 10px 0; font-size: 24px; }
                                    .subtitle { font-size: 14px; opacity: 0.8; margin-bottom: 20px; }
                                    .icon { font-size: 48px; margin-bottom: 20px; }
                                    .message { font-size: 16px; line-height: 1.5; margin-bottom: 30px; }
                                    .btn {
                                        background: rgba(255, 255, 255, 0.2);
                                        border: 1px solid rgba(255, 255, 255, 0.3);
                                        color: white;
                                        padding: 12px 24px;
                                        border-radius: 12px;
                                        text-decoration: none;
                                        font-weight: 600;
                                        display: inline-block;
                                        transition: all 0.3s ease;
                                    }
                                    .btn:hover {
                                        background: rgba(255, 255, 255, 0.3);
                                        transform: translateY(-2px);
                                    }
                                </style>
                            </head>
                            <body>
                                <div class="container">
                                    <div class="icon">📱</div>
                                    <h1>MyApp</h1>
                                    <div class="subtitle">by SIM</div>
                                    <div class="message">
                                        Sei offline. Questa pagina non è disponibile senza connessione internet.
                                    </div>
                                    <a href="/" class="btn" onclick="window.location.reload()">
                                        Riprova
                                    </a>
                                </div>
                            </body>
                            </html>
                        `, {
                            headers: { 'Content-Type': 'text/html' }
                        });
                    });
                })
        );
        return;
    }
    
    // Strategia predefinita: Network First
    event.respondWith(
        fetch(request).catch(() => {
            return caches.match(request);
        })
    );
});

// ===== GESTIONE MESSAGGI =====
self.addEventListener('message', event => {
    const { data } = event;
    
    if (data && data.type === 'SKIP_WAITING') {
        console.log('MyApp by SIM SW - Skip waiting richiesto');
        self.skipWaiting();
    }
    
    if (data && data.type === 'GET_VERSION') {
        event.ports[0].postMessage({
            version: APP_VERSION,
            cacheName: CACHE_NAME
        });
    }
});

// ===== GESTIONE ERRORI =====
self.addEventListener('error', event => {
    console.error('MyApp by SIM SW - Errore:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('MyApp by SIM SW - Promise rifiutata:', event.reason);
});

console.log('MyApp by SIM Service Worker v' + APP_VERSION + ' caricato');
