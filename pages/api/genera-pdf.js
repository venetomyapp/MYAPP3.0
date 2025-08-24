import { PDFDocument } from "pdf-lib";
import multiparty from "multiparty";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false, // necessario per multiparte
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const form = new multiparty.Form();
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).send("Errore upload");

    const nome = fields.nome?.[0] || "";
    const cognome = fields.cognome?.[0] || "";
    const cip = fields.cip?.[0] || "";
    const cf = fields.codicefiscale?.[0] || "";
    const email = fields.email?.[0] || "";
    const signatureDataUrl = fields.signature?.[0];

    // 1) Crea PDF delega base
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const { height } = page.getSize();

    page.drawText("Delega di adesione al Sindacato", {
      x: 50,
      y: height - 50,
      size: 18,
    });
    page.drawText(`Nome: ${nome}`, { x: 50, y: height - 100, size: 12 });
    page.drawText(`Cognome: ${cognome}`, { x: 50, y: height - 120, size: 12 });
    page.drawText(`CIP: ${cip}`, { x: 50, y: height - 140, size: 12 });
    page.drawText(`Codice Fiscale: ${cf}`, {
      x: 50,
      y: height - 160,
      size: 12,
    });
    page.drawText(`Email: ${email}`, { x: 50, y: height - 180, size: 12 });

    // 2) Inserisci firma
    if (signatureDataUrl) {
      const pngBase64 = signatureDataUrl.replace(
        /^data:image\\/png;base64,/,
        ""
      );
      const pngBytes = Buffer.from(pngBase64, "base64");
      const pngImage = await pdfDoc.embedPng(pngBytes);
      page.drawImage(pngImage, {
        x: 300,
        y: 80,
        width: 200,
        height: 80,
      });
    }

    // 3) Allegare documento fronte/retro
    async function attachDoc(file) {
      if (!file) return;
      const bytes = await fs.promises.readFile(file.path);
      try {
        const extraPdf = await PDFDocument.load(bytes);
        const copied = await pdfDoc.copyPages(
          extraPdf,
          extraPdf.getPageIndices()
        );
        copied.forEach((p) => pdfDoc.addPage(p));
      } catch {
        // se immagine jpg/png
        const isPng = file.originalFilename.toLowerCase().endsWith(".png");
        const img = isPng
          ? await pdfDoc.embedPng(bytes)
          : await pdfDoc.embedJpg(bytes);
        const newPage = pdfDoc.addPage([595, 842]);
        const { width, height } = img.scale(0.7);
        newPage.drawImage(img, {
          x: (595 - width) / 2,
          y: (842 - height) / 2,
          width,
          height,
        });
      }
    }

    await attachDoc(files.doc_front?.[0]);
    await attachDoc(files.doc_back?.[0]);

    // 4) Salva PDF
    const pdfBytes = await pdfDoc.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${cip}_${nome}_${cognome}.pdf"`
    );
    res.send(Buffer.from(pdfBytes));
  });
}
