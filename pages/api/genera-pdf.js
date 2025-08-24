import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import multiparty from "multiparty";
import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: false, // Necessario per multipart/form-data
    externalResolver: true,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  const form = new multiparty.Form();
  
  try {
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("Errore parsing form:", err);
        return res.status(500).json({ error: "Errore parsing form" });
      }

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

      console.log("Dati ricevuti:", { 
        grado, nome, cognome, luogonascita, provincia, datanascita, 
        cip, cf, reparto, cap, regione, citta, cellulare, email, ausiliaria 
      });

      try {
        // 1) Crea nuovo PDF usando il template ufficiale SIM
        const pdfDoc = await PDFDocument.create();
        
        // Embed font per supporto caratteri italiani
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);
        
        // Pagina principale A4 (595×842 punti)
        const page = pdfDoc.addPage([595, 842]);
        const { width, height } = page.getSize();

        // 2) Header SIM Carabinieri con stemma (simulato)
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

        page.drawText("CARABINIERI- Via Magnagrecia n.13, 00184 Roma", {
          x: 120,
          y: height - 200,
          size: 12,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        // 4) Campo Grado
        page.drawText(`Grado: ${grado}`, {
          x: 50,
          y: height - 240,
          size: 12,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        // 5) Riga principale con Nome/Cognome
        let yPos = height - 270;
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

        // 6) Riga nascita
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

        // 7) Riga CIP e Codice Fiscale
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

        // 8) Reparto
        yPos -= 25;
        page.drawText("REPARTO DI APPARTENENZA", {
          x: 50,
          y: yPos,
          size: 12,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        });

        page.drawText(reparto, {
          x: 250,
          y: yPos,
          size: 11,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        page.drawText("CAP", {
          x: 480,
          y: yPos,
          size: 12,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        });

        page.drawText(cap, {
          x: 510,
          y: yPos,
          size: 12,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        // 9) Regione e Città
        yPos -= 25;
        page.drawText("REGIONE", {
          x: 50,
          y: yPos,
          size: 12,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        });

        page.drawText(regione, {
          x: 130,
          y: yPos,
          size: 12,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        page.drawText("CITTA' e PROV.", {
          x: 300,
          y: yPos,
          size: 12,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        });

        page.drawText(citta, {
          x: 420,
          y: yPos,
          size: 12,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        // 10) Contatti
        yPos -= 25;
        page.drawText("CELL.", {
          x: 50,
          y: yPos,
          size: 12,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        });

        page.drawText(cellulare, {
          x: 100,
          y: yPos,
          size: 12,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        page.drawText("E-MAIL", {
          x: 300,
          y: yPos,
          size: 12,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        });

        page.drawText(email, {
          x: 360,
          y: yPos,
          size: 11,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        // 11) Checkbox Ausiliaria
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

        // 12) Testo della delega ufficiale
        yPos -= 40;
        page.drawText("Con il presente atto aderisce al Sindacato Italiano Militari Carabinieri – S.I.M. Carabinieri –", {
          x: 50,
          y: yPos,
          size: 10,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
        yPos -= 15;
        page.drawText("Via Magnagrecia n. 13, 00183 Roma - Codice Fiscale: 96408280582.", {
          x: 50,
          y: yPos,
          size: 10,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        });

        yPos -= 25;
        page.drawText("A tal fine rilascia delega ed autorizza l'Amministrazione dell'Arma dei Carabinieri a:", {
          x: 50,
          y: yPos,
          size: 10,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        });

        // Testo della delega (semplificato per spazio)
        const delegaLines = [
          "- trattenere mensilmente dal proprio statino paga e per le 12 mensilità, lo 0,50% della voce",
          "  stipendio o del trattamento pensionistico da considerare al netto di tutte le ritenute",
          "  fiscali e contributive riferita agli emolumenti fissi e continuativi così come stabilito dai",
          "  competenti organi statutari, ai sensi dell'art. 13 co. 3 della Legge n. 46 del 28 aprile 2022;",
          "",
          "- versare la suddetta quota sul conto corrente bancario intestato a S.I.M. Carabinieri",
          "  IBAN IT66 B0878739 0900 0000 0015819 ai sensi dell'art. 7 co. 4. della Legge n. 46",
          "  del 28 aprile 2022 e D.M. conseguente."
        ];

        yPos -= 20;
        delegaLines.forEach((line) => {
          page.drawText(line, {
            x: 50,
            y: yPos,
            size: 9,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          });
          yPos -= 12;
        });

        // 13) Validità temporale
        yPos -= 20;
        page.drawText("Validità temporale della delega:", {
          x: 50,
          y: yPos,
          size: 10,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        });

        yPos -= 15;
        const validitaText = "La presente delega ha validità dal primo giorno del mese successivo a quello del rilascio fino al 31 dicembre di ogni anno e si intende tacitamente rinnovata se non è revocata dall'interessato entro il 31 ottobre, ai sensi dell'art. 7 co. 3. della Legge n. 46 del 28 aprile 2022.";
        
        // Dividi il testo in righe
        const words = validitaText.split(' ');
        let currentLine = '';
        const maxLineLength = 80;
        
        words.forEach((word) => {
          if ((currentLine + word).length < maxLineLength) {
            currentLine += (currentLine ? ' ' : '') + word;
          } else {
            page.drawText(currentLine, {
              x: 50,
              y: yPos,
              size: 9,
              font: helveticaFont,
              color: rgb(0, 0, 0),
            });
            yPos -= 12;
            currentLine = word;
          }
        });
        
        if (currentLine) {
          page.drawText(currentLine, {
            x: 50,
            y: yPos,
            size: 9,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          });
          yPos -= 12;
        }

        // 14) Prima firma
        yPos -= 30;
        const today = new Date().toLocaleDateString("it-IT");
        
        page.drawText("___________________________________ lì, ___________________", {
          x: 50,
          y: yPos,
          size: 10,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        page.drawText("Firma _______________________________________", {
          x: 350,
          y: yPos,
          size: 10,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        // Aggiungi data
        page.drawText(today, {
          x: 250,
          y: yPos,
          size: 10,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        // 15) Inserisci prima firma
        if (signatureDataUrl && !signatureDataUrl.includes("data:,")) {
          try {
            const pngBase64 = signatureDataUrl.replace(
              /^data:image\/png;base64,/,
              ""
            );
            const pngBytes = Buffer.from(pngBase64, "base64");
            const pngImage = await pdfDoc.embedPng(pngBytes);
            
            // Prima firma
            page.drawImage(pngImage, {
              x: 380,
              y: yPos - 30,
              width: 150,
              height: 40,
            });
          } catch (signError) {
            console.error("Errore inserimento firma:", signError);
          }
        }

        // 16) Testo dichiarazione privacy (ridotto)
        yPos -= 80;
        page.drawText("Dichiara di aver preso visione dello Statuto presente sul sito internet www.simcarabinieri.com,", {
          x: 50,
          y: yPos,
          size: 9,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
        yPos -= 12;
        page.drawText("dell'allegato \"A\" relativo alle competenze stipendiali e dell'informativa privacy.", {
          x: 50,
          y: yPos,
          size: 9,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        // 17) Seconda firma
        yPos -= 40;
        page.drawText("___________________________________ lì, _______________", {
          x: 50,
          y: yPos,
          size: 10,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        page.drawText("Firma ___________________________________________", {
          x: 330,
          y: yPos,
          size: 10,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        // Aggiungi data anche qui
        page.drawText(today, {
          x: 230,
          y: yPos,
          size: 10,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        // Seconda firma (stessa della prima)
        if (signatureDataUrl && !signatureDataUrl.includes("data:,")) {
          try {
            const pngBase64 = signatureDataUrl.replace(
              /^data:image\/png;base64,/,
              ""
            );
            const pngBytes = Buffer.from(pngBase64, "base64");
            const pngImage = await pdfDoc.embedPng(pngBytes);
            
            page.drawImage(pngImage, {
              x: 360,
              y: yPos - 30,
              width: 150,
              height: 40,
            });
          } catch (signError) {
            console.error("Errore inserimento seconda firma:", signError);
          }
        }

        // 18) Footer con istruzioni
        yPos -= 60;
        page.drawText("La presente delega, compilata, sottoscritta e corredata dal documento di identità,", {
          x: 50,
          y: yPos,
          size: 8,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
        yPos -= 10;
        page.drawText("dovrà essere trasmessa via mail all'indirizzo antoniogrande81@gmail.com", {
          x: 50,
          y: yPos,
          size: 8,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        });

        // 19) Allegare documenti fronte/retro
        await attachDocument(pdfDoc, files.doc_front?.[0], "DOCUMENTO D'IDENTITÀ - FRONTE");
        await attachDocument(pdfDoc, files.doc_back?.[0], "DOCUMENTO D'IDENTITÀ - RETRO");

        // 20) Genera PDF finale
        const pdfBytes = await pdfDoc.save();

        // 21) Invia il PDF
        const filename = `CIP_${nome}_${cognome}.pdf`;
        
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`
        );
        res.setHeader("Content-Length", pdfBytes.length);
        
        res.send(Buffer.from(pdfBytes));

      } catch (pdfError) {
        console.error("Errore generazione PDF:", pdfError);
        return res.status(500).json({ 
          error: "Errore nella generazione del PDF",
          details: pdfError.message 
        });
      }
    });

  } catch (error) {
    console.error("Errore generale:", error);
    return res.status(500).json({ 
      error: "Errore interno del server",
      details: error.message 
    });
  }
}

// Funzione helper per allegare documenti
async function attachDocument(pdfDoc, file, title) {
  if (!file || !file.path) return;

  try {
    const bytes = await fs.promises.readFile(file.path);
    const filename = file.originalFilename?.toLowerCase() || "";

    if (filename.endsWith(".pdf")) {
      // Se è un PDF, copia tutte le pagine
      const existingPdf = await PDFDocument.load(bytes);
      const copiedPages = await pdfDoc.copyPages(
        existingPdf,
        existingPdf.getPageIndices()
      );
      copiedPages.forEach((page) => pdfDoc.addPage(page));
      
    } else {
      // Se è un'immagine, crea una nuova pagina
      let image;
      if (filename.endsWith(".png") || filename.includes("png")) {
        image = await pdfDoc.embedPng(bytes);
      } else {
        image = await pdfDoc.embedJpg(bytes);
      }

      const newPage = pdfDoc.addPage([595, 842]);
      const { width, height } = newPage.getSize();
      
      // Header per il tipo di documento
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

    // Pulisci il file temporaneo
    try {
      await fs.promises.unlink(file.path);
    } catch (unlinkError) {
      console.warn("Impossibile eliminare file temporaneo:", unlinkError.message);
    }

  } catch (attachError) {
    console.error(`Errore allegando ${title}:`, attachError);
    // Non bloccare l'intero processo se un allegato fallisce
  }
}
