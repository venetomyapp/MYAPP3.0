import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import multiparty from "multiparty";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false, // Necessario per multipart/form-data
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

      // Estrai i dati dal form
      const nome = fields.nome?.[0] || "";
      const cognome = fields.cognome?.[0] || "";
      const cip = fields.cip?.[0] || "";
      const cf = fields.codicefiscale?.[0] || "";
      const email = fields.email?.[0] || "";
      const telefono = fields.telefono?.[0] || "";
      const datanascita = fields.datanascita?.[0] || "";
      const luogonascita = fields.luogonascita?.[0] || "";
      const signatureDataUrl = fields.signature?.[0];

      console.log("Dati ricevuti:", { nome, cognome, cip, cf, email, telefono, datanascita, luogonascita });

      try {
        // 1) Crea nuovo documento PDF
        const pdfDoc = await PDFDocument.create();
        
        // Embed font per supporto caratteri italiani
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        
        // Pagina principale A4 (595×842 punti)
        const page = pdfDoc.addPage([595, 842]);
        const { width, height } = page.getSize();

        // 2) Header del documento
        page.drawText("DELEGA DI ADESIONE AL SINDACATO", {
          x: 50,
          y: height - 60,
          size: 20,
          font: helveticaBold,
          color: rgb(0.1, 0.1, 0.5),
        });

        // Linea decorativa
        page.drawLine({
          start: { x: 50, y: height - 80 },
          end: { x: width - 50, y: height - 80 },
          thickness: 2,
          color: rgb(0.1, 0.1, 0.5),
        });

        // 3) Dati anagrafici  
        let yPosition = height - 120;
        
        page.drawText("DATI ANAGRAFICI", {
          x: 50,
          y: yPosition,
          size: 14,
          font: helveticaBold,
          color: rgb(0.2, 0.2, 0.2),
        });
        yPosition -= 30;

        // Estrai dati aggiuntivi
        const datanascita = fields.datanascita?.[0] || "";
        const luogonascita = fields.luogonascita?.[0] || "";

        const dataFields = [
          { label: "Nome:", value: nome },
          { label: "Cognome:", value: cognome },
          { label: "Data di nascita:", value: datanascita },
          { label: "Luogo di nascita:", value: luogonascita },
          { label: "Codice CIP:", value: cip },
          { label: "Codice Fiscale:", value: cf.toUpperCase() },
          { label: "Email:", value: email },
          { label: "Telefono:", value: telefono },
        ];

        dataFields.forEach((field) => {
          if (field.value) {
            page.drawText(field.label, {
              x: 50,
              y: yPosition,
              size: 12,
              font: helveticaBold,
              color: rgb(0.3, 0.3, 0.3),
            });
            page.drawText(field.value, {
              x: 150,
              y: yPosition,
              size: 12,
              font: helveticaFont,
              color: rgb(0, 0, 0),
            });
            yPosition -= 25;
          }
        });

        // 4) Testo della delega
        yPosition -= 20;
        page.drawText("DICHIARAZIONE", {
          x: 50,
          y: yPosition,
          size: 14,
          font: helveticaBold,
          color: rgb(0.2, 0.2, 0.2),
        });
        yPosition -= 30;

        const delegaText = `Con la presente, io sottoscritto/a ${nome} ${cognome}, 
nato/a il ${datanascita} a ${luogonascita}, 
codice fiscale ${cf.toUpperCase()}, 
DICHIARO di aderire al Sindacato e DELEGO lo stesso 
alla rappresentanza dei miei interessi professionali.

La presente delega ha validità a tempo indeterminato 
e può essere revocata in qualsiasi momento con 
comunicazione scritta.

Autorizzo inoltre il trattamento dei miei dati personali 
secondo quanto previsto dal Reg. UE 2016/679 (GDPR).`;

        // Dividi il testo in righe per il wrapping
        const lines = delegaText.split('\n');
        lines.forEach((line) => {
          if (line.trim()) {
            page.drawText(line.trim(), {
              x: 50,
              y: yPosition,
              size: 11,
              font: helveticaFont,
              color: rgb(0, 0, 0),
            });
          }
          yPosition -= 18;
        });

        // 5) Data e luogo
        yPosition -= 30;
        const today = new Date().toLocaleDateString("it-IT");
        page.drawText(`Data: ${today}`, {
          x: 50,
          y: yPosition,
          size: 12,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        page.drawText("Luogo: _________________________", {
          x: 300,
          y: yPosition,
          size: 12,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        // 6) Box per la firma
        const signatureBoxY = yPosition - 100;
        page.drawRectangle({
          x: 300,
          y: signatureBoxY - 80,
          width: 250,
          height: 100,
          borderColor: rgb(0.3, 0.3, 0.3),
          borderWidth: 1,
        });

        page.drawText("Firma del dichiarante:", {
          x: 300,
          y: signatureBoxY + 30,
          size: 10,
          font: helveticaBold,
          color: rgb(0.3, 0.3, 0.3),
        });

        // 7) Inserisci firma se presente
        if (signatureDataUrl && !signatureDataUrl.includes("data:,")) {
          try {
            const pngBase64 = signatureDataUrl.replace(
              /^data:image\/png;base64,/,
              ""
            );
            const pngBytes = Buffer.from(pngBase64, "base64");
            const pngImage = await pdfDoc.embedPng(pngBytes);
            
            // Ridimensiona la firma per fit nel box
            const signatureDims = pngImage.scale(0.5);
            
            page.drawImage(pngImage, {
              x: 310,
              y: signatureBoxY - 70,
              width: Math.min(signatureDims.width, 230),
              height: Math.min(signatureDims.height, 80),
            });
          } catch (signError) {
            console.error("Errore inserimento firma:", signError);
            // Continua senza firma se c'è un errore
          }
        }

        // 8) Footer
        page.drawText("Documento generato digitalmente - MyApp v4.1", {
          x: 50,
          y: 30,
          size: 8,
          font: helveticaFont,
          color: rgb(0.5, 0.5, 0.5),
        });

        // 9) Allegare documenti fronte/retro
        await attachDocument(pdfDoc, files.doc_front?.[0], "DOCUMENTO FRONTE");
        await attachDocument(pdfDoc, files.doc_back?.[0], "DOCUMENTO RETRO");

        // 10) Genera PDF finale
        const pdfBytes = await pdfDoc.save();

        // 11) Invia il PDF
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
