// TEST MINIMALISTA - Verifica che l'API risponda
module.exports = async function handler(req, res) {
  console.log("🚀 TEST API genera-pdf - START");
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log("✅ OPTIONS request");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    console.log("❌ Wrong method:", req.method);
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  try {
    console.log("📝 Tentativo di importare pdf-lib...");
    
    // Test import pdf-lib
    const { PDFDocument } = require("pdf-lib");
    console.log("✅ pdf-lib importato con successo");
    
    console.log("📝 Tentativo di importare multiparty...");
    
    // Test import multiparty
    const multiparty = require("multiparty");
    console.log("✅ multiparty importato con successo");
    
    console.log("📄 Creazione PDF di test...");
    
    // Crea PDF minimalista
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    
    page.drawText("TEST PDF GENERATO CON SUCCESSO", {
      x: 50,
      y: 800,
      size: 20,
    });
    
    page.drawText("SIM Carabinieri - Iscrizione", {
      x: 50,
      y: 750,
      size: 16,
    });
    
    page.drawText(`Data: ${new Date().toLocaleDateString("it-IT")}`, {
      x: 50,
      y: 700,
      size: 12,
    });
    
    console.log("💾 Salvataggio PDF...");
    
    const pdfBytes = await pdfDoc.save();
    
    console.log(`✅ PDF salvato: ${pdfBytes.length} bytes`);

    // Headers di risposta
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=\"TEST_PDF.pdf\"");
    res.setHeader("Content-Length", pdfBytes.length);
    
    console.log("📤 Invio PDF al client...");
    
    // Invia PDF
    res.send(Buffer.from(pdfBytes));
    
    console.log("🎉 PDF inviato con successo!");

  } catch (error) {
    console.error("❌ ERRORE CRITICO:", error);
    console.error("📊 Error name:", error.name);
    console.error("📊 Error message:", error.message);
    console.error("📊 Error stack:", error.stack);
    
    return res.status(500).json({ 
      error: "Errore interno",
      name: error.name,
      message: error.message,
      stack: error.stack
    });
  }
};
