// ===== REGISTRAZIONE SERVICE WORKER MIGLIORATA =====
// Sostituisci il codice esistente in Academy.html e admin-academy.html

// Service Worker con gestione aggiornamenti
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/',
                updateViaCache: 'none' // Forza controllo aggiornamenti
            });
            
            console.log('✅ SW registrato con scope:', registration.scope);
            
            // Gestisci aggiornamenti SW
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                console.log('🔄 Nuovo SW trovato, installando...');
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed') {
                        if (navigator.serviceWorker.controller) {
                            // Nuovo SW disponibile
                            console.log('✨ Nuovo SW pronto');
                            showUpdateNotification(newWorker);
                        } else {
                            // Primo SW installato
                            console.log('✅ SW installato per la prima volta');
                            showInstallNotification();
                        }
                    }
                });
            });
            
            // Controlla aggiornamenti ogni 60 secondi
            setInterval(() => {
                registration.update();
            }, 60000);
            
            // Ascolta messaggi dal SW
            navigator.serviceWorker.addEventListener('message', event => {
                const { data } = event;
                if (data && data.type === 'SW_ACTIVATED') {
                    console.log('📱 SW:', data.message);
                }
            });
            
        } catch (error) {
            console.error('❌ SW registrazione fallita:', error);
            // Non mostrare più "SW non disponibile" generico
            console.log('ℹ️ SW non disponibile - funzionalità offline limitate');
        }
    });
    
    // Gestisci cambio di stato online/offline
    window.addEventListener('online', () => {
        showToast('🌐 Connessione ripristinata', 'success');
    });
    
    window.addEventListener('offline', () => {
        showToast('📱 Modalità offline attiva', 'info');
    });
} else {
    console.log('⚠️ Browser non supporta Service Workers');
}

// ===== NOTIFICHE UI =====
function showUpdateNotification(newWorker) {
    // Crea notifica in-app per aggiornamento
    const notification = createNotification(
        '🚀 Nuova versione disponibile!',
        'Clicca per aggiornare MyApp',
        () => {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            window.location.reload();
        }
    );
    
    document.body.appendChild(notification);
}

function showInstallNotification() {
    showToast('✅ MyApp ora funziona offline!', 'success');
}

function createNotification(title, message, onAction) {
    const div = document.createElement('div');
    div.className = 'fixed top-4 right-4 z-[9999] max-w-sm bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden';
    div.innerHTML = `
        <div class="p-4">
            <div class="flex items-start">
                <div class="flex-grow">
                    <h4 class="text-sm font-bold text-gray-900 mb-1">${title}</h4>
                    <p class="text-sm text-gray-600">${message}</p>
                </div>
                <button class="ml-3 text-gray-400 hover:text-gray-600" onclick="this.closest('.fixed').remove()">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                    </svg>
                </button>
            </div>
            <div class="mt-3 flex gap-2">
                <button class="btn-aurora text-sm px-3 py-1" onclick="this.closest('.fixed').remove(); (${onAction})()">
                    Aggiorna ora
                </button>
                <button class="text-sm text-gray-500 hover:text-gray-700 px-3 py-1" onclick="this.closest('.fixed').remove()">
                    Più tardi
                </button>
            </div>
        </div>
    `;
    
    // Auto-remove dopo 10 secondi
    setTimeout(() => {
        if (div.parentNode) {
            div.remove();
        }
    }, 10000);
    
    return div;
}

// Toast esistente o nuova implementazione
function showToast(message, type = 'info') {
    // Se hai già una funzione toast(), usa quella
    // Altrimenti implementa una versione semplice:
    
    if (typeof toast === 'function') {
        toast(message);
        return;
    }
    
    // Implementazione toast semplice
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500', 
        info: 'bg-blue-500'
    };
    
    const div = document.createElement('div');
    div.className = `fixed top-6 right-6 ${colors[type]} text-white px-4 py-3 rounded-xl font-bold shadow-xl z-[9999] max-w-sm`;
    div.textContent = message;
    
    document.body.appendChild(div);
    
    // Animazione di entrata
    div.style.transform = 'translateX(100%)';
    div.style.transition = 'transform 0.3s ease';
    setTimeout(() => div.style.transform = 'translateX(0)', 10);
    
    // Auto-remove
    setTimeout(() => {
        div.style.transform = 'translateX(100%)';
        setTimeout(() => div.remove(), 300);
    }, 3000);
}
