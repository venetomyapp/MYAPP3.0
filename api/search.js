<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes, maximum-scale=5.0"/>
  <title>Virgilio - MyApp</title>

  <!-- Favicon: robottino -->
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='30' fill='%23e94560'/%3E%3Ccircle cx='22' cy='26' r='3' fill='white'/%3E%3Ccircle cx='42' cy='26' r='3' fill='white'/%3E%3Crect x='28' y='35' width='8' height='4' rx='2' fill='white'/%3E%3Cpath d='M20 45 Q32 50 44 45' stroke='white' stroke-width='2' fill='none'/%3E%3Crect x='15' y='12' width='6' height='8' rx='3' fill='%2300d4ff'/%3E%3Crect x='43' y='12' width='6' height='8' rx='3' fill='%2300d4ff'/%3E%3C/svg%3E">

  <!-- Tailwind (dev/test) -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    if (typeof tailwind !== 'undefined') {
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              aurora: '#e94560'
            }
          }
        }
      };
    }
  </script>

  <style>
    :root{
      --gradient: linear-gradient(135deg,#1a1a2e 0%,#16213e 25%,#0f3460 50%,#e94560 75%,#00d4ff 100%);
      --header-h: 60px;
      --safe-top: env(safe-area-inset-top);
      --safe-bottom: env(safe-area-inset-bottom);
    }
    body{
      min-height:100vh;background:var(--gradient);background-size:400% 400%;
      animation:bg 30s ease infinite;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif
    }
    @keyframes bg{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
    .header{position:sticky;top:0;height:var(--header-h);padding-top:var(--safe-top);
      background:rgba(255,255,255,.08);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,.12)}
    .chat{background:#fff;border-radius:18px;box-shadow:0 8px 25px rgba(0,0,0,.15);
      max-width:960px;margin:.75rem auto;height:calc(100vh - var(--header-h) - var(--safe-top) - var(--safe-bottom) - 1.5rem);
      display:flex;flex-direction:column;overflow:hidden}
    .msgs{flex:1;overflow:auto;padding:1rem}
    .row{display:flex;gap:.75rem;margin-bottom:1rem;animation:fade .2s ease}
    @keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    .av{width:38px;height:38px;border-radius:9999px;display:grid;place-items:center;color:#fff;flex:0 0 38px}
    .av-bot{background:linear-gradient(135deg,#00d4ff,#03dac6)}
    .av-user{background:linear-gradient(135deg,#e94560,#ff006e)}
    .bub{max-width:78%;padding:1rem;border-radius:14px}
    .b-bot{background:#f8fbff}
    .b-user{background:linear-gradient(135deg,#e94560,#ff006e);color:#fff;margin-left:auto}
    .time{font-size:.75rem;opacity:.6;margin-top:.35rem}
    .cta{display:inline-block;background:#111827;color:#fff!important;padding:.75rem 1rem;border-radius:.75rem;
      font-weight:700;margin-top:.5rem;text-decoration:none}
    .cta:hover{opacity:.9}
    .dots{display:flex;gap:.4rem}
    .dot{width:8px;height:8px;border-radius:9999px;background:#9ca3af;animation:b 1.4s infinite}
    .dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}
    @keyframes b{0%,80%,100%{transform:none}40%{transform:translateY(-6px)}}
    @media (max-width:640px){.chat{margin:.5rem;height:calc(100vh - var(--header-h) - var(--safe-top) - var(--safe-bottom) - 1rem)}.bub{max-width:90%}}
  </style>
</head>
<body>
  <!-- Header -->
  <header class="header">
    <div class="max-w-5xl mx-auto px-4 h-full flex items-center justify-between">
      <div class="flex items-center gap-3">
        <button onclick="history.back()" class="rounded-xl px-2 py-2 border border-white/30 text-white hover:bg-white/10" type="button" aria-label="Indietro">⟵</button>
        <h1 class="text-white font-semibold">Virgilio</h1>
      </div>
      <div class="flex items-center gap-2">
        <button id="clear" class="px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm border border-white/20 hover:bg-white/20" type="button">🗑️ Pulisci</button>
        <button id="help" class="px-3 py-1.5 rounded-lg bg-white/10 text-white text-sm border border-white/20 hover:bg-white/20" type="button">❓ Aiuto</button>
      </div>
    </div>
  </header>

  <main class="py-3">
    <div class="chat">
      <div class="bg-gradient-to-r from-aurora to-cyan-400 text-white px-4 py-4 text-center">
        <div class="flex items-center justify-center gap-3">
          <div class="w-11 h-11 bg-white/25 rounded-full grid place-items-center text-2xl">🤖</div>
          <div class="text-left">
            <div class="font-bold text-xl">Virgilio</div>
            <div class="text-sm opacity-90">Assistente sindacale AI</div>
          </div>
        </div>
      </div>

      <div id="msgs" class="msgs" role="log" aria-live="polite">
        <div class="row">
          <div class="av av-bot">🤖</div>
          <div class="bub b-bot">
            Ciao! Sono <strong>Virgilio Avanzato</strong>. Ora posso leggere i tuoi documenti TXT in modo minuzioso e selettivo! 📋<br>
            Fai una domanda su contratti, diritti, concorsi, disciplina, ferie e molto altro.<br>
            <em style="font-size: 0.9em; opacity: 0.8;">🎯 Prova "🎯 Demo Ricerca" per vedere le mie nuove capacità!</em>
            <div class="time">Ora</div>
          </div>
        </div>
      </div>

      <!-- typing -->
      <div id="typing" class="px-4 py-2 hidden">
        <div class="row">
          <div class="av av-bot">🤖</div>
          <div class="bub b-bot"><div class="dots"><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>
        </div>
      </div>

      <!-- Input -->
      <div class="p-3 border-t bg-gray-50">
        <div class="max-w-3xl mx-auto flex gap-2">
          <textarea id="inp" rows="1" maxlength="500" class="flex-1 rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-aurora" placeholder="✨ Scrivi la tua domanda…"></textarea>
          <button id="send" class="rounded-xl bg-aurora text-white px-4 py-2 font-semibold disabled:opacity-50" disabled>Invia</button>
        </div>
      </div>

      <div class="px-4 py-2 text-xs text-gray-500 border-t flex items-center justify-between">
        <div id="conn">Connesso</div>
        <div>Token: <span id="tok">0</span> • Caratteri: <span id="chars">0</span>/500</div>
      </div>
    </div>
  </main>

  <script type="module">
    import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

    // Supabase (login obbligatorio)
    const supabase = createClient(
      'https://pvzdilkozpspsnepedqc.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB2emRpbGtvenBzcHNuZXBlZHFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDY1NDUsImV4cCI6MjA3MDA4MjU0NX0.JimqeUkyOGcOw-pt-yJUVevSP3n6ikBPDR3N8y_7YIk',
      { auth: { persistSession:true, autoRefreshToken:true } }
    );

    const API_CHAT = '/api/chat';
    const DIRIGENTI_URL = `${window.location.origin}/dirigenti.html`;

    const msgs = document.getElementById('msgs');
    const typing = document.getElementById('typing');
    const inp = document.getElementById('inp');
    const sendBtn = document.getElementById('send');
    const tok = document.getElementById('tok');
    const chars = document.getElementById('chars');
    const conn = document.getElementById('conn');
    const help = document.getElementById('help');
    const clear = document.getElementById('clear');

    let isProcessing=false, totalTokens=0, history=[];

    const timeNow = () => new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});

    // ===== INTEGRAZIONE R2 - INIZIO =====
    
    // Ricerca nei documenti R2
    async function searchR2Documents(query) {
      try {
        const url = `/api/search?q=${encodeURIComponent(query)}`;
        addDebugMessage(`🌐 Chiamata: ${url}`);
        
        const response = await fetch(url);
        addDebugMessage(`📡 Status: ${response.status} ${response.statusText}`);
        
        const data = await response.json();
        addDebugMessage(`📦 Dati ricevuti: ${JSON.stringify(data).substring(0, 200)}...`);
        
        if (!response.ok) {
          addDebugMessage(`❌ Errore API: ${data.error || 'Errore sconosciuto'}`, 'error');
          return null;
        }
        
        return data;
      } catch (e) {
        addDebugMessage(`❌ Errore rete: ${e.message}`, 'error');
        return null;
      }
    }

    // Legge documento specifico
    async function readR2Document(fileName) {
      try {
        const url = `/api/read?key=${encodeURIComponent(fileName)}`;
        addDebugMessage(`📖 Leggo: ${url}`);
        
        const response = await fetch(url);
        addDebugMessage(`📡 Read Status: ${response.status}`);
        
        const data = await response.json();
        
        if (!response.ok) {
          addDebugMessage(`❌ Errore lettura: ${data.error}`, 'error');
          return null;
        }
        
        addDebugMessage(`✅ File letto: ${data.content?.length || 0} caratteri`, 'success');
        return data;
      } catch (e) {
        addDebugMessage(`❌ Errore rete lettura: ${e.message}`, 'error');
        return null;
      }
    }

    // Estrae testo da PDF
    async function extractPDFContent(fileName) {
      try {
        const url = `/api/pdf-extract?fileName=${encodeURIComponent(fileName)}`;
        addDebugMessage(`📄 Estraggo testo da PDF: ${fileName}`);
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (!response.ok) {
          addDebugMessage(`❌ Errore estrazione PDF: ${data.error}`, 'error');
          return null;
        }
        
        addDebugMessage(`✅ PDF estratto: ${data.totalLength} caratteri, ${data.chunksCount} sezioni`, 'success');
        return data;
      } catch (e) {
        addDebugMessage(`❌ Errore rete estrazione PDF: ${e.message}`, 'error');
        return null;
      }
    }
    async function searchWeb(query) {
      try {
        const response = await fetch('/api/web-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: query + ' sindacato carabinieri normativa' })
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data;
      } catch (e) {
        console.error('Errore ricerca web:', e);
        return null;
      }
    }

    // Rileva se la domanda richiede ricerca documenti
    function needsDocumentSearch(text) {
      const keywords = [
        // Termini normativi
        'decreto', 'legge', 'normativa', 'regolamento', 'circolare',
        'disposizione', 'ordinanza', 'delibera', 'documento', 'testo',
        'articolo', 'comma', 'capitolo', 'sezione', 'allegato',
        
        // Termini specifici carabinieri
        'veterano', 'missioni', 'internazionali', 'difesa', 'status',
        'arma', 'carabinieri', 'militare', 'personale', 'servizio',
        
        // Termini amministrativi
        'ferie', 'licenze', 'permessi', 'congedi', 'assenze',
        'giorni', 'spettanti', 'diritto', 'dovere', 'stipendio',
        'retribuzione', 'benefit', 'benefici', 'indennità',
        
        // Procedure e moduli
        'domanda', 'richiesta', 'procedura', 'modulo', 'istanza',
        'documentazione', 'certificato', 'attestato',
        
        // Disciplina e carriera
        'disciplina', 'sanzioni', 'procedimento', 'concorso',
        'promozione', 'avanzamento', 'carriera', 'grado',
        
        // Codici specifici
        'codice', 'ordinamento', 'com', 'testo', 'unico'
      ];
      
      const textLower = text.toLowerCase();
      const foundKeywords = keywords.filter(keyword => textLower.includes(keyword));
      
      console.log(`🔍 Analisi keywords per: "${text}"`);
      console.log(`📝 Keywords trovate: ${foundKeywords.join(', ')}`);
      
      return foundKeywords.length > 0;
    }

    // Estrae parole chiave con algoritmo migliorato
    function extractSearchKeywords(text) {
      const stopWords = ['il', 'la', 'di', 'che', 'e', 'un', 'una', 'per', 'del', 'dei', 'delle', 'cosa', 'come', 'quando', 'dove', 'perché', 'sono', 'hai', 'hanno', 'questo', 'questa', 'nel', 'con', 'su', 'da', 'le', 'gli', 'alla', 'dello', 'nella'];
      
      const words = text.toLowerCase()
        .replace(/[^\w\sàèéìíîòóù]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2 && !stopWords.includes(word));
      
      // Termini tecnici/normativi prioritari
      const technicalTerms = words.filter(word => 
        /^(decreto|legge|articolo|art|comma|normativa|regolamento|disposizione|circolare|veterano|status|missioni|internazionali|difesa|benefici|requisiti|procedura|domanda|ferie|licenze|permessi|congedi|giorni|spettanti|diritto|arma|carabinieri|militare|personale|servizio|stipendio|retribuzione|indennità|disciplina|sanzioni|concorso|promozione|avanzamento|carriera|grado|codice|ordinamento|com|testo|unico)/.test(word)
      );
      
      // Combina termini tecnici + parole normali
      const allKeywords = [...technicalTerms, ...words.filter(w => !technicalTerms.includes(w))];
      const uniqueKeywords = [...new Set(allKeywords)].slice(0, 5); // Aumentato a 5 keywords
      
      console.log(`🎯 Keywords estratte: ${uniqueKeywords.join(', ')}`);
      if (technicalTerms.length > 0) {
        console.log(`⚡ Termini tecnici prioritari: ${technicalTerms.join(', ')}`);
      }
      
      return uniqueKeywords;
    }

    // Estrae sezioni rilevanti da un documento TXT
    function extractRelevantSections(content, keywords, userMessage) {
      const sections = content.split(/\n\s*\n/).filter(section => section.trim().length > 50);
      const relevantSections = [];
      
      sections.forEach((section, index) => {
        let sectionScore = 0;
        const sectionLower = section.toLowerCase();
        const matchedKeywords = [];
        
        // Punteggio per keywords principali
        keywords.forEach(keyword => {
          const keywordLower = keyword.toLowerCase();
          const keywordCount = (sectionLower.match(new RegExp(keywordLower, 'g')) || []).length;
          if (keywordCount > 0) {
            sectionScore += keywordCount * 15; // Aumentato punteggio
            matchedKeywords.push(keyword);
          }
        });
        
        // Punteggio per parole dal messaggio utente
        const userWords = userMessage.toLowerCase().split(/\s+/).filter(word => word.length > 3);
        userWords.forEach(word => {
          if (sectionLower.includes(word)) {
            sectionScore += 8; // Aumentato
          }
        });
        
        // Punteggio alto per struttura normativa
        const structureKeywords = [
          'articolo', 'art.', 'capitolo', 'cap.', 'comma', 'disposizione', 
          'decreto', 'legge', 'regolamento', 'circolare', 'punto', 'paragrafo'
        ];
        structureKeywords.forEach(struct => {
          if (sectionLower.includes(struct)) {
            sectionScore += 12; // Aumentato
          }
        });
        
        // Punteggio specifico per termini amministrativi
        const adminKeywords = [
          'ferie', 'licenze', 'permessi', 'congedi', 'giorni', 'spettanti',
          'diritto', 'benefici', 'indennità', 'retribuzione', 'stipendio'
        ];
        adminKeywords.forEach(admin => {
          if (sectionLower.includes(admin)) {
            sectionScore += 18; // Punteggio molto alto per questi termini
          }
        });
        
        // Punteggio per numeri (giorni, articoli, date)
        const numberMatches = section.match(/\b\d+\b/g);
        if (numberMatches && numberMatches.length > 0) {
          sectionScore += Math.min(numberMatches.length * 3, 15);
        }
        
        // Soglia più bassa per includere più sezioni
        if (sectionScore > 8) {
          relevantSections.push({
            content: section.trim(),
            score: sectionScore,
            matchedKeywords,
            index
          });
        }
      });
      
      relevantSections.sort((a, b) => b.score - a.score);
      return relevantSections.slice(0, 6); // Aumentato a 6 sezioni
    }

    // Cerca nei documenti R2 con algoritmo intelligente
    async function prepareDocumentContext(userMessage) {
      const keywords = extractSearchKeywords(userMessage);
      let documentContext = '';
      let sourceInfo = '';
      let foundInDocuments = false;
      
      const searchResults = [];
      
      // Ricerca multi-keyword con scoring
      for (const keyword of keywords) {
        try {
          const searchResult = await searchR2Documents(keyword);
          
          if (searchResult?.results?.length > 0) {
            foundInDocuments = true;
            
            for (const result of searchResult.results) {
              const existingResult = searchResults.find(r => r.key === result.key);
              if (existingResult) {
                existingResult.score += 1;
                existingResult.keywords.push(keyword);
              } else {
                searchResults.push({
                  ...result,
                  score: 1,
                  keywords: [keyword],
                  searchKeyword: keyword
                });
              }
            }
          }
        } catch (searchError) {
          console.error(`Errore ricerca ${keyword}:`, searchError);
        }
      }
      
      // Ordina per rilevanza
      searchResults.sort((a, b) => {
        if (a.score !== b.score) return b.score - a.score;
        if (a.key.endsWith('.txt') && !b.key.endsWith('.txt')) return -1;
        if (!a.key.endsWith('.txt') && b.key.endsWith('.txt')) return 1;
        return (b.size || 0) - (a.size || 0);
      });
      
      // Elabora i migliori risultati
      for (const result of searchResults.slice(0, 3)) {
        if (result.key.endsWith('.txt') || result.key.endsWith('.md')) {
          try {
            const doc = await readR2Document(result.key);
            
            if (doc?.content) {
              const relevantSections = extractRelevantSections(doc.content, result.keywords, userMessage);
              
              if (relevantSections.length > 0) {
                documentContext += `\n\n--- DOCUMENTO: ${result.key} (Rilevanza: ${result.score}) ---\n`;
                
                relevantSections.forEach((section, index) => {
                  documentContext += `\n[SEZIONE ${index + 1}]\n${section.content}\n`;
                });
                
                sourceInfo += `📄 ${result.key} (${relevantSections.length} sezioni rilevanti)\n`;
              } else {
                const preview = doc.content.substring(0, 1500);
                documentContext += `\n\n--- DOCUMENTO: ${result.key} ---\n${preview}`;
                sourceInfo += `📄 ${result.key} (anteprima)\n`;
              }
            }
          } catch (readError) {
            console.error(`Errore lettura ${result.key}:`, readError);
          }
        }
        else if (result.key.endsWith('.pdf')) {
          documentContext += `\n\n--- DOCUMENTO PDF: ${result.key} ---\n`;
          documentContext += `Documento ufficiale disponibile. Keywords trovate: ${result.keywords.join(', ')}`;
          sourceInfo += `📄 ${result.key} (PDF)\n`;
        }
      }
      
      // Fallback ricerca web
      if (!foundInDocuments) {
        try {
          const webResult = await searchWeb(userMessage);
          if (webResult?.results?.length > 0) {
            documentContext += '\n\n--- INFORMAZIONI WEB ---\n';
            webResult.results.slice(0, 2).forEach(result => {
              documentContext += `${result.title}: ${result.snippet}\n`;
            });
            sourceInfo = 'Fonte: Ricerca web';
          }
        } catch (webError) {
          console.error('Errore ricerca web:', webError);
        }
      }
      
      return { context: documentContext.trim(), sourceInfo, foundInDocuments };
    }

    // ===== INTEGRAZIONE R2 - FINE =====

    function addBubble(html, who='bot', {raw=false}={}){
      const row = document.createElement('div');
      row.className='row';
      const av=document.createElement('div');
      av.className=`av ${who==='user'?'av-user':'av-bot'}`;
      av.textContent = who==='user'?'👤':'🤖';
      const bub=document.createElement('div');
      bub.className=`bub ${who==='user'?'b-user':'b-bot'}`;
      if(raw){ bub.innerHTML=html } else { bub.textContent=html }
      const t=document.createElement('div'); t.className='time'; t.textContent=timeNow();
      bub.appendChild(t);
      row.appendChild(av); row.appendChild(bub);
      msgs.appendChild(row); msgs.scrollTop = msgs.scrollHeight;
    }
    function setTyping(v){ typing.classList.toggle('hidden', !v); msgs.scrollTop=msgs.scrollHeight; }
    function setConn(v){ conn.textContent = v ? 'Connesso' : 'Offline'; }
    window.addEventListener('online',()=>setConn(true));
    window.addEventListener('offline',()=>setConn(false));

    // CTA Dirigenti come MESSAGGIO BOT (avatar 🤖, bubble chiara)
    function addDirigentiCTA(){
      const html = `
        <p>Per l'elenco aggiornato dei dirigenti del Sindacato Carabinieri, apri la pagina ufficiale:</p>
        <p><a class="cta" href="${DIRIGENTI_URL}" target="_blank" rel="noopener">Apri la pagina Dirigenti</a></p>
      `;
      addBubble(html,'bot',{raw:true});
    }

    function isDirigentiQuery(text){
      const x=(text||'').toLowerCase();
      return /\bdirigent/i.test(x) || /contatti.*dirigent/i.test(x);
    }

    help.addEventListener('click',()=>{
      addBubble('🎯 <strong>Virgilio Avanzato</strong> ora legge i tuoi documenti TXT in modo minuzioso! Posso aiutarti su: disciplina, ferie/permessi, stipendi, concorsi, pensioni, codici e regolamenti.<br><br>📋 <strong>Funzionalità:</strong><br>• Ricerca intelligente multi-keyword<br>• Estrazione sezioni rilevanti<br>• Analisi del contenuto<br><br>💬 Prova: "decreto veterani" o "status di veterano"<br><br>🔍 <strong>Test ricerca ferie:</strong> Prova "quanti giorni di ferie spettano"','bot', {raw: true});
    });

    clear.addEventListener('click',()=>{
      if(!confirm('Cancellare la conversazione?')) return;
      msgs.innerHTML='';
      msgs.insertAdjacentHTML('beforeend', `
        <div class="row">
          <div class="av av-bot">🤖</div>
          <div class="bub b-bot">
            Ciao! Sono <strong>Virgilio Avanzato</strong>. Ora posso leggere i tuoi documenti TXT in modo minuzioso e selettivo! 📋<br>
            Fai una domanda su contratti, diritti, concorsi, disciplina, ferie e molto altro.
            <div class="time">${timeNow()}</div>
          </div>
        </div>
      `);
      history=[]; totalTokens=0; tok.textContent='0';
    });

    inp.addEventListener('input',()=>{
      chars.textContent=inp.value.length;
      sendBtn.disabled = !inp.value.trim() || isProcessing;
      inp.style.height='auto'; inp.style.height=Math.min(inp.scrollHeight,120)+'px';
    });
    inp.addEventListener('keydown',e=>{
      if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send(); }
    });
    sendBtn.addEventListener('click',send);

    async function mustBeLoggedIn(){
      const { data:{ session } } = await supabase.auth.getSession();
      if(!session){ window.location.href = '../login.html'; return null; }
      return session;
    }

    async function send(){
      const text = inp.value.trim();
      if(!text || isProcessing) return;

      isProcessing=true; sendBtn.disabled=true;
      addBubble(text,'user');
      history.push({role:'user',content:text});
      inp.value=''; chars.textContent='0'; inp.style.height='auto';

      if(isDirigentiQuery(text)){
        addDirigentiCTA();
        isProcessing=false; sendBtn.disabled=false; return;
      }

      const session = await mustBeLoggedIn(); if(!session) return;

      // ===== INTEGRAZIONE R2 - MODIFICA ALLA FUNZIONE SEND =====
      
      let systemContext = 'Sei Virgilio, assistente AI del Sindacato Carabinieri. ISTRUZIONI OBBLIGATORIE:\n\n1. Rispondi SEMPRE in modo BREVE e GENERICO (massimo 2-3 frasi)\n2. NON fornire troppi dettagli specifici nella prima risposta\n3. Dai una risposta generale che stimoli l\'interazione\n4. Se usi documenti, menziona solo che "abbiamo documentazione specifica" senza dettagli\n5. NON includere mai l\'invito ai dirigenti nella risposta principale\n6. Le sezioni dei documenti che ricevi sono GIÀ le parti più rilevanti - usale come base per rispondere';
      
      // Se la domanda riguarda documenti, cerca in R2 e web
      const needsSearch = needsDocumentSearch(text);
      if (needsSearch) {
        const { context: documentContext, sourceInfo, foundInDocuments } = await prepareDocumentContext(text);
        
        if (documentContext) {
          if (foundInDocuments) {
            systemContext += '\n\nHai accesso a sezioni SELEZIONATE dai documenti ufficiali del Sindacato Carabinieri. Queste sono le parti più rilevanti per la domanda:\n' + documentContext;
            systemContext += '\n\nIMPORTANTE: Le sezioni fornite sono già filtrate per rilevanza. Rispondi in modo PRECISO e DIRETTO basandoti ESCLUSIVAMENTE su queste informazioni ufficiali. NON usare conoscenza generale. Se le informazioni non sono complete, dillo chiaramente.';
            
            // Rilevazione tema specifico
            const textLower = text.toLowerCase();
            if (textLower.includes('ferie') || textLower.includes('giorni') || textLower.includes('licenze') || textLower.includes('permessi')) {
              systemContext += '\n\nNOTA SPECIALE: Questa domanda riguarda ferie/licenze/permessi. Rispondi solo con le informazioni ESATTE contenute nei documenti ufficiali forniti.';
            }
          } else {
            systemContext += '\n\nNon ho trovato documenti ufficiali specifici per questa domanda. Rispondo con informazioni generali:\n' + documentContext;
            systemContext += '\n\nIMPORTANTE: Specifica che queste sono informazioni generali e raccomanda di verificare con i documenti ufficiali del sindacato.';
          }
        }
      }

      const body = {
        messages: history.slice(-10),
        model: 'gpt-4o-mini',
        max_tokens: 600,
        temperature: 0.3,
        system_context: systemContext
      };

      setTyping(true);
      try{
        const r = await fetch(API_CHAT,{
          method:'POST',
          headers:{'Content-Type':'application/json', Authorization:'Bearer '+session.access_token},
          body: JSON.stringify(body)
        });
        const j = await r.json();
        if(!r.ok){
          addBubble(j?.error || `Errore ${r.status}. Riprova tra poco.`,'bot');
        }else{
          let msg = j?.choices?.[0]?.message?.content || 'Nessuna risposta.';
          
          // Aggiungi la risposta principale
          addBubble(msg,'bot',{raw:true});
          history.push({role:'assistant',content:msg});
          
          // Aggiungi automaticamente la seconda bolla con invito ai dirigenti
          setTimeout(() => {
            const followUpMsg = `
              💡 <strong>Vuoi sapere di più sull'argomento?</strong><br>
              Non perdere l'occasione di contattare il tuo dirigente di zona!<br>
              <a class="cta" href="${DIRIGENTI_URL}" target="_blank" rel="noopener">Vai alla sezione Richieste</a>
            `;
            addBubble(followUpMsg, 'bot', {raw: true});
          }, 1500);
          
          if(j?.usage?.total_tokens){ totalTokens+=j.usage.total_tokens; tok.textContent=totalTokens.toLocaleString(); }
        }
      }catch(e){
        console.error(e);
        addBubble('Problema di rete. Verifica la connessione e riprova.','bot');
      }finally{
        setTyping(false); isProcessing=false; sendBtn.disabled=false; inp.focus();
      }
    }

    // Init: richiede login ma non stampa messaggi "di servizio"
    (async ()=>{ await mustBeLoggedIn(); })();
  </script>
</body>
</html>
