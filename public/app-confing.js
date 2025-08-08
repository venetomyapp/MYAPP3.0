// ========================================
// MyApp - CONFIGURAZIONE CENTRALIZZATA v4.0
// ========================================

// ⚠️ IMPORTANTE: Usa sempre i tuoi dati reali di Supabase
const SUPABASE_URL = 'https://pvzdilkozpspsnepedqc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2emRpbGtvenBzcHNuZXBlZHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDY1NDUsImV4cCI6MjA3MDA4MjU0NX0.JimqeUkyOGcOw-pt-yJUVevSP3n6ikBPDR3N8y_7YIk';

// Configurazione globale dell'app
window.APP_CONFIG = {
    // Informazioni app
    APP_NAME: 'MyApp',
    APP_VERSION: '4.0.0',
    
    // Configurazione Supabase
    SUPABASE: {
        URL: SUPABASE_URL,
        ANON_KEY: SUPABASE_ANON_KEY,
        client: null, // Verrà inizializzato
        
        // Inizializzazione client
        init() {
            if (typeof supabase === 'undefined') {
                console.error('❌ Supabase SDK non caricato');
                return false;
            }
            
            try {
                this.client = supabase.createClient(this.URL, this.ANON_KEY);
                console.log('✅ Supabase client inizializzato');
                return true;
            } catch (error) {
                console.error('❌ Errore inizializzazione Supabase:', error);
                return false;
            }
        },
        
        // Ottieni client (con inizializzazione automatica)
        getClient() {
            if (!this.client) {
                this.init();
            }
            return this.client;
        }
    },
    
    // Nomi delle tabelle
    TABLES: {
        USER_PROFILES: 'user_profiles',
        TESSERE: 'tessere', 
        NEWS: 'news',
        CONVENZIONI: 'convenzioni',
        RICHIESTE: 'richieste',
        NOTIFICHE: 'notifiche',
        DOCUMENTI: 'documenti',
        ACTIVITY_LOGS: 'activity_logs'
    },
    
    // Gestione autenticazione
    AUTH: {
        // Ottieni utente corrente
        async getCurrentUser() {
            const client = APP_CONFIG.SUPABASE.getClient();
            if (!client) return null;
            
            try {
                const { data, error } = await client.auth.getUser();
                if (error) throw error;
                return data?.user || null;
            } catch (error) {
                console.error('Errore recupero utente:', error);
                return null;
            }
        },
        
        // Ottieni profilo utente completo
        async getUserProfile() {
            const user = await this.getCurrentUser();
            if (!user) return null;
            
            const client = APP_CONFIG.SUPABASE.getClient();
            try {
                const { data, error } = await client
                    .from(APP_CONFIG.TABLES.USER_PROFILES)
                    .select('*')
                    .eq('user_id', user.id)
                    .single();
                
                if (error) throw error;
                return data;
            } catch (error) {
                console.error('Errore recupero profilo:', error);
                return null;
            }
        },
        
        // Proteggi pagina (reindirizza se non autenticato)
        async protectPage() {
            const { data: { session } } = await APP_CONFIG.SUPABASE.getClient().auth.getSession();
            if (!session) {
                console.log('🔒 Utente non autenticato, reindirizzo al login');
                window.location.replace('auth.html');
                throw new Error('Utente non autenticato');
            }
            return true;
        },
        
        // Proteggi pagina admin (controlla ruolo)
        async protectAdminPage() {
            await this.protectPage(); // Prima controlla autenticazione
            
            const profile = await this.getUserProfile();
            if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'DIRIGENTE')) {
                console.log('🚫 Accesso negato: ruolo insufficiente');
                APP_CONFIG.NOTIFICATIONS.showToast('Non hai i permessi per accedere a questa sezione', 'error');
                setTimeout(() => {
                    window.location.replace('home.html');
                }, 2000);
                throw new Error('Permessi insufficienti');
            }
            return profile;
        },
        
        // Logout
        async logout() {
            try {
                const client = APP_CONFIG.SUPABASE.getClient();
                await client.auth.signOut();
                window.location.replace('auth.html');
            } catch (error) {
                console.error('Errore logout:', error);
                APP_CONFIG.NOTIFICATIONS.showToast('Errore durante il logout', 'error');
            }
        }
    },
    
    // Gestione tessere
    TESSERA: {
        // Ottieni tessera utente corrente
        async getCurrentUserTessera() {
            const user = await APP_CONFIG.AUTH.getCurrentUser();
            if (!user) return null;
            
            const client = APP_CONFIG.SUPABASE.getClient();
            try {
                const { data, error } = await client
                    .from(APP_CONFIG.TABLES.TESSERE)
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('stato', 'ATTIVA')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();
                
                if (error) {
                    console.warn('Nessuna tessera trovata:', error.message);
                    return null;
                }
                return data;
            } catch (error) {
                console.error('Errore recupero tessera:', error);
                return null;
            }
        },
        
        // Genera numero tessera univoco
        generateNumber() {
            const timestamp = Date.now().toString().slice(-6);
            const random = Math.floor(Math.random() * 999).toString().padStart(3, '0');
            return `${timestamp}${random}`;
        }
    },
    
    // Sistema notifiche/toast
    NOTIFICATIONS: {
        showToast(message, type = 'info', duration = 3000) {
            console.log(`[${type.toUpperCase()}] ${message}`);
            
            // Crea elemento toast
            const toast = document.createElement('div');
            toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 max-w-sm font-semibold`;
            
            // Colori basati sul tipo
            const colors = {
                'success': 'bg-green-500 text-white',
                'error': 'bg-red-500 text-white',
                'warning': 'bg-yellow-500 text-white',
                'info': 'bg-blue-500 text-white'
            };
            
            toast.className += ` ${colors[type] || colors.info}`;
            toast.textContent = message;
            
            // Aggiungi alla pagina
            document.body.appendChild(toast);
            
            // Animazione entrata
            setTimeout(() => {
                toast.style.transform = 'translateX(0)';
                toast.style.opacity = '1';
            }, 100);
            
            // Rimozione automatica
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (document.body.contains(toast)) {
                        document.body.removeChild(toast);
                    }
                }, 300);
            }, duration);
        }
    },
    
    // Utilità varie
    UTILS: {
        // Formatta data italiana
        formatDate(dateString) {
            if (!dateString) return '-';
            return new Date(dateString).toLocaleDateString('it-IT', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        },
        
        // Formatta data e ora
        formatDateTime(dateString) {
            if (!dateString) return '-';
            return new Date(dateString).toLocaleString('it-IT', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },
        
        // Genera iniziali da nome e cognome
        getInitials(nome, cognome) {
            const n = (nome || '').charAt(0).toUpperCase();
            const c = (cognome || '').charAt(0).toUpperCase();
            return (n || '-') + (c || '-');
        },
        
        // Valida email
        isValidEmail(email) {
            const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return regex.test(email);
        },
        
        // Debounce function
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
    },
    
    // Gestione loader globale
    LOADER: {
        show() {
            const loader = document.getElementById('pageLoader');
            if (loader) {
                loader.style.display = 'flex';
            }
        },
        
        hide() {
            const loader = document.getElementById('pageLoader');
            if (loader) {
                loader.style.display = 'none';
            }
        }
    },
    
    // Debug e diagnostica
    DEBUG: {
        enabled: false,
        
        log(...args) {
            if (this.enabled) {
                console.log('[MyApp Debug]', ...args);
            }
        },
        
        error(...args) {
            console.error('[MyApp Error]', ...args);
        },
        
        // Test connessione database
        async testConnection() {
            try {
                const client = APP_CONFIG.SUPABASE.getClient();
                const { data, error } = await client.auth.getSession();
                
                console.log('🔍 Test connessione Supabase:');
                console.log('✅ Client inizializzato:', !!client);
                console.log('✅ Sessione check:', error ? `❌ ${error.message}` : '✅ OK');
                console.log('📊 Sessione attiva:', !!data?.session);
                
                return !error;
            } catch (error) {
                console.error('❌ Test connessione fallito:', error);
                return false;
            }
        },
        
        // Info configurazione
        getConfigInfo() {
            return {
                url: APP_CONFIG.SUPABASE.URL,
                keyLength: APP_CONFIG.SUPABASE.ANON_KEY.length,
                tables: APP_CONFIG.TABLES,
                version: APP_CONFIG.APP_VERSION
            };
        }
    }
};

// ========================================
// INIZIALIZZAZIONE AUTOMATICA
// ========================================

// Inizializza quando il DOM è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

function initializeApp() {
    console.log('🚀 Inizializzazione MyApp v4.0...');
    
    // Abilita debug se richiesto
    if (localStorage.getItem('DEBUG_MODE') === 'true') {
        APP_CONFIG.DEBUG.enabled = true;
        console.log('🐛 Modalità debug abilitata');
    }
    
    // Aspetta che Supabase sia disponibile
    let attempts = 0;
    const maxAttempts = 20;
    
    function waitForSupabase() {
        attempts++;
        APP_CONFIG.DEBUG.log(`Tentativo ${attempts}: controllo Supabase...`);
        
        if (typeof supabase !== 'undefined') {
            console.log('✅ Supabase SDK caricato');
            
            // Inizializza client
            const success = APP_CONFIG.SUPABASE.init();
            if (success) {
                console.log('✅ APP_CONFIG configurato e pronto');
                
                // Test connessione (solo in debug)
                if (APP_CONFIG.DEBUG.enabled) {
                    APP_CONFIG.DEBUG.testConnection();
                }
                
                // Trigger evento personalizzato per le pagine
                window.dispatchEvent(new CustomEvent('appConfigReady'));
            }
        } else if (attempts < maxAttempts) {
            APP_CONFIG.DEBUG.log('⏳ Supabase non ancora disponibile, riprovo...');
            setTimeout(waitForSupabase, 200);
        } else {
            console.error('❌ Impossibile caricare Supabase dopo', maxAttempts, 'tentativi');
            APP_CONFIG.NOTIFICATIONS.showToast('Errore di caricamento. Ricarica la pagina.', 'error');
        }
    }
    
    waitForSupabase();
}

// ========================================
// FUNZIONI HELPER GLOBALI
// ========================================

// Funzione globale per il logout (usata nei bottoni)
window.logout = function() {
    APP_CONFIG.AUTH.logout();
};

// Funzione per ottenere badge ruolo HTML
window.getRoleBadgeHTML = function(role) {
    let className = 'role-user';
    if (role === 'ADMIN') className = 'role-admin';
    else if (role === 'DIRIGENTE') className = 'role-dirigente';
    
    return `<span class="role-badge ${className}">${role || 'USER'}</span>`;
};

// Funzione per formattare date
window.formatDate = APP_CONFIG.UTILS.formatDate;
window.formatDateTime = APP_CONFIG.UTILS.formatDateTime;

// ========================================
// GESTIONE ERRORI GLOBALE
// ========================================

// Cattura errori JavaScript non gestiti
window.addEventListener('error', function(e) {
    APP_CONFIG.DEBUG.error('Errore JavaScript:', e.error);
    
    // In produzione, invia errore a servizio di logging
    if (!APP_CONFIG.DEBUG.enabled) {
        // sendErrorToLoggingService(e.error);
    }
});

// Cattura Promise rejections non gestite
window.addEventListener('unhandledrejection', function(e) {
    APP_CONFIG.DEBUG.error('Promise rejection non gestita:', e.reason);
    
    // Previeni che l'errore appaia in console
    e.preventDefault();
    
    // Mostra notifica user-friendly
    APP_CONFIG.NOTIFICATIONS.showToast('Si è verificato un errore imprevisto', 'error');
});

// ========================================
// VALIDATORI COMUNI
// ========================================

window.VALIDATORS = {
    email: (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    },
    
    telefono: (tel) => {
        const regex = /^[\+]?[0-9\s\-\(\)]{8,15}$/;
        return regex.test(tel);
    },
    
    password: (pwd) => {
        return pwd && pwd.length >= 6;
    },
    
    required: (value) => {
        return value && value.trim().length > 0;
    }
};

// ========================================
// STATUS CHECK E DIAGNOSTICA
// ========================================

window.APP_STATUS = {
    async check() {
        const status = {
            timestamp: new Date().toISOString(),
            supabase: {
                sdkLoaded: typeof supabase !== 'undefined',
                clientInitialized: !!APP_CONFIG.SUPABASE.client,
                connected: false
            },
            auth: {
                authenticated: false,
                user: null,
                profile: null
            }
        };
        
        // Test connessione Supabase
        try {
            const client = APP_CONFIG.SUPABASE.getClient();
            const { data, error } = await client.auth.getSession();
            status.supabase.connected = !error;
            
            if (data?.session) {
                status.auth.authenticated = true;
                status.auth.user = {
                    id: data.session.user.id,
                    email: data.session.user.email
                };
                
                // Recupera profilo
                const profile = await APP_CONFIG.AUTH.getUserProfile();
                if (profile) {
                    status.auth.profile = {
                        nome: profile.nome,
                        role: profile.role,
                        stato: profile.stato
                    };
                }
            }
        } catch (error) {
            status.supabase.error = error.message;
        }
        
        return status;
    },
    
    async logStatus() {
        const status = await this.check();
        console.log('📊 MyApp Status:', status);
        return status;
    }
};

// ========================================
// ESPORTAZIONE PER COMPATIBILITA
// ========================================

// Per compatibilità con codice esistente
window.supabaseClient = () => APP_CONFIG.SUPABASE.getClient();

console.log('🎯 app-config.js caricato - MyApp v4.0 pronto');

// ========================================
// FINE CONFIGURAZIONE
// ========================================