"use client";
import { useEffect, useState } from "react";

type Chambre = {
  id_chambre: number;
  numero: string;
  type_chambre: string;
  prix: number;
  statut: string;
  photo?: string | null;
};

export default function ChambresPage() {
  const [chambres, setChambres] = useState<Chambre[]>([]);
  const [filteredChambres, setFilteredChambres] = useState<Chambre[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Chambre | null>(null);
  const [form, setForm] = useState({ numero: "", type_chambre: "Standard", prix: 0, statut: "Libre" });
  const [filterStatut, setFilterStatut] = useState("Tous");
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/chambres");
      const data = await res.json();
      const list = data.chambres || [];
      setChambres(list);
      setFilteredChambres(list);
      setError(null);
    } catch {
      setError("Impossible de charger les chambres.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    setFilteredChambres(filterStatut === "Tous" ? chambres : chambres.filter(c => c.statut === filterStatut));
  }, [chambres, filterStatut]);

  function resetForm() {
    setEditing(null);
    setForm({ numero: "", type_chambre: "Standard", prix: 0, statut: "Libre" });
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      if (editing) {
        await fetch(`/api/chambres/${editing.id_chambre}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
        setEditing(null);
      } else {
        await fetch("/api/chambres", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      }
      resetForm();
      load();
      setError(null);
    } catch {
      setError("Impossible de sauvegarder la chambre.");
    }
  }

  function handleEdit(chambre: Chambre) {
    setEditing(chambre);
    setForm({ numero: chambre.numero, type_chambre: chambre.type_chambre, prix: chambre.prix, statut: chambre.statut });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleUploadPhoto(chambre: Chambre, file: File) {
    setUploadingId(chambre.id_chambre);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("id_chambre", String(chambre.id_chambre));
      const res = await fetch("/api/chambres/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error();
      load();
    } catch {
      setError("Impossible d'uploader la photo.");
    } finally {
      setUploadingId(null);
    }
  }

  async function handleLiberer(chambre: Chambre) {
    if (!confirm(`Voulez-vous libérer la chambre N° ${chambre.numero} ?`)) return;
    try {
      await fetch(`/api/chambres/${chambre.id_chambre}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...chambre, statut: "Libre" }) });
      load();
    } catch {
      setError("Impossible de libérer la chambre.");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Supprimer définitivement cette chambre ?")) return;
    try {
      await fetch(`/api/chambres/${id}`, { method: "DELETE" });
      load();
    } catch {
      setError("Impossible de supprimer la chambre.");
    }
  }

  function exportAvailableRoomsPDF() {
    const available = chambres.filter(c => c.statut === "Libre");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Cité Telico - Chambres Disponibles</title>
      <style>body{font-family:Arial,sans-serif;color:#1e293b;padding:40px}h1{text-align:center;margin-bottom:5px}.sub{text-align:center;color:#64748b;font-size:0.9rem;margin-bottom:30px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #e2e8f0;padding:12px 16px;text-align:left;font-size:0.9rem}th{background:#f8fafc;font-weight:600;color:#475569}tr:nth-child(even){background:#f8fafc}.footer{margin-top:50px;text-align:center;font-size:0.8rem;color:#94a3b8}</style>
      </head><body onload="window.print();window.close()">
        <h1>Cité Telico</h1>
        <div class="sub">Chambres disponibles — ${new Date().toLocaleDateString("fr-FR")}</div>
        <table><thead><tr><th>Chambre</th><th>Type</th><th>Prix mensuel (GNF)</th></tr></thead><tbody>
        ${available.map(c => `<tr><td><strong>N° ${c.numero}</strong></td><td>${c.type_chambre}</td><td>${c.prix.toLocaleString()} GNF</td></tr>`).join("")}
        </tbody></table>
        <div class="footer">Cité Telico &copy; ${new Date().getFullYear()}</div>
      </body></html>
    `);
    win.document.close();
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestion des chambres</h1>
          <p className="page-subtitle">Supervisez la disponibilité des chambres, leur tarification et leur statut en temps réel.</p>
        </div>
        <div className="button-group">
          <button className="btn btn-primary" form="room-form">{editing ? "💾 Modifier la chambre" : "➕ Nouvelle chambre"}</button>
          <button className="btn btn-secondary" type="button" onClick={exportAvailableRoomsPDF}>🖨️ Exporter PDF</button>
        </div>
      </div>

      <section className="panel panel-highlight" style={{ display: "flex", gap: "30px", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2>Filtrer chambres</h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.85rem" }}>Visualisez les chambres selon leur état d'occupation.</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {["Tous", "Libre", "Occupée"].map(opt => (
            <button key={opt} className={`btn ${filterStatut === opt ? "btn-primary" : "btn-secondary"}`} onClick={() => setFilterStatut(opt)} style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
              {opt === "Libre" ? "🟢 Libre" : opt === "Occupée" ? "⚠️ Occupée" : "📋 Tous"}
            </button>
          ))}
        </div>
      </section>

      <section className="grid-2">
        <div className="panel">
          <h2>{editing ? `✏️ Modifier chambre N° ${editing.numero}` : "➕ Nouvelle chambre"}</h2>
          <form id="room-form" className="form-grid" onSubmit={save}>
            <div className="form-field">
              <label>Numéro de chambre</label>
              <input className="input" value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} required />
            </div>
            <div className="form-field">
              <label>Type de chambre</label>
              <select className="select" value={form.type_chambre} onChange={e => setForm({ ...form, type_chambre: e.target.value })}>
                <option value="Chambre simple">Chambre simple</option>
                <option value="Chambre douce meublée">Chambre douce meublée</option>
                <option value="Chambre douce non meublée">Chambre douce non meublée</option>
                <option value="Chambre salon">Chambre salon</option>
              </select>
            </div>
            <div className="form-field">
              <label>Prix mensuel (GNF)</label>
              <input className="input" type="number" min="0" value={form.prix} onChange={e => setForm({ ...form, prix: Number(e.target.value) })} required />
            </div>
            <div className="form-field">
              <label>Statut</label>
              <select className="select" value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })}>
                <option value="Libre">Libre</option><option value="Occupée">Occupée</option>
              </select>
            </div>
            <div className="button-group">
              <button className="btn btn-primary" type="submit">{editing ? "Enregistrer" : "Créer"}</button>
              {editing && <button className="btn btn-secondary" type="button" onClick={resetForm}>Annuler</button>}
            </div>
            {error && <p className="status-pill status-warning">{error}</p>}
          </form>
        </div>

        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <h2 style={{ margin: 0 }}>Inventaire ({filteredChambres.length} chambres)</h2>
            <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
              🟢 {chambres.filter(c => c.statut === "Libre").length} libres · ⚠️ {chambres.filter(c => c.statut === "Occupée").length} occupées
            </span>
          </div>
          {loading ? (
            <p style={{ color: "#94a3b8" }}>Chargement des chambres...</p>
          ) : (
            <table className="table">
              <thead>
                <tr><th>N°</th><th>Photo</th><th>Type</th><th>Prix / mois</th><th>Statut</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filteredChambres.map(row => (
                  <tr key={row.id_chambre}>
                    <td><strong>{row.numero}</strong></td>
                    <td>
                      {row.photo
                        ? <img src={row.photo} alt="chambre" style={{ width: 48, height: 36, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)" }} />
                        : <span style={{ color: "#475569", fontSize: "0.8rem" }}>—</span>}
                    </td>
                    <td>{row.type_chambre}</td>
                    <td>{row.prix.toLocaleString()} <span style={{ fontSize: "0.8rem", color: "#64748b" }}>GNF</span></td>
                    <td>
                      <span className={`status-pill ${row.statut === "Libre" ? "status-complete" : "status-warning"}`}>
                        {row.statut === "Libre" ? "🟢 Libre" : "⚠️ Occupée"}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(row)}>✏️</button>
                        <label className="btn btn-sm btn-secondary" title="Changer la photo" style={{ cursor: "pointer", display: "inline-flex", alignItems: "center" }}>
                          {uploadingId === row.id_chambre ? "⏳" : "🖼️"}
                          <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) handleUploadPhoto(row, e.target.files[0]); e.target.value = ""; }} />
                        </label>
                        {row.statut === "Occupée" && (
                          <button className="btn btn-sm btn-secondary" onClick={() => handleLiberer(row)} style={{ background: "rgba(52,211,153,0.12)", color: "#34d399", border: "1px solid rgba(52,211,153,0.2)" }}>🔓 Libérer</button>
                        )}
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(row.id_chambre)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}
