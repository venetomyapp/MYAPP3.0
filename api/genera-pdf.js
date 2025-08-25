// VERSIONE CORRETTA - Parsing multipart/form-data funzionante
module.exports = async function handler(req, res) {
  console.log("🚀 START genera-pdf API CORRETTA");
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  try {
    console.log("🔍 HEADERS RICEVUTI:");
    Object.keys(req.headers).forEach(key => {
      console.log(`  ${key}: ${req.headers[key]}`);
    });
    
    console.log("🔍 REQUEST METHOD:", req.method);
    console.log("🔍 REQUEST URL:", req.url);
    
    // Controlla se req.body esiste già (Vercel potrebbe fare pre-parsing)
    console.log("🔍 REQ.BODY TYPE:", typeof req.body);
    console.log("🔍 REQ.BODY:", req.body);
    
    // Parse dei dati del form
    let formData = {};
    
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      console.log("📦 Using pre-parsed body from Vercel...");
      formData = req.body;
    } else if (req.headers['content-type']?.includes('multipart/form-data')) {
      console.log("📦 Parsing multipart/form-data manually...");
      formData = await parseMultipartFormData(req);
    } else {
      console.log("📦 No parsing method available, using fallback...");
      formData = {};
    }
    
    console.log("📊 DATI ESTRATTI DAL FORM:");
    Object.keys(formData).forEach(key => {
      console.log(`  ${key}: "${formData[key]?.substring(0, 50)}${formData[key]?.length > 50 ? '...' : ''}"`);
    });
    console.log("📊 Totale campi estratti:", Object.keys(formData).length);

    // Estrai i dati con fallback per testing
    const datiCompilazione = {
      grado: formData.grado || "Car.",
      nome: formData.nome || "MARIO",
      cognome: formData.cognome || "ROSSI", 
      luogonascita: formData.luogonascita || "Roma",
      provincia: formData.provincia || "RM",
      datanascita: formData.datanascita || "1980-01-01",
      cip: formData.cip || "12345",
      codicefiscale: formData.codicefiscale || "RSSMRA80A01H501X",
      reparto: formData.reparto || "Stazione CC Roma Centro",
      cap: formData.cap || "00100",
      regione: formData.regione || "Lazio",
      citta: formData.citta || "Roma (RM)",
      cellulare: formData.cellulare || "+39 123 456 7890",
      email: formData.email || "mario.rossi@email.com",
      ausiliaria: formData.ausiliaria || "NO"
    };
    
    console.log("📋 Dati per compilazione documento:");
    console.log(JSON.stringify(datiCompilazione, null, 2));

    // Genera HTML del documento
    console.log("📄 Generazione HTML documento...");
    const htmlContent = generaDocumentoSIM(datiCompilazione);
    
    console.log("📏 HTML generato, lunghezza:", htmlContent.length);
    console.log("📄 Preview:", htmlContent.substring(0, 200) + "...");

    // Imposta headers per HTML
    const filename = `Delega_SIM_${datiCompilazione.nome}_${datiCompilazione.cognome}.html`;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    
    console.log("📤 Invio HTML al client...");
    res.send(htmlContent);
    
    console.log("✅ Documento HTML inviato con successo!");

  } catch (error) {
    console.error("❌ ERRORE API:", error.message);
    console.error("❌ Stack trace:", error.stack);
    return res.status(500).json({ 
      error: "Errore generazione documento",
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// FUNZIONE PARSING MULTIPART CORRETTA
async function parseMultipartFormData(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    
    req.on('data', chunk => {
      chunks.push(chunk);
    });
    
    req.on('end', () => {
      try {
        // Ricostruisci il body completo
        const body = Buffer.concat(chunks).toString('utf8');
        
        console.log("📦 Raw body length:", body.length);
        console.log("📦 Raw body preview:", body.substring(0, 300) + "...");
        
        const formData = {};
        
        // Estrai boundary dal Content-Type
        const contentType = req.headers['content-type'] || '';
        const boundaryMatch = contentType.match(/boundary=([^;]+)/);
        
        if (!boundaryMatch) {
          console.error("❌ Boundary non trovato nel Content-Type:", contentType);
          resolve(formData);
          return;
        }
        
        const boundary = boundaryMatch[1];
        console.log("🔍 Boundary identificato:", boundary);
        
        // Splitta le parti usando il boundary
        const delimiter = `--${boundary}`;
        const parts = body.split(delimiter);
        
        console.log("🔍 Parti totali trovate:", parts.length);
        
        // Processa ogni parte (esclude prima e ultima)
        parts.slice(1, -1).forEach((part, index) => {
          console.log(`📋 Processando parte ${index + 1}...`);
          
          // Rimuovi \r\n iniziali e finali
          const cleanPart = part.replace(/^\r?\n/, '').replace(/\r?\n$/, '');
          
          // Trova la separazione tra headers e content
          const headerSeparator = '\r\n\r\n';
          const separatorIndex = cleanPart.indexOf(headerSeparator);
          
          if (separatorIndex === -1) {
            console.log(`⚠️ Separatore headers non trovato nella parte ${index + 1}`);
            return;
          }
          
          const headers = cleanPart.substring(0, separatorIndex);
          const content = cleanPart.substring(separatorIndex + headerSeparator.length);
          
          console.log(`📄 Headers parte ${index + 1}:`, headers);
          console.log(`📝 Content parte ${index + 1}:`, content.substring(0, 50) + (content.length > 50 ? '...' : ''));
          
          // Estrai il nome del campo dagli headers
          const nameMatch = headers.match(/name="([^"]+)"/);
          
          if (nameMatch) {
            const fieldName = nameMatch[1];
            const fieldValue = content.replace(/\r?\n$/, ''); // Rimuovi newline finale
            
            // Salta file uploads (hanno filename) e campi vuoti
            if (!headers.includes('filename=') && fieldValue.trim() !== '') {
              formData[fieldName] = fieldValue.trim();
              console.log(`✅ Campo estratto: ${fieldName} = "${fieldValue.substring(0, 30)}${fieldValue.length > 30 ? '...' : ''}"`);
            } else {
              console.log(`⏭️ Campo skippato: ${fieldName} (file o vuoto)`);
            }
          } else {
            console.log(`❌ Nome campo non trovato negli headers della parte ${index + 1}`);
          }
        });
        
        console.log("📋 Parsing completato. Campi estratti:", Object.keys(formData));
        resolve(formData);
        
      } catch (error) {
        console.error("❌ Errore durante parsing multipart:", error.message);
        resolve({}); // Ritorna oggetto vuoto invece di rejection
      }
    });
    
    req.on('error', (error) => {
      console.error("❌ Errore lettura request:", error.message);
      resolve({}); // Ritorna oggetto vuoto invece di rejection
    });
  });
}

// GENERA HTML DEL DOCUMENTO SIM
function generaDocumentoSIM(dati) {
  const oggi = new Date().toLocaleDateString('it-IT');
  
  return `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Delega SIM - ${dati.nome} ${dati.cognome}</title>
    <style>
        @page {
            size: A4;
            margin: 15mm;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Times New Roman', serif;
            font-size: 11px;
            line-height: 1.3;
            color: #000;
            background: white;
            padding: 15px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 25px;
            border-bottom: 2px solid #000;
            padding-bottom: 15px;
        }
        
        .logo {
            color: #c41e3a;
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        
        .org-title {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 3px;
            text-transform: uppercase;
        }
        
        .org-subtitle {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        
        .address {
            font-size: 10px;
            color: #333;
            line-height: 1.2;
        }
        
        .document-title {
            text-align: center;
            font-weight: bold;
            font-size: 12px;
            margin: 20px 0;
            text-transform: uppercase;
            line-height: 1.4;
        }
        
        .form-section {
            margin: 15px 0;
        }
        
        .form-row {
            margin: 8px 0;
            display: flex;
            align-items: baseline;
            flex-wrap: wrap;
        }
        
        .field-label {
            font-weight: bold;
            margin-right: 8px;
            white-space: nowrap;
        }
        
        .field-value {
            border-bottom: 1px solid #000;
            padding: 0 5px 2px 5px;
            min-width: 100px;
            display: inline-block;
            margin-right: 15px;
            text-transform: uppercase;
        }
        
        .checkbox-section {
            margin: 15px 0;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .checkbox {
            border: 1px solid #000;
            width: 12px;
            height: 12px;
            display: inline-block;
            text-align: center;
            line-height: 10px;
            font-size: 10px;
            margin: 0 5px;
        }
        
        .content-section {
            margin: 20px 0;
            text-align: justify;
            line-height: 1.4;
        }
        
        .content-section p {
            margin: 10px 0;
        }
        
        .content-section ul {
            margin: 10px 0 10px 20px;
        }
        
        .content-section li {
            margin: 8px 0;
            text-align: justify;
        }
        
        .signature-section {
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .signature-line {
            border-bottom: 1px solid #000;
            min-width: 200px;
            display: inline-block;
            margin: 0 10px;
        }
        
        .footer-info {
            margin-top: 20px;
            font-size: 10px;
            line-height: 1.3;
            padding: 10px;
            background: #f9f9f9;
            border: 1px solid #ddd;
        }
        
        .print-controls {
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 1000;
            background: #007cba;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        
        .print-controls:hover {
            background: #005a87;
        }
        
        @media print {
            .print-controls { display: none; }
            body { padding: 0; margin: 0; }
            .footer-info { background: white; border: none; }
        }
        
        .highlight {
            background-color: #ffffcc;
            padding: 1px 3px;
            border-radius: 2px;
        }
        
        .bank-info {
            font-weight: bold;
            font-family: 'Courier New', monospace;
            background: #f0f0f0;
            padding: 2px 4px;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <button class="print-controls" onclick="window.print()">🖨️ Stampa PDF</button>
    
    <div class="header">
        <div class="logo">🇮🇹 S.I.M.</div>
        <div class="org-title">SINDACATO ITALIANO MILITARI CARABINIERI</div>
        <div class="org-subtitle">S.I.M. CARABINIERI</div>
        <div class="address">
            Via Magnagrecia n.13, 00184 Roma<br>
            Codice Fiscale: 96408280582
        </div>
    </div>
    
    <div class="document-title">
        DELEGA DI ADESIONE AL<br>
        SINDACATO ITALIANO DEI MILITARI CARABINIERI SIM<br>
        CARABINIERI - Via Magnagrecia n.13, 00184 Roma
    </div>
    
    <div class="form-section">
        <div class="form-row">
            <span class="field-label">Grado:</span>
            <span class="field-value">${dati.grado}</span>
        </div>
        
        <div class="form-row">
            <span class="field-label">IL/LA SOTTOSCRITTO/A NOME:</span>
            <span class="field-value">${dati.nome}</span>
            <span class="field-label">COGNOME:</span>
            <span class="field-value">${dati.cognome}</span>
        </div>
        
        <div class="form-row">
            <span class="field-label">NATO/A A:</span>
            <span class="field-value">${dati.luogonascita}</span>
            <span class="field-label">PROV.:</span>
            <span class="field-value">${dati.provincia}</span>
            <span class="field-label">IL:</span>
            <span class="field-value">${new Date(dati.datanascita).toLocaleDateString('it-IT')}</span>
        </div>
        
        <div class="form-row">
            <span class="field-label">C.I.P.:</span>
            <span class="field-value">${dati.cip}</span>
            <span class="field-label">CODICE FISCALE:</span>
            <span class="field-value">${dati.codicefiscale}</span>
        </div>
        
        <div class="form-row">
            <span class="field-label">REPARTO DI APPARTENENZA:</span>
            <span class="field-value">${dati.reparto}</span>
            <span class="field-label">CAP:</span>
            <span class="field-value">${dati.cap}</span>
        </div>
        
        <div class="form-row">
            <span class="field-label">REGIONE:</span>
            <span class="field-value">${dati.regione}</span>
            <span class="field-label">CITTÀ e PROV.:</span>
            <span class="field-value">${dati.citta}</span>
        </div>
        
        <div class="form-row">
            <span class="field-label">CELL.:</span>
            <span class="field-value">${dati.cellulare}</span>
            <span class="field-label">E-MAIL:</span>
            <span class="field-value">${dati.email}</span>
        </div>
    </div>
    
    <div class="checkbox-section">
        <span>Spuntare se in ausiliaria - SI</span>
        <span class="checkbox">${dati.ausiliaria === 'SI' ? '✓' : ''}</span>
        <span>NO</span>
        <span class="checkbox">${dati.ausiliaria === 'NO' ? '✓' : ''}</span>
    </div>
    
    <div class="content-section">
        <p><strong>Con il presente atto aderisce al Sindacato Italiano Militari Carabinieri – S.I.M. Carabinieri –</strong><br>
        Via Magnagrecia n. 13, 00183 Roma - <strong>Codice Fiscale: 96408280582</strong>.</p>
        
        <p><strong>A tal fine rilascia delega ed autorizza l'Amministrazione dell'Arma dei Carabinieri a:</strong></p>
        
        <ul>
            <li>trattenere mensilmente dal proprio statino paga e per le 12 mensilità, lo <strong>0,50%</strong> della voce stipendio o del trattamento pensionistico da considerare al netto di tutte le ritenute fiscali e contributive riferita agli emolumenti fissi e continuativi così come stabilito dai competenti organi statutari in analogia alle leggi di settore vigenti, ai sensi dell'<strong>art. 13 co. 3 della Legge n. 46 del 28 aprile 2022</strong>;</li>
            
            <li>versare la suddetta quota sul conto corrente bancario intestato a S.I.M. Carabinieri <strong class="bank-info">IBAN IT66 B0878739 0900 0000 0015819</strong> ai sensi dell'<strong>art. 7 co. 4. della Legge n. 46 del 28 aprile 2022</strong> e D.M. conseguente.</li>
        </ul>
        
        <p><strong>Validità temporale della delega:</strong> La presente delega ha validità dal primo giorno del mese successivo a quello del rilascio fino al <strong>31 dicembre</strong> di ogni anno e si intende <strong>tacitamente rinnovata</strong> se non è revocata dall'interessato entro il <strong>31 ottobre</strong>, ai sensi dell'<strong>art. 7 co. 3. della Legge n. 46 del 28 aprile 2022</strong>.</p>
        
        <p>L'eventuale <strong>revoca della delega</strong> dovrà essere trasmessa, in forma scritta, all'amministrazione e al S.I.M Carabinieri presso la sede legale nazionale <strong>Via Magnagrecia n. 13, 00183 Roma</strong> con raccomandata A/R o con PEC. ai sensi dell'<strong>art. 7 co. 3 della legge n. 46 del 28 aprile 2022</strong>.</p>
    </div>
    
    <div class="signature-section">
        <span>_________________________ lì, ${oggi}</span>
        <span>Firma <span class="signature-line"></span></span>
    </div>
    
    <div class="footer-info">
        <p><strong>Dichiara di aver preso visione dello Statuto</strong> presente sul sito internet <strong>www.simcarabinieri.com</strong>, dell'allegato "A" relativo alle competenze stipendiali per il calcolo della base della quota associativa, ricevuto ed accettato copia dell'allegata informativa sul trattamento dei dati personali.</p>
    </div>
    
    <div class="signature-section" style="margin-top: 25px;">
        <span>_________________________ lì, ${oggi}</span>
        <span>Firma <span class="signature-line"></span></span>
    </div>
    
    <div style="margin-top: 20px; text-align: center; font-size: 10px; font-weight: bold; border-top: 1px solid #ccc; padding-top: 10px;">
        <p>La presente delega, compilata, sottoscritta e corredata dal documento di identità,<br>
        dovrà essere trasmessa via mail all'indirizzo <strong>tesseramenti@simcarabinieri.cc</strong></p>
    </div>
    
    <div style="margin-top: 15px; text-align: center; font-size: 9px; color: #666;">
        Documento generato digitalmente - Sistema SIM v2.0 - ${oggi}
    </div>
    
    <script>
        // DEBUG: No auto-print per ora, così possiamo vedere i dati
        console.log('📄 HTML documento caricato');
        console.log('📊 Dati utilizzati nel documento:', {
            nome: '${dati.nome}',
            cognome: '${dati.cognome}',
            cip: '${dati.cip}'
        });
        
        // Stampa manuale con il bottone
        function stampaPDF() {
            window.print();
        }
    </script>
</body>
</html>`;
}
