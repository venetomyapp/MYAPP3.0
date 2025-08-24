import { useRef, useState } from "react";
import SignaturePad from "react-signature-canvas";

export default function Iscrizione() {
  const sigRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);
    const signature = sigRef.current
      .getTrimmedCanvas()
      .toDataURL("image/png");
    formData.append("signature", signature);

    const res = await fetch("/api/genera-pdf", {
      method: "POST",
      body: formData,
    });

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "delega.pdf";
    a.click();
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: "800px", margin: "auto", padding: "20px" }}>
      <h1>Iscrizione al Sindacato</h1>
      <form onSubmit={handleSubmit}>
        <input name="nome" placeholder="Nome" required />
        <input name="cognome" placeholder="Cognome" required />
        <input name="cip" placeholder="CIP" required />
        <input name="codicefiscale" placeholder="Codice Fiscale" required />
        <input name="email" placeholder="Email" type="email" required />
        <br /><br />

        <label>Firma digitale</label>
        <SignaturePad
          ref={sigRef}
          canvasProps={{ width: 500, height: 200, className: "sigCanvas" }}
        />
        <button type="button" onClick={() => sigRef.current.clear()}>
          Cancella firma
        </button>
        <br /><br />

        <label>Documento fronte</label>
        <input
          type="file"
          name="doc_front"
          accept="image/*,application/pdf"
          required
        />
        <label>Documento retro</label>
        <input
          type="file"
          name="doc_back"
          accept="image/*,application/pdf"
          required
        />
        <br /><br />

        <button type="submit" disabled={loading}>
          {loading ? "Generazione..." : "Genera PDF"}
        </button>
      </form>
    </div>
  );
}
