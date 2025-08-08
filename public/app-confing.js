/**
 * app-config.js
 * Configurazione centralizzata per MyApp
 * Posiziona questo file in: /assets/js/app-config.js
 */

// ============================================
// CONFIGURAZIONE SUPABASE
// ============================================
const SUPABASE_CONFIG = {
    url: 'https://pvzdilkozpspsnepedqc.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2emRpbGtvenBzcHNuZXBlZHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDY1NDUsImV4cCI6MjA3MDA4MjU0NX0.JimqeUkyOGcOw-pt-yJUVevSP3n6ikBPDR3N8y_7YIk'
};

// ============================================
// RILEVAMENTO PERCORSO AUTOMATICO
// ============================================
function detectCurrentPath() {
    const path = window.location.pathname;
    const pathParts = path.split('/').filter(p => p);
    
    // Determina in quale cartella siamo
    if (path.includes('/app/')) {
        return 'app';
    } else if (path.includes('/public/') || pathParts.length === 1 || path === '/') {
        return 'public';
    } else {
        return 'root';
    }
}

// ============================================
// GENERATORE PERCORSI DINAMICI
// ============================================
const APP_PATHS = {
    // Genera percorsi in base alla posizione corrente
    getPath: function(destination) {
        const currentLocation = detectCurrentPath();
        const paths = {
            // Se siamo in /public/
            public: {
                // Pagine pubbliche
                index: 'index.html',
                login: 'login.html',
                recuperoPassword: 'recupero-password.html',
                registrazione: 'registrazione.html',
                conferma: 'conferma.html',
                privacy: 'privacy.html',
                contatti: 'contatti.html',
                convenzioni: 'convenzioni.html',
                dirigentiIndex: 'dirigenti_index.html',
                
                // Pagine app
                home: '../app/home.html',
                homeDirigenti: '../app/home_dirigenti.html',
                profilo: '../app/profilo.html',
                tessera: '../app/tessera.html',
                dirigenti: '../app/dirigenti.html',
                servizi: '../app/servizi.html',
                notifiche: '../app/notifiche.html',
                areaDirigenti: '../app/areadirigenti.html',
                dashboardStatistiche: '../app/dashboard-statistiche.html',
                gestioneConvenzioni: '../app/gestione-convenzioni.html',
                gestioneNotizie: '../app/gestione-notizie.html',
                gestioneSoci: '../app/gestione-soci.html',
                strumenti: '../app/strumenti.html',
                
                // Assets
                icons: '../icons/',
                css: '../assets/css/',
                js: '../assets/js/'
            },
            
            // Se siamo in /app/
            app: {
                // Pagine pubbliche
                index: '../public/index.html',
                login: '../public/login.html',
                recuperoPassword: '../public/recupero-password.html',
                registrazione: '../public/registrazione.html',
                conferma: '../public/conferma.html',
                privacy: '../public/privacy.html',
                contatti: '../public/contatti.html',
                convenzioni: '../public/convenzioni.html',
                dirigentiIndex: '../public/dirigenti_index.html',
                
                // Pagine app (stesso livello)
                home: 'home.html',
                homeDirigenti: 'home_dirigenti.html',
                profilo: 'profilo.html',
                tessera: 'tessera.html',
                dirigenti: 'dirigenti.html',
                servizi: 'servizi.html',
                notifiche: 'notifiche.html',
                areaDirigenti: 'areadirigenti.html',
                dashboardStatistiche: 'dashboard-statistiche.html',
                gestioneConvenzioni: 'gestione-convenzioni.html',
                gestioneNotizie: 'gestione-notizie.html',
                gestioneSoci: 'gestione-soci.html',
                strumenti: 'strumenti.html',
                
                // Assets
                icons: '../icons/',
                css: '../assets/css/',
                js: '../assets/js/'
            },
            
            // Se siamo nella root
            root: {
                // Pagine pubbliche
                index: 'public/index.html',
                login: 'public/login.html',
                recuperoPassword: 'public/recupero-password.html',
                registrazione: 'public/registrazione.html',
                conferma: 'public/conferma.html',
                privacy: 'public/privacy.html',
                contatti: 'public/contatti.html',
                convenzioni: 'public/convenzioni.html',
                dirigentiIndex: 'public/dirigenti_index.html',
                
                // Pagine app
                home: 'app/home.html',
                homeDirigenti: 'app/home_dirigenti.html',
                profilo: 'app/profilo.html',
                tessera: 'app/tessera.html',
                dirigenti: 'app/dirigenti.html',
                servizi: 'app/servizi.html',
                notifiche: 'app/notifiche.html',
                areaDirigenti: 'app/areadirigenti.html',
                dashboardStatistiche: 'app/dashboard-statistiche.html',
                gestioneConvenzioni: 'app/gestione-convenzioni.html',
                gestioneNotizie: 'app/gestione-notizie.html',
                gestioneSoci: 'app/gestione-soci.html',
                strumenti: 'app/strumenti.html',
                
                // Assets
                icons: 'icons/',
                css: 'assets/css/',
                js: 'assets/js/'
            }
        };
        
        return paths[currentLocation][destination] || '#';
    },
    
    // Naviga a una pagina
    navigate: function(destination) {
        const path = this.getPath(destination);
        if (path !== '#') {
            window.location.href = path;
        }
    },
    
    // Redirect con delay
    navigateWithDelay: function(destination, delay = 1500) {
        setTimeout(() => {
            this.navigate(destination);
        }, delay);
    }
};

// ============================================
// INIZIALIZZAZIONE SUPABASE
// ============================================
let supabaseClient = null;

function initSupabase() {
    if (typeof supabase !== 'undefined' && !supabaseClient) {
        const { createClient } = supabase;
        supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        console.log('✅ Supabase inizializzato');
    }
    return supabaseClient;
}

// ============================================
// GESTIONE AUTENTICAZIONE
// ============================================
const AuthManager = {
    // Controlla se l'utente è autenticato
    async checkAuth() {
        const client = initSupabase();
        if (!client) {
            console.error('❌ Supabase non inizializzato');
            return null;
        }
        
        try {
            const { data: { session } } = await client.auth.getSession();
            return session;
        } catch (error) {
            console.error('❌ Errore controllo auth:', error);
            return null;
        }
    },
    
    // Ottieni profilo utente
    async getUserProfile(userId) {
        const client = initSupabase();
        if (!client) return null;
        
        try {
            const { data, error } = await client
                .from('user_profiles')
                .select('*')
                .eq('user_id', userId)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('❌ Errore caricamento profilo:', error);
            return null;
        }
    },
    
    // Login
    async login(email, password) {
        const client = initSupabase();
        if (!client) throw new Error('Supabase non inizializzato');
        
        const { data, error } = await client.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        return data;
    },
    
    // Logout
    async logout() {
        const client = initSupabase();
        if (!client) return;
        
        try {
            await client.auth.signOut();
            APP_PATHS.navigate('index');
        } catch (error) {
            console.error('❌ Errore logout:', error);
            APP_PATHS.navigate('index');
        }
    },
    
    // Registrazione
    async register(userData) {
        const client = initSupabase();
        if (!client) throw new Error('Supabase non inizializzato');
        
        const { data, error } = await client.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: {
                data: {
                    full_name: `${userData.nome} ${userData.cognome}`,
                    nome: userData.nome,
                    cognome: userData.cognome,
                    telefono: userData.telefono,
                    role: 'USER'
                }
            }
        });
        
        if (error) throw error;
        return data;
    },
    
    // Verifica ruolo e redirect
    async checkRoleAndRedirect() {
        const session = await this.checkAuth();
        if (!session) {
            APP_PATHS.navigate('login');
            return false;
        }
        
        const profile = await this.getUserProfile(session.user.id);
        
        // Se siamo in una pagina pubblica e l'utente è loggato
        const currentPath = detectCurrentPath();
        if (currentPath === 'public' && !window.location.pathname.includes('login')) {
            if (profile?.role === 'DIRIGENTE' || profile?.role === 'ADMIN') {
                APP_PATHS.navigate('homeDirigenti');
            } else {
                APP_PATHS.navigate('home');
            }
            return true;
        }
        
        // Se siamo in home.html e l'utente è dirigente
        if (window.location.pathname.includes('home.html') && !window.location.pathname.includes('home_dirigenti')) {
            if (profile?.role === 'DIRIGENTE' || profile?.role === 'ADMIN') {
                APP_PATHS.navigate('homeDirigenti');
                return true;
            }
        }
        
        return false;
    }
};

// ============================================
// UTILITÀ GENERALI
// ============================================
const Utils = {
    // Formatta data italiana
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const options = { day: '2-digit', month: 'long', year: 'numeric' };
        return date.toLocaleDateString('it-IT', options);
    },
    
    // Genera numero tessera
    generateTessera() {
        const year = new Date().getFullYear();
        const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
        return `MA${year}${random}`;
    },
    
    // Mostra messaggio
    showMessage(text, type = 'info', duration = 5000) {
        // Rimuovi messaggi esistenti
        document.querySelectorAll('.app-message').forEach(el => el.remove());
        
        const message = document.createElement('div');
        message.className = `app-message message-${type}`;
        message.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            border-radius: 12px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            min-width: 300px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s ease-out;
        `;
        
        const colors = {
            success: 'linear-gradient(135deg, #10b981, #059669)',
            error: 'linear-gradient(135deg, #ef4444, #dc2626)',
            info: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            warning: 'linear-gradient(135deg, #f59e0b, #d97706)'
        };
        
        message.style.background = colors[type] || colors.info;
        message.textContent = text;
        
        document.body.appendChild(message);
        
        if (duration > 0) {
            setTimeout(() => {
                message.remove();
            }, duration);
        }
    },
    
    // Validazione email
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
};

// ============================================
// AUTO-INIZIALIZZAZIONE
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 App Config Loaded');
    console.log('📍 Current location:', detectCurrentPath());
    
    // Inizializza Supabase se disponibile
    if (typeof supabase !== 'undefined') {
        initSupabase();
        
        // Listener per cambio stato auth
        supabaseClient.auth.onAuthStateChange((event, session) => {
            console.log('🔐 Auth state changed:', event);
            
            if (event === 'SIGNED_OUT') {
                APP_PATHS.navigate('index');
            }
        });
    }
});

// ============================================
// ESPORTA PER USO GLOBALE
// ============================================
window.APP_CONFIG = {
    SUPABASE_CONFIG,
    APP_PATHS,
    AuthManager,
    Utils,
    getSupabaseClient: initSupabase
};

console.log('✅ App Config Ready - Use window.APP_CONFIG to access');
