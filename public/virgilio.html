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
            Ciao! Sono <strong>Virgilio</strong>. Fai una domanda su contratti, diritti, concorsi, disciplina, ferie e molto altro.
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
        <p>Per l’elenco aggiornato dei dirigenti del Sindacato Carabinieri, apri la pagina ufficiale:</p>
        <p><a class="cta" href="${DIRIGENTI_URL}" target="_blank" rel="noopener">Apri la pagina Dirigenti</a></p>
      `;
      addBubble(html,'bot',{raw:true});
    }

    function isDirigentiQuery(text){
      const x=(text||'').toLowerCase();
      return /\bdirigent/i.test(x) || /contatti.*dirigent/i.test(x);
    }

    help.addEventListener('click',()=>{
      addBubble('Posso aiutarti su: disciplina, ferie/permessi, stipendi, concorsi, pensioni, codici e regolamenti. Scrivi: "Come funzionano i permessi per malattia?"','bot');
    });

    clear.addEventListener('click',()=>{
      if(!confirm('Cancellare la conversazione?')) return;
      msgs.innerHTML='';
      msgs.insertAdjacentHTML('beforeend', `
        <div class="row">
          <div class="av av-bot">🤖</div>
          <div class="bub b-bot">
            Ciao! Sono <strong>Virgilio</strong>. Fai una domanda su contratti, diritti, concorsi, disciplina, ferie e molto altro.
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

      const body = {
        messages: history.slice(-10),
        model: 'gpt-4o-mini',
        max_tokens: 600,
        temperature: 0.3,
        system_context: 'Sei Virgilio, assistente AI del Sindacato Carabinieri. Rispondi in modo chiaro e professionale.'
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
          const msg = j?.choices?.[0]?.message?.content || 'Nessuna risposta.';
          addBubble(msg,'bot',{raw:true});
          history.push({role:'assistant',content:msg});
          if(j?.usage?.total_tokens){ totalTokens+=j.usage.total_tokens; tok.textContent=totalTokens.toLocaleString(); }
        }
      }catch(e){
        console.error(e);
        addBubble('Problema di rete. Verifica la connessione e riprova.','bot');
      }finally{
        setTyping(false); isProcessing=false; sendBtn.disabled=false; inp.focus();
      }
    }

    // Init: richiede login ma non stampa messaggi “di servizio”
    (async ()=>{ await mustBeLoggedIn(); })();
  </script>
</body>
</html>
