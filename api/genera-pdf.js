// VERSIONE NATIVA - Genera PDF senza dipendenze esterne pesanti
module.exports = async function handler(req, res) {
  console.log("🚀 START genera-pdf NATIVE");
  
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
    console.log("📝 Parsing form data...");
    
    // Parse multipart data manually (senza multiparty)
    const data = await parseFormData(req);
    
    console.log("📊 Dati estratti:", data.fields);

    // Estrai dati form
    const nome = data.fields.nome || "";
    const cognome = data.fields.cognome || "";
    const grado = data.fields.grado || "";
    const cip = data.fields.cip || "";
    const cf = data.fields.codicefiscale || "";
    const email = data.fields.email || "";
    const cellulare = data.fields.cellulare || "";
    const luogonascita = data.fields.luogonascita || "";
    const provincia = data.fields.provincia || "";
    const datanascita = data.fields.datanascita || "";
    const reparto = data.fields.reparto || "";
    const regione = data.fields.regione || "";
    const citta = data.fields.citta || "";
    const ausiliaria = data.fields.ausiliaria || "NO";
    
    console.log("📄 Generazione PDF HTML...");

    // Genera PDF usando HTML to PDF (metodo nativo)
    const htmlContent = generatePdfHtml({
      nome, cognome, grado, cip, cf, email, cellulare,
      luogonascita, provincia, datanascita, reparto, 
      regione, citta, ausiliaria
    });

    console.log("📤 Invio PDF...");

    // Invia come HTML che il browser può salvare come PDF
    const filename = `CIP_${nome}_${cognome}.pdf`;
    
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    
    res.send(htmlContent);
    
    console.log("✅ PDF HTML inviato con successo!");

  } catch (error) {
    console.error("❌ ERRORE:", error);
    return res.status(500).json({ 
      error: "Errore generazione PDF",
      message: error.message,
      stack: error.stack
    });
  }
};

// Funzione per parsing form data senza multiparty
async function parseFormData(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        // Parse basic form data (semplificato)
        const fields = {};
        const params = new URLSearchParams(body);
        
        for (const [key, value] of params) {
          fields[key] = value;
        }
        
        resolve({ fields, files: {} });
      } catch (err) {
        reject(err);
      }
    });
    
    req.on('error', reject);
  });
}

// Genera HTML che simula un PDF ufficiale SIM
function generatePdfHtml(data) {
  const today = new Date().toLocaleDateString('it-IT');
  
  return `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Delega SIM Carabinieri - ${data.nome} ${data.cognome}</title>
    <style>
        @page {
            size: A4;
            margin: 20mm;
        }
        
        body {
            font-family: 'Times New Roman', serif;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
            background: white;
            margin: 0;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
        }
        
        .logo {
            font-size: 24px;
            margin-bottom: 10px;
        }
        
        .title {
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 5px;
        }
        
        .subtitle {
            font-size: 14px;
            margin-bottom: 10px;
        }
        
        .address {
            font-size: 11px;
            color: #666;
        }
        
        .main-title {
            text-align: center;
            font-weight: bold;
            font-size: 18px;
            margin: 30px 0 20px 0;
            text-transform: uppercase;
        }
        
        .field-row {
            margin: 10px 0;
            display: flex;
            align-items: baseline;
        }
        
        .field-label {
            font-weight: bold;
            margin-right: 10px;
            min-width: 120px;
        }
        
        .field-value {
            text-transform: uppercase;
            text-decoration: underline;
        }
        
        .signature-section {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .signature-box {
            border: 1px solid #000;
            width: 200px;
            height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f9f9f9;
        }
        
        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ccc;
            font-size: 10px;
            text-align: center;
            color: #666;
        }
        
        .delegation-text {
            margin: 20px 0;
            text-align: justify;
            line-height: 1.6;
        }
        
        .checkbox-area {
            margin: 20px 0;
            display: flex;
            align-items: center;
            gap: 20px;
        }
        
        .checkbox {
            border: 1px solid #000;
            width: 12px;
            height: 12px;
            display: inline-block;
            text-align: center;
            line-height: 10px;
        }
        
        @media print {
            body { margin: 0; padding: 15mm; }
            .no-print { display: none; }
        }
        
        .print-btn {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #007cba;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            z-index: 1000;
        }
        
        .print-btn:hover {
            background: #005a87;
        }
    </style>
</head>
<body>
    <button class="print-btn no-print" onclick="window.print()">🖨️ Stampa PDF</button>
    
    <div class="header">
        <div class="logo">🇮🇹</div>
        <div class="title">SINDACATO ITALIANO MILITARI CARABINIERI</div>
        <div class="subtitle">S.I.M. CARABINIERI</div>
        <div class="address">Via Magnagrecia n.13, 00184 Roma<br>Codice Fiscale: 96408280582</div>
    </div>
    
    <div class="main-title">
        DELEGA DI ADESIONE AL<br>
        SINDACATO ITALIANO DEI MILITARI CARABINIERI SIM<br>
        CARABINIERI- Via Magnagrecia n.13, 00184 Roma
    </div>
    
    <div class="field-row">
        <span class="field-label">Grado:</span>
        <span class="field-value">${data.grado}</span>
    </div>
    
    <div class="field-row">
        <span class="field-label">IL/LA SOTTOSCRITTO/A NOME:</span>
        <span class="field-value">${data.nome}</span>
        <span class="field-label" style="margin-left: 40px;">COGNOME:</span>
        <span class="field-value">${data.cognome}</span>
    </div>
    
    <div class="field-row">
        <span class="field-label">NATO/A A:</span>
        <span class="field-value">${data.luogonascita}</span>
        <span class="field-label" style="margin-left: 40px;">PROV.:</span>
        <span class="field-value">${data.provincia}</span>
        <span class="field-label" style="margin-left: 40px;">IL:</span>
        <span class="field-value">${new Date(data.datanascita).toLocaleDateString('it-IT')}</span>
    </div>
    
    <div class="field-row">
        <span class="field-label">C.I.P.:</span>
        <span class="field-value">${data.cip}</span>
        <span class="field-label" style="margin-left: 40px;">CODICE FISCALE:</span>
        <span class="field-value">${data.cf}</span>
    </div>
    
    <div class="field-row">
        <span class="field-label">REPARTO DI APPARTENENZA:</span>
        <span class="field-value">${data.reparto}</span>
        <span class="field-label" style="margin-left: 40px;">CAP:</span>
        <span class="field-value">${data.cap}</span>
    </div>
    
    <div class="field-row">
        <span class="field-label">REGIONE:</span>
        <span class="field-value">${data.regione}</span>
        <span class="field-label" style="margin-left: 40px;">CITTÀ e PROV.:</span>
        <span class="field-value">${data.citta}</span>
    </div>
    
    <div class="field-row">
        <span class="field-label">CELL.:</span>
        <span class="field-value">${data.cellulare}</span>
        <span class="field-label" style="margin-left: 40px;">E-MAIL:</span>
        <span class="field-value">${data.email}</span>
    </div>
    
    <div class="checkbox-area">
        <span>Spuntare se in ausiliaria- SI</span>
        <span class="checkbox">${data.ausiliaria === 'SI' ? '✓' : ''}</span>
        <span>NO</span>
        <span class="checkbox">${data.ausiliaria === 'NO' ? '✓' : ''}</span>
    </div>
    
    <div class="delegation-text">
        <p><strong>Con il presente atto aderisce al Sindacato Italiano Militari Carabinieri – S.I.M. Carabinieri –</strong><br>
        Via Magnagrecia n. 13, 00183 Roma - <strong>Codice Fiscale: 96408280582</strong>.</p>
        
        <p><strong>A tal fine rilascia delega ed autorizza l'Amministrazione dell'Arma dei Carabinieri a:</strong></p>
        
        <ul style="margin-left: 20px;">
            <li>trattenere mensilmente dal proprio statino paga e per le 12 mensilità, lo 0,50% della voce stipendio o del trattamento pensionistico da considerare al netto di tutte le ritenute fiscali e contributive riferita agli emolumenti fissi e continuativi così come stabilito dai competenti organi statutari in analogia alle leggi di settore vigenti, ai sensi dell'art. 13 co. 3 della Legge n. 46 del 28 aprile 2022;</li>
            <li>versare la suddetta quota sul conto corrente bancario intestato a S.I.M. Carabinieri <strong>IBAN IT66 B0878739 0900 0000 0015819</strong> ai sensi dell'art. 7 co. 4. della Legge n. 46 del 28 aprile 2022 e D.M. conseguente.</li>
        </ul>
        
        <p><strong>Validità temporale della delega:</strong> La presente delega ha validità dal primo giorno del mese successivo a quello del rilascio fino al 31 dicembre di ogni anno e si intende tacitamente rinnovata se non è revocata dall'interessato entro il 31 ottobre, ai sensi dell'art. 7 co. 3. della Legge n. 46 del 28 aprile 2022.</p>
        
        <p>L'eventuale revoca della delega dovrà essere trasmessa, in forma scritta, all'amministrazione e al S.I.M Carabinieri presso la sede legale nazionale Via Magnagrecia n. 13, 00183 Roma con raccomandata A/R o con PEC. ai sensi dell'art. art. 7 co. 3 della legge n. 46 del 28 aprile 2022.</p>
    </div>
    
    <div class="signature-section">
        <div>
            <span>_________________________ lì, ${today}</span>
        </div>
        <div>
            <span>Firma _________________________________</span>
            <div class="signature-box">
                <span style="color: #999; font-style: italic;">Firma digitale</span>
            </div>
        </div>
    </div>
    
    <div style="margin-top: 30px;">
        <p style="font-size: 10px;">
            <strong>Dichiara di aver preso visione dello Statuto</strong> presente sul sito internet www.simcarabinieri.com, 
            dell'allegato "A" relativo alle competenze stipendiali per il calcolo della base della quota associativa, 
            ricevuto ed accettato copia dell'allegata informativa sul trattamento dei dati personali.
        </p>
    </div>
    
    <div class="signature-section" style="margin-top: 30px;">
        <div>
            <span>_________________________ lì, ${today}</span>
        </div>
        <div>
            <span>Firma _________________________________</span>
            <div class="signature-box">
                <span style="color: #999; font-style: italic;">Firma digitale</span>
            </div>
        </div>
    </div>
    
    <div class="footer">
        <p><strong>La presente delega, compilata, sottoscritta e corredata dal documento di identità,<br>
        dovrà essere trasmessa via mail all'indirizzo antoniogrande81@gmail.com</strong></p>
        <hr style="margin: 20px 0;">
        <p>Documento generato digitalmente - MyApp SIM v1.0 - ${today}</p>
    </div>
    
    <script class="no-print">
        // Auto-print quando caricata
        window.onload = function() {
            setTimeout(() => {
                window.print();
            }, 1000);
        };
        
        // Chiudi finestra dopo stampa
        window.onafterprint = function() {
            setTimeout(() => {
                window.close();
            }, 1000);
        };
    </script>
</body>
</html>`;
}
