import { useRef, useState } from "react";
import SignaturePad from "react-signature-canvas";

export default function Iscrizione() {
  const sigRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    grado: "",
    nome: "",
    cognome: "",
    luogonascita: "",
    provincia: "",
    datanascita: "",
    cip: "",
    codicefiscale: "",
    reparto: "",
    cap: "",
    regione: "",
    citta: "",
    provinciaresidenza: "",
    cellulare: "",
    email: "",
    ausiliaria: "NO"
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
          grado: "",
          nome: "",
          cognome: "",
          luogonascita: "",
          provincia: "",
          datanascita: "",
          cip: "",
          codicefiscale: "",
          reparto: "",
          cap: "",
          regione: "",
          citta: "",
          provinciaresidenza: "",
          cellulare: "",
          email: "",
          ausiliaria: "NO"
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-red-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Header con logo SIM */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-green-600 via-white to-red-600 rounded-full mb-4 shadow-lg">
            <div className="text-2xl">🇮🇹</div>
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Sindacato Italiano Militari Carabinieri
          </h1>
          <h2 className="text-2xl font-semibold text-blue-700 mb-4">
            S.I.M. CARABINIERI
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Delega di adesione - Compila tutti i campi, firma digitalmente e carica i documenti d'identità. 
            Verrà generato automaticamente il PDF ufficiale.
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-center animate-pulse">
            <div className="text-green-800 font-semibold">✅ PDF delega generato con successo!</div>
            <div className="text-green-600 text-sm">Il download è iniziato automaticamente.</div>
          </div>
        )}

        {/* Form Container */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          
          {/* Form Header */}
          <div className="bg-gradient-to-r from-green-600 via-white to-red-600 px-8 py-6">
            <h2 className="text-2xl font-bold text-gray-800 text-center">DELEGA DI ADESIONE</h2>
            <p className="text-gray-700 mt-1 text-center">Via Magnagrecia n.13, 00184 Roma - Codice Fiscale: 96408280582</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8">
            
            {/* Grado */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                🎖️ Dati di Servizio
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grado *
                  </label>
                  <select
                    name="grado"
                    value={formData.grado}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                  >
                    <option value="">Seleziona grado</option>
                    <option value="Car.">Car. (Carabiniere)</option>
                    <option value="Car. Sc.">Car. Sc. (Carabiniere Scelto)</option>
                    <option value="App. Sc.">App. Sc. (Appuntato Scelto)</option>
                    <option value="App.">App. (Appuntato)</option>
                    <option value="Brig.">Brig. (Brigadiere)</option>
                    <option value="Brig. Capo">Brig. Capo (Brigadiere Capo)</option>
                    <option value="M.llo">M.llo (Maresciallo)</option>
                    <option value="M.llo Ord.">M.llo Ord. (Maresciallo Ordinario)</option>
                    <option value="M.llo Capo">M.llo Capo (Maresciallo Capo)</option>
                    <option value="M.llo Magg.">M.llo Magg. (Maresciallo Maggiore)</option>
                    <option value="Lgt.">Lgt. (Luogotenente)</option>
                    <option value="S.Lgt.">S.Lgt. (Sottotenente)</option>
                    <option value="Ten.">Ten. (Tenente)</option>
                    <option value="Cap.">Cap. (Capitano)</option>
                    <option value="Magg.">Magg. (Maggiore)</option>
                    <option value="Ten. Col.">Ten. Col. (Tenente Colonnello)</option>
                    <option value="Col.">Col. (Colonnello)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    In Ausiliaria
                  </label>
                  <div className="flex gap-4 pt-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="ausiliaria"
                        value="SI"
                        checked={formData.ausiliaria === "SI"}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      <span>SI</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="ausiliaria"
                        value="NO"
                        checked={formData.ausiliaria === "NO"}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      <span>NO</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

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
                    Provincia Nascita *
                  </label>
                  <input
                    type="text"
                    name="provincia"
                    value={formData.provincia}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="RM"
                    maxLength="2"
                    style={{ textTransform: 'uppercase' }}
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
              </div>
            </div>

            {/* Dati Servizio */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                🏛️ Dati di Servizio
              </h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reparto di Appartenenza *
                  </label>
                  <input
                    type="text"
                    name="reparto"
                    value={formData.reparto}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Es: Stazione CC di Roma"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CAP Reparto *
                  </label>
                  <input
                    type="text"
                    name="cap"
                    value={formData.cap}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="00100"
                    pattern="[0-9]{5}"
                    maxLength="5"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Regione *
                  </label>
                  <select
                    name="regione"
                    value={formData.regione}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                  >
                    <option value="">Seleziona regione</option>
                    <option value="Lazio">Lazio</option>
                    <option value="Lombardia">Lombardia</option>
                    <option value="Campania">Campania</option>
                    <option value="Sicilia">Sicilia</option>
                    <option value="Veneto">Veneto</option>
                    <option value="Emilia-Romagna">Emilia-Romagna</option>
                    <option value="Piemonte">Piemonte</option>
                    <option value="Puglia">Puglia</option>
                    <option value="Toscana">Toscana</option>
                    <option value="Calabria">Calabria</option>
                    <option value="Sardegna">Sardegna</option>
                    <option value="Liguria">Liguria</option>
                    <option value="Marche">Marche</option>
                    <option value="Abruzzo">Abruzzo</option>
                    <option value="Friuli-Venezia Giulia">Friuli-Venezia Giulia</option>
                    <option value="Trentino-Alto Adige">Trentino-Alto Adige</option>
                    <option value="Umbria">Umbria</option>
                    <option value="Basilicata">Basilicata</option>
                    <option value="Molise">Molise</option>
                    <option value="Valle d'Aosta">Valle d'Aosta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Città e Provincia *
                  </label>
                  <input
                    type="text"
                    name="citta"
                    value={formData.citta}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Roma (RM)"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Contatti */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b border-gray-200 pb-2">
                📞 Dati di Contatto
              </h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cellulare *
                  </label>
                  <input
                    type="tel"
                    name="cellulare"
                    value={formData.cellulare}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="+39 123 456 7890"
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
                      height: 150,
                      className: "signature-canvas w-full border border-gray-200 rounded bg-white cursor-crosshair"
                    }}
                  />
                </div>
                <div className="flex justify-between items-center mt-3">
                  <p className="text-xs text-gray-500">
                    💡 Firmare con mouse, trackpad o dito su dispositivi touch
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
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                  <label className="block text-sm font-medium text-blue-800 mb-3">
                    📄 Documento Fronte *
                  </label>
                  <input
                    type="file"
                    name="doc_front"
                    accept="image/*,application/pdf"
                    className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                    required
                  />
                  <p className="text-xs text-blue-600 mt-2">
                    📱 Carta d'identità, patente o passaporto (fronte)
                  </p>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                  <label className="block text-sm font-medium text-blue-800 mb-3">
                    📄 Documento Retro *
                  </label>
                  <input
                    type="file"
                    name="doc_back"
                    accept="image/*,application/pdf"
                    className="w-full px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                    required
                  />
                  <p className="text-xs text-blue-600 mt-2">
                    📱 Retro del documento (Max 10MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy e Consensi */}
            <div className="mb-8">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h4 className="font-semibold text-yellow-800 mb-3">📋 Consensi Obbligatori</h4>
                <div className="space-y-4 text-sm text-yellow-800">
                  <label className="flex items-start">
                    <input type="checkbox" required className="mt-1 mr-3 text-blue-600" />
                    <span>
                      Dichiaro di aver preso visione dello <strong>Statuto</strong> presente sul sito 
                      <strong> www.simcarabinieri.com</strong> e dell'allegato "A" relativo alle competenze stipendiali.
                    </span>
                  </label>
                  <label className="flex items-start">
                    <input type="checkbox" required className="mt-1 mr-3 text-blue-600" />
                    <span>
                      Accetto l'<strong>informativa sul trattamento dei dati personali</strong> secondo 
                      il Reg. UE 2016/679 (GDPR) come da documento allegato.
                    </span>
                  </label>
                  <label className="flex items-start">
                    <input type="checkbox" required className="mt-1 mr-3 text-blue-600" />
                    <span>
                      Prendo atto che è ammessa <strong>un'unica delega</strong> su una singola 
                      retribuzione o trattamento pensionistico (art. 1, comma 4 della Legge).
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
                    : "bg-gradient-to-r from-green-600 via-blue-600 to-red-600 hover:from-green-700 hover:via-blue-700 hover:to-red-700 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    <span>Generazione delega in corso...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>🇮🇹 Genera Delega Ufficiale SIM</span>
                  </div>
                )}
              </button>
            </div>

            <div className="text-center text-sm text-gray-500 mt-4">
              📄 Il PDF generato: <strong>CIP_{formData.nome}_{formData.cognome}.pdf</strong>
              <br />
              📧 Da inviare a: <strong>tesseramenti@simcarabinieri.cc</strong>
            </div>
          </form>
        </div>

        {/* Footer Info */}
        <div className="text-center mt-8 text-sm text-gray-500 space-y-2">
          <p>🏛️ <strong>S.I.M. Carabinieri</strong> - Via Magnagrecia n.13, 00184 Roma</p>
          <p>📧 Codice Fiscale: <strong>96408280582</strong></p>
          <p>🔒 Dati protetti secondo Reg. UE 2016/679 (GDPR)</p>
        </div>
      </div>
    </div>
  );
}
