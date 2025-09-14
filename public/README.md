# 🏛️ MyApp By SIM Carabinieri

**Progressive Web App enterprise** - Piattaforma completa per la gestione sindacale con calcoli stipendiali, turni, licenze, tessere digitali e knowledge base integrata.

---

## 🚀 Caratteristiche Principali

- ✅ **Autenticazione sicura** con Supabase Auth
- 📱 **Progressive Web App** (PWA) installabile
- 🎨 **Design moderno** responsive per tutti i dispositivi
- 👑 **Dashboard dirigenziale** con analytics avanzate
- 🎫 **Tessere sindacali digitali** personalizzate
- 💰 **Calcoli automatici** indennità e straordinari
- 📅 **Gestione turni e licenze** complete
- 📚 **Knowledge base integrata** con documenti
- 📊 **Analytics e reporting** in tempo reale
- 🔄 **Sincronizzazione automatica** e backup
- 📱 **Notifiche push** native
- 🔒 **Gestione ruoli avanzata** con RLS
- 🌐 **Sistema multiutente** scalabile

---

## 🛠️ Architettura del Sistema

### **🗄️ Database Supabase**

#### **Configurazione:**
```

---

## 🚀 Setup del Progetto

### **1. Configurazione Supabase**

#### **Variabili d'Ambiente:**
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://[IL-TUO-PROGETTO].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ[LA-TUA-ANON-KEY]...
SUPABASE_SERVICE_ROLE_KEY=eyJ[LA-TUA-SERVICE-KEY]...
```

#### **Configurazione Client:**
```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
```

### **2. Database Setup**

#### **Creazione Tabelle:**
Le 37 tabelle sono già configurate con:
- ✅ **UUID Primary Keys** con `gen_random_uuid()`
- ✅ **RLS Policies** per sicurezza
- ✅ **Indexes ottimizzati** per performance
- ✅ **Triggers automatici** per timestamp
- ✅ **Foreign Keys** per integrità referenziale

#### **Popolazione Dati Iniziali:**
```sql
-- Primo amministratore
INSERT INTO user_profiles (
    user_id, email, full_name, role, stato
) VALUES (
    '[UUID_UTENTE_AUTH]',
    'admin@sindacato.it',
    'Amministratore Sistema',
    'DIRIGENTE',
    'ATTIVO'
);
```

### **3. Deploy**

#### **Su Vercel (Consigliato):**
```bash
# 1. Push su GitHub
git add .
git commit -m "Initial commit"
git push origin main

# 2. Deploy su Vercel
vercel --prod

# 3. Configura variabili ambiente su Vercel Dashboard
```

#### **Su Netlify:**
```bash
# netlify.toml
[build]
  publish = "out"
  command = "npm run build && npm run export"

[build.environment]
  NODE_VERSION = "18"
```

---

## 👥 Sistema dei Ruoli

### **Ruoli Disponibili:**

#### **🔵 USER (Utente Standard):**
- Visualizzazione tessera digitale
- Richieste personali
- Accesso documenti pubblici
- Gestione profilo personale
- Calcolo indennità personali
- Visualizzazione turni assegnati

#### **🟡 DIRIGENTE (Amministratore):**
- **Tutte le funzionalità USER** +
- Dashboard dirigenziale completa
- Gestione richieste utenti
- Analytics e reporting
- Gestione tessere
- Calcoli per tutti gli utenti
- Gestione turni e licenze
- Amministrazione knowledge base
- Accesso ai backup

#### **🔴 ADMIN (Super Amministratore):**
- **Tutte le funzionalità DIRIGENTE** +
- Gestione utenti e ruoli
- Configurazioni sistema
- Accesso logs completi
- Gestione webhook
- Controllo backup e sync

### **Promozione Primo Amministratore:**

1. **Registra un utente normale** nell'app
2. **Accedi a Supabase Dashboard**
3. Vai alla tabella **`user_profiles`**
4. Trova il tuo utente e modifica:
   ```sql
   UPDATE user_profiles 
   SET role = 'DIRIGENTE' 
   WHERE email = 'tua-email@example.com';
   ```
5. **Logout e Login** per aggiornare i privilegi

---

## 📱 Funzionalità Principali

### **🎫 Tessere Digitali Avanzate:**
- **Generazione automatica** numero tessera univoco
- **QR Code integrato** per validazione
- **Foto tessera** uploadable
- **Scadenza automatica** (1 anno dalla emissione)
- **Stati dinamici:** ATTIVA, SCADUTA, SOSPESA
- **Tipi personalizzabili:** STANDARD, PREMIUM, DIRIGENTE

### **💰 Calcoli Automatici:**
- **Indennità personalizzate** per ruolo
- **Straordinari automatici** con tariffe
- **Recuperi e compensi** tracciati
- **Report PDF** esportabili
- **Storico completo** per audit

### **📅 Gestione Turni e Licenze:**
- **Pianificazione turni** avanzata
- **Gestione permessi** con saldi
- **Licenze residue** automatiche
- **Configurazioni personali** flessibili
- **Notifiche automatiche** scadenze

### **📚 Knowledge Base Intelligente:**
- **Documenti categorizzati** e indicizzati
- **Ricerca full-text** avanzata
- **Chunk processing** per AI
- **Progress tracking** utenti
- **Bookmarks personali**

### **📊 Analytics Enterprise:**
- **Dashboard real-time** per dirigenti
- **Metriche personalizzate** per reparto
- **Report automatici** schedulati
- **Export dati** in formato Excel/PDF
- **Tracking eventi** dettagliato

---

## 🔧 Struttura Files

```
sistema-sindacale/
│
├── pages/                     # Next.js pages
│   ├── index.js              # Landing page
│   ├── auth.js               # Autenticazione
│   ├── dashboard.js          # Dashboard utenti
│   ├── dirigenti.js          # Dashboard dirigenti
│   ├── tessera.js            # Tessera digitale
│   ├── richieste.js          # Sistema richieste
│   ├── calcoli.js            # Calcoli stipendiali
│   ├── turni.js              # Gestione turni
│   ├── knowledge.js          # Knowledge base
│   └── api/                  # API routes
│       ├── auth/             # Autenticazione
│       ├── calcoli/          # Calcoli
│       ├── tessere/          # Tessere
│       └── reports/          # Report
│
├── components/               # Componenti React
│   ├── layout/              # Layout components
│   ├── auth/                # Auth components
│   ├── dashboard/           # Dashboard components
│   ├── tessera/             # Tessera components
│   └── forms/               # Form components
│
├── lib/                     # Utilities
│   ├── supabase.js          # Client Supabase
│   ├── auth.js              # Auth helpers
│   ├── calculations.js      # Logiche calcoli
│   └── utils.js             # Utilities generali
│
├── public/                  # Static assets
│   ├── icons/               # PWA icons
│   ├── images/              # Immagini
│   └── documents/           # Documenti pubblici
│
├── styles/                  # Styling
│   ├── globals.css          # Global styles
│   └── components/          # Component styles
│
├── .env.local               # Variabili ambiente
├── next.config.js           # Configurazione Next.js
├── package.json             # Dependencies
└── README.md                # Questa documentazione
```

---

## 🔒 Sicurezza e Backup

### **🛡️ Misure di Sicurezza:**
- ✅ **Row Level Security (RLS)** su tutte le tabelle
- ✅ **Autenticazione robusta** con Supabase Auth
- ✅ **Validazione input** lato client e server
- ✅ **Rate limiting** automatico
- ✅ **Audit logs** completi
- ✅ **Headers di sicurezza** configurati
- ✅ **HTTPS obbligatorio** su tutti gli endpoint

### **🔄 Sistema Backup:**
- **Backup automatici** ogni 6 ore
- **Versioning** dei documenti
- **Sync logs** dettagliati
- **Recovery point** configurabili
- **Monitoring** stato sincronizzazione

### **📊 Monitoring e Logs:**
- **System logs** completi
- **Analytics events** tracciati
- **Webhook debugging** integrato
- **Performance monitoring** real-time
- **Error tracking** automatico

---

## 🆘 Troubleshooting

### **Errori Comuni:**

**❌ "Row Level Security violated"**
```bash
Soluzione: Verifica che l'utente abbia il ruolo corretto e le policy RLS siano configurate
```

**❌ "Invalid API key"**
```bash
Soluzione: Controlla che NEXT_PUBLIC_SUPABASE_ANON_KEY sia configurata correttamente
```

**❌ "Column not found"**
```bash
Soluzione: Verifica che tutte le migrazioni siano state applicate al database
```

**❌ "Permission denied for schema public"**
```bash
Soluzione: Controlla i permessi del ruolo postgres e le policy RLS
```

### **Debug Mode:**
```javascript
// Abilita debug mode in console
localStorage.setItem('DEBUG_MODE', 'true');
localStorage.setItem('SUPABASE_DEBUG', 'true');
location.reload();
```

### **Verifica Sistema:**
```sql
-- Controllo tabelle
SELECT COUNT(*) as tabelle_totali 
FROM information_schema.tables 
WHERE table_schema = 'public';

-- Controllo RLS
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false;

-- Controllo utenti
SELECT role, COUNT(*) as utenti 
FROM user_profiles 
GROUP BY role;
```

---

## 📞 Supporto

### **Contatti Tecnici:**
- 📧 **Email:** tech@sindacato.it
- 🌐 **Website:** [sistema.sindacato.it](https://sistema.sindacato.it)
- 📱 **GitHub:** [github.com/sindacato/sistema](https://github.com/sindacato/sistema)
- ☎️ **Telefono:** +39 06 123 456 789

### **Documentazione:**
- 📖 **Manuale Utente:** [docs.sindacato.it/user](https://docs.sindacato.it/user)
- 👨‍💼 **Manuale Dirigenti:** [docs.sindacato.it/admin](https://docs.sindacato.it/admin)
- 🛠️ **API Documentation:** [api.sindacato.it](https://api.sindacato.it)

---

## 🎯 Roadmap

### **🚀 v2.0 - Prossimi Sviluppi:**
- [ ] **App mobile nativa** (React Native)
- [ ] **Integrazione AI** per assistenza automatica
- [ ] **Sistema chat** interno
- [ ] **Pagamenti digitali** integrati
- [ ] **Firma digitale** documenti
- [ ] **Geolocalizzazione** per presenze

### **📈 v2.1 - Advanced Features:**
- [ ] **Dashboard BI** con grafici avanzati
- [ ] **API pubbliche** per integrazioni
- [ ] **Multi-tenant** per più sindacati
- [ ] **Integrazione SPID** per autenticazione
- [ ] **Machine Learning** per previsioni
- [ ] **Blockchain** per certificazioni

### **🌍 v2.2 - Scale Up:**
- [ ] **Multi-lingua** (English, Français)
- [ ] **Federazione sindacati** multi-ente
- [ ] **Marketplace servizi** integrato
- [ ] **Integration hub** con sistemi esterni
- [ ] **Advanced analytics** con AI
- [ ] **Compliance GDPR** automatizzata

---

## 📜 Licenza

© 2025 Sistema Sindacale. Tutti i diritti riservati.

**Software proprietario - Uso riservato esclusivamente ai membri autorizzati del sindacato.**

### **🔒 Termini di Utilizzo:**
- Accesso limitato ai membri tesserati
- Divieto di redistribuzione del codice
- Protezione dati personali secondo GDPR
- Backup e sicurezza garantiti
- Supporto tecnico incluso

---

## 🏆 Credits

**Sviluppato con:**
- ⚡ **Next.js** - Framework React
- 🗄️ **Supabase** - Backend as a Service
- 🎨 **Tailwind CSS** - Styling framework
- 📱 **PWA** - Progressive Web App
- 🔒 **Row Level Security** - Sicurezza dati
- 📊 **Analytics** - Tracking avanzato

**Team di Sviluppo:**
- 👨‍💻 **Lead Developer** - Sistema core e architettura
- 🎨 **UI/UX Designer** - Interfaccia e esperienza utente  
- 📊 **Data Analyst** - Analytics e reporting
- 🔒 **Security Expert** - Sicurezza e compliance

---

**🎯 Sistema Sindacale - La gestione sindacale del futuro, oggi!**javascript
const supabaseConfig = {
    url: 'https://[IL-TUO-PROGETTO].supabase.co',
    anonKey: 'eyJ[LA-TUA-ANON-KEY]...',
    serviceKey: 'eyJ[LA-TUA-SERVICE-KEY]...' // Solo per operazioni admin
};
```

#### **Database Schema - 37 Tabelle:**

**👥 Gestione Utenti:**
- `user_profiles` - Profili utenti completi con anagrafica
- `tessere` - Tessere sindacali digitali
- `organico_dirigentisindacali` - Dirigenti e ruoli

**💰 Gestione Economica:**
- `calcoli_indennita` - Calcoli automatici indennità
- `calcoli_straordinario` - Gestione straordinari
- `recuperi` - Gestione recuperi e compensi

**📅 Gestione Tempo:**
- `turni` - Pianificazione turni di lavoro
- `licenze` - Gestione permessi e licenze
- `gestione_licenze_residue` - Residui e saldi
- `user_license_config` - Configurazioni personali

**📋 Sistema Richieste:**
- `richieste_personali` - Richieste utenti standard
- `richieste_per_dirigenti` - Richieste dirigenziali
- `richieste_messaggi` - Comunicazioni
- `richieste_log` - Log delle operazioni

**📚 Knowledge Base:**
- `knowledge_documents` - Documenti della base di conoscenza
- `knowledge_chunks` - Sezioni indicizzate
- `learning_resources` - Risorse formative
- `user_bookmarks` - Segnalibri personali
- `user_progress` - Progresso apprendimento

**📄 Documenti:**
- `documenti` - Gestione documenti
- `documents` - Documenti alternativi
- `documents_stats` - Statistiche documenti
- `documents_summary` - Riassunti automatici
- `download_links`
