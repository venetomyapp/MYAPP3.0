const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const multiparty = require("multiparty");
const fs = require("fs");

module.exports = async function handler(req, res) {
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

  console.log("🚀 START genera-pdf API");

  const form = new multiparty.Form();
  
  try {
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("❌ Errore parsing form:", err);
        return res.status(500).json({ error: "Errore parsing form", details: err.message });
      }

      try {
        // Estrai tutti i dati dal form
        const grado = fields.grado?.[0] || "";
        const nome = fields.nome?.[0] || "";
        const cognome = fields.cognome?.[0] || "";
        const luogonascita = fields.luogonascita?.[0] || "";
        const provincia = fields.provincia?.[0] || "";
        const datanascita = fields.datanascita?.[0] || "";
        const cip = fields.cip?.[0] || "";
        const cf = fields.codicefiscale?.[0] || "";
        const reparto = fields.reparto?.[0] || "";
        const cap = fields.cap?.[0] || "";
        const regione = fields.regione?.[0] || "";
        const citta = fields.citta?.[0] || "";
        const cellulare = fields.cellulare?.[0] || "";
        const email = fields.email?.[0] || "";
        const ausiliaria = fields.ausiliaria?.[0] || "NO";
        const signatureDataUrl = fields.signature?.[0];

        console.log("📊 Dati ricevuti:", { 
          grado, nome, cognome, luogonascita, provincia, datanascita, 
          cip, cf, reparto, cap, regione, citta, cellulare, email, ausiliaria 
        });

        // Validazione base
        if (!nome || !cognome || !cip || !cf) {
          return res.status(400).json({ error: "Campi obbligatori mancanti" });
        }

        console.log("📄 Creazione PDF...");

        // 1) Crea nuovo PDF
        const pdfDoc = await PDFDocument.create();
        
        // Embed font per supporto caratteri italiani
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        
        // Pagina principale A4 (595×842 punti)
        const page = pdfDoc.addPage([595, 842]);
        const { width, height } = page.getSize();

        console.log("✏️ Scrittura contenuto PDF...");

        // 2) Header SIM Carabinieri 
        page.drawText("🇮🇹", {
          x: width / 2 - 20,
          y: height - 40,
          size: 24,
        });

        page.drawText("SINDACATO ITALIANO MILITARI CARABINIERI", {
          x: 50,
          y: height - 80,
          size: 16,
          font: helveticaBold,
          color: rgb(0.1, 0.1, 0.5),
        });

        page.drawText("S.I.M. CARABINIERI", {
          x: 50,
          y: height - 100,
          size: 14,
          font: helveticaBold,
          color: rgb(0.1, 0.1, 0.5),
        });

        page.drawText("Via Magnagrecia n.13, 00184 Roma", {
          x: 50,
          y: height - 120,
          size: 11,
          font: helveticaFont,
          color: rgb(0.3, 0.3, 0.3),
        });

        // 3) Titolo principale
        page.drawText("DELEGA DI ADESIONE AL", {
          x: 180,
          y: height - 160,
          size: 16,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        });

        page.drawText("SINDACATO ITALIANO DEI MILITARI CARABINIERI SIM", {
          x: 80,
          y: height - 180,
          size: 14,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        });

        // 4) Dati compilati
        let yPos = height - 240;
        
        page.drawText(`Grado: ${grado}`, {
          x: 50,
          y: yPos,
          size: 12,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        // Nome/Cognome
        yPos -= 30;
        page.drawText("IL/LA SOTTOSCRITTO/A NOME", {
          x: 50,
          y: yPos,
          size: 12,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        });

        page.drawText(nome.toUpperCase(), {
          x: 280,
          y: yPos,
          size: 12,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        page.drawText("COGNOME", {
          x: 400,
          y: yPos,
          size: 12,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        });

        page.drawText(cognome.toUpperCase(), {
          x: 470,
          y: yPos,
          size: 12,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        // Nascita
        yPos -= 25;
        page.drawText("NATO/A A", {
          x: 50,
          y: yPos,
          size: 12,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        });

        page.drawText(luogonascita.toUpperCase(), {
          x: 130,
          y: yPos,
          size: 12,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        page.drawText("PROV.", {
          x: 350,
          y: yPos,
          size: 12,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        });

        page.drawText(provincia.toUpperCase(), {
          x: 400,
          y: yPos,
          size: 12,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        page.drawText("IL", {
          x: 450,
          y: yPos,
          size: 12,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        });

        // Formatta data in italiano
        const dataFormatted = datanascita ? new Date(datanascita).toLocaleDateString("it-IT") : "";
        page.drawText(dataFormatted, {
          x: 470,
          y: yPos,
          size: 12,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        // CIP e Codice Fiscale
        yPos -= 25;
        page.drawText("C.I.P.", {
          x: 50,
          y: yPos,
          size: 12,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        });

        page.drawText(cip, {
          x: 100,
          y: yPos,
          size: 12,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        page.drawText("CODICE FISCALE", {
          x: 250,
          y: yPos,
          size: 12,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        });

        page.drawText(cf.toUpperCase(), {
          x: 370,
          y: yPos,
          size: 12,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        // Altri dati...
        yPos -= 25;
        page.drawText(`REPARTO: ${reparto}`, {
          x: 50,
          y: yPos,
          size: 11,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        yPos -= 20;
        page.drawText(`REGIONE: ${regione} - CITTÀ: ${citta}`, {
          x: 50,
          y: yPos,
          size: 11,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        yPos -= 20;
        page.drawText(`CELLULARE: ${cellulare} - EMAIL: ${email}`, {
          x: 50,
          y: yPos,
          size: 11,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        // Checkbox ausiliaria
        yPos -= 30;
        page.drawText("Spuntare se in ausiliaria- SI", {
          x: 50,
          y: yPos,
          size: 11,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        // Checkbox SI
        page.drawRectangle({
          x: 220,
          y: yPos - 5,
          width: 12,
          height: 12,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });

        if (ausiliaria === "SI") {
          page.drawText("✓", {
            x: 222,
            y: yPos - 3,
            size: 10,
            color: rgb(0, 0, 0),
          });
        }

        page.drawText("NO", {
          x: 250,
          y: yPos,
          size: 11,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        // Checkbox NO
        page.drawRectangle({
          x: 280,
          y: yPos - 5,
          width: 12,
          height: 12,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
        });

        if (ausiliaria === "NO") {
          page.drawText("✓", {
            x: 282,
            y: yPos - 3,
            size: 10,
            color: rgb(0, 0, 0),
          });
        }

        // Testo delega
        yPos -= 40;
        const delegaLines = [
          "Con il presente atto aderisce al Sindacato Italiano Militari Carabinieri – S.I.M. Carabinieri",
          "Via Magnagrecia n. 13, 00183 Roma - Codice Fiscale: 96408280582.",
          "",
          "A tal fine rilascia delega ed autorizza l'Amministrazione dell'Arma dei Carabinieri a:",
          "- trattenere mensilmente dal proprio statino paga e per le 12 mensilità, lo 0,50%",
          "- versare la quota sul conto corrente IBAN IT66 B0878739 0900 0000 0015819"
        ];

        delegaLines.forEach((line) => {
          if (line.trim()) {
            page.drawText(line, {
              x: 50,
              y: yPos,
              size: 9,
              font: helveticaFont,
              color: rgb(0, 0, 0),
            });
          }
          yPos -= 12;
        });

        // Data e firma
        yPos -= 30;
        const today = new Date().toLocaleDateString("it-IT");
        page.drawText(`Data: ${today}`, {
          x: 50,
          y: yPos,
          size: 10,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        // Inserisci firma se presente
        if (signatureDataUrl && !signatureDataUrl.includes("data:,")) {
          try {
            console.log("🖊️ Inserimento firma...");
            const pngBase64 = signatureDataUrl.replace(/^data:image\/png;base64,/, "");
            const pngBytes = Buffer.from(pngBase64, "base64");
            const pngImage = await pdfDoc.embedPng(pngBytes);
            
            page.drawText("Firma:", {
              x: 350,
              y: yPos,
              size: 10,
              font: helveticaBold,
              color: rgb(0, 0, 0),
            });

            page.drawImage(pngImage, {
              x: 400,
              y: yPos - 40,
              width: 150,
              height: 40,
            });
          } catch (signError) {
            console.error("⚠️ Errore firma:", signError);
            // Continua senza firma
          }
        }

        // Allegare documenti
        console.log("📎 Processamento documenti...");
        
        if (files.doc_front?.[0]) {
          await attachDocument(pdfDoc, files.doc_front[0], "DOCUMENTO FRONTE");
        }
        
        if (files.doc_back?.[0]) {
          await attachDocument(pdfDoc, files.doc_back[0], "DOCUMENTO RETRO");
        }

        // Footer con email
        yPos -= 80;
        page.drawText("Inviare a: antoniogrande81@gmail.com", {
          x: 50,
          y: yPos,
          size: 8,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        });

        console.log("💾 Generazione PDF finale...");

        // Genera PDF finale
        const pdfBytes = await pdfDoc.save();

        console.log(`✅ PDF generato: ${pdfBytes.length} bytes`);

        // Invio PDF
        const filename = `CIP_${nome}_${cognome}.pdf`;
        
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.setHeader("Content-Length", pdfBytes.length);
        
        console.log(`📤 Invio PDF: ${filename}`);
        res.send(Buffer.from(pdfBytes));

      } catch (pdfError) {
        console.error("❌ Errore generazione PDF:", pdfError);
        return res.status(500).json({ 
          error: "Errore nella generazione del PDF",
          details: pdfError.message,
          stack: pdfError.stack
        });
      }
    });

  } catch (error) {
    console.error("❌ Errore generale:", error);
    return res.status(500).json({ 
      error: "Errore interno del server",
      details: error.message,
      stack: error.stack
    });
  }
};

// Funzione helper per allegare documenti
async function attachDocument(pdfDoc, file, title) {
  if (!file || !file.path) {
    console.log(`⚠️ File ${title} non presente`);
    return;
  }

  try {
    console.log(`📎 Processamento ${title}: ${file.originalFilename}`);
    
    const bytes = await fs.promises.readFile(file.path);
    const filename = file.originalFilename?.toLowerCase() || "";

    if (filename.endsWith(".pdf")) {
      console.log(`📄 Allegando PDF: ${title}`);
      const existingPdf = await PDFDocument.load(bytes);
      const copiedPages = await pdfDoc.copyPages(
        existingPdf,
        existingPdf.getPageIndices()
      );
      copiedPages.forEach((page) => pdfDoc.addPage(page));
      
    } else {
      console.log(`🖼️ Allegando immagine: ${title}`);
      
      let image;
      if (filename.includes("png")) {
        image = await pdfDoc.embedPng(bytes);
      } else {
        image = await pdfDoc.embedJpg(bytes);
      }

      const newPage = pdfDoc.addPage([595, 842]);
      const { width, height } = newPage.getSize();
      
      // Header documento
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      newPage.drawText(title, {
        x: 50,
        y: height - 50,
        size: 16,
        font: helveticaBold,
        color: rgb(0.1, 0.1, 0.5),
      });

      // Calcola dimensioni per centrare l'immagine
      const maxWidth = width - 100;
      const maxHeight = height - 150;
      const imageAspectRatio = image.width / image.height;
      const maxAspectRatio = maxWidth / maxHeight;

      let imageWidth, imageHeight;
      if (imageAspectRatio > maxAspectRatio) {
        imageWidth = maxWidth;
        imageHeight = maxWidth / imageAspectRatio;
      } else {
        imageHeight = maxHeight;
        imageWidth = maxHeight * imageAspectRatio;
      }

      const x = (width - imageWidth) / 2;
      const y = (height - imageHeight) / 2 - 25;

      newPage.drawImage(image, {
        x,
        y,
        width: imageWidth,
        height: imageHeight,
      });
    }

    // Pulisci file temporaneo
    try {
      await fs.promises.unlink(file.path);
    } catch (unlinkError) {
      console.warn("⚠️ File temp cleanup:", unlinkError.message);
    }

    console.log(`✅ ${title} allegato con successo`);

  } catch (attachError) {
    console.error(`❌ Errore allegando ${title}:`, attachError);
    // Non bloccare il processo per un allegato fallito
  }
}
