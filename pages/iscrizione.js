import { useRef, useState } from "react";
import SignaturePad from "react-signature-canvas";

export default function Iscrizione() {
  const sigRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    cognome: "",
    cip: "",
    codicefiscale: "",
    email: "",
    telefono: "",
    datanascita: "",
    luogonascita: ""
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const formDataToSend = new FormData(e.target);
      
      // Verifica firma
      if (!sigRef.current || sigRef.current.isEmpty()) {
        alert("La firma è obbligatoria!");
        setLoading(false);
        return;
      }

      // Aggiungi firma
      const signature = sigRef.current
        .getTrimmedCanvas()
        .toDataURL("image/png");
      formDataToSend.append("signature", signature);

      console.log("Invio dati al server...");

      const res = await fetch("/api/genera-pdf", {
        method: "POST",
        body: formDataToSend,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Errore server: ${res.status} - ${errorText}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CIP_${formData.nome}_${formData.cognome}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      setSuccess(true);
      
      // Reset form dopo 3 secondi
      setTimeout(() => {
        setFormData({
          nome: "",
          cognome: "",
          cip: "",
          codicefiscale: "",
          email: "",
          telefono: "",
          datanascita: "",
          luogonascita: ""
        });
        sigRef.current?.clear();
        setSuccess(false);
      }, 3000);
      
    } catch (error) {
      console.error("Errore generazione PDF:", error);
      alert(`Errore: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearSignature = () => {
    sigRef.current?.clear();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Iscrizione al Sindacato
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Compila il modulo, firma digitalmente e carica i documenti d'identità. 
            Verrà generato automaticamente il PDF di iscrizione.
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-center animate-pulse">
            <div className="text-green-800 font-semibold">✅ PDF generato con successo!</div>
            <div className="text-green-600 text-sm">Il download dovrebbe essere iniziato automaticamente.</div>
          </div>
        )}

        {/* Form Container */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          
          {/* Form Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
            <h2 className="text-2xl font-bold text-white">Dati per l'iscrizione</h2>
            <p className="text-blue-100 mt-1">Tutti i campi contrassegnati con * sono obbligatori</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            
            {/* Dati Anagrafici */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                📋 Dati Anagrafici
              </h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome *
                  </label>
                  <input
                    type="text"
                    name="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Inserisci il nome"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cognome *
                  </label>
                  <input
                    type="text"
                    name="cognome"
                    value={formData.cognome}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Inserisci il cognome"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data di Nascita *
                  </label>
                  <input
                    type="date"
                    name="datanascita"
                    value={formData.datanascita}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Luogo di Nascita *
                  </label>
                  <input
                    type="text"
                    name="luogonascita"
                    value={formData.luogonascita}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Città di nascita"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Codice CIP *
                  </label>
                  <input
                    type="text"
                    name="cip"
                    value={formData.cip}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Inserisci il CIP"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Codice Fiscale *
                  </label>
                  <input
                    type="text"
                    name="codicefiscale"
                    value={formData.codicefiscale}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="RSSMRA80A01H501X"
                    pattern="[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]"
                    maxLength="16"
                    style={{ textTransform: 'uppercase' }}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="nome@email.com"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefono
                  </label>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="+39 123 456 7890"
                  />
                </div>
              </div>
            </div>

            {/* Firma Digitale */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                ✍️ Firma Digitale
              </h3>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Firma nel riquadro sottostante *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white">
                  <SignaturePad
                    ref={sigRef}
                    canvasProps={{
                      width: 700,
                      height: 200,
                      className: "signature-canvas w-full border border-gray-200 rounded bg-white cursor-crosshair"
                    }}
                  />
                </div>
                <div className="flex justify-between items-center mt-3">
                  <p className="text-xs text-gray-500">
                    💡 Usa mouse, trackpad o tocca su mobile per firmare
                  </p>
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="px-4 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    🗑️ Cancella Firma
                  </button>
                </div>
              </div>
            </div>

            {/* Upload Documenti */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                📎 Documenti d'Identità
              </h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    📄 Documento Fronte *
                  </label>
                  <input
                    type="file"
                    name="doc_front"
                    accept="image/*,application/pdf"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    📱 Formati: JPG, PNG, PDF (Max 10MB)
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    📄 Documento Retro *
                  </label>
                  <input
                    type="file"
                    name="doc_back"
                    accept="image/*,application/pdf"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    📱 Formati: JPG, PNG, PDF (Max 10MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy e Consensi */}
            <div className="mb-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="font-semibold text-blue-800 mb-3">📋 Informazioni e Consensi</h4>
                <div className="space-y-3 text-sm text-blue-700">
                  <label className="flex items-start">
                    <input type="checkbox" required className="mt-1 mr-3" />
                    <span>
                      Accetto i <strong>termini e condizioni</strong> dell'iscrizione al sindacato e 
                      autorizzo il trattamento dei dati personali secondo la normativa vigente.
                    </span>
                  </label>
                  <label className="flex items-start">
                    <input type="checkbox" className="mt-1 mr-3" />
                    <span>
                      Acconsento all'invio di comunicazioni informative via email relative 
                      alle attività sindacali (facoltativo).
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 px-6 rounded-xl text-white font-semibold text-lg transition-all duration-300 ${
                  loading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    <span>Generazione PDF in corso...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Genera PDF Iscrizione</span>
                  </div>
                )}
              </button>
            </div>

            <div className="text-center text-sm text-gray-500 mt-4">
              📄 Il PDF generato avrà nome: <strong>CIP_{formData.nome}_{formData.cognome}.pdf</strong>
            </div>
          </form>
        </div>

        {/* Footer Info */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>🔒 I tuoi dati sono protetti e utilizzati solo per l'iscrizione sindacale</p>
          <p className="mt-2">💡 Per problemi tecnici: <strong>info@myapp.com</strong></p>
        </div>
      </div>
    </div>
  );
}
