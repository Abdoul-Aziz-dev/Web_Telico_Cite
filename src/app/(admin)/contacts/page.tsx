"use client";
import { useEffect, useState } from "react";

type Demande = {
  id_demande: number;
  nom: string;
  email: string;
  type_chambre: string;
  message: string;
  date_demande: string;
  traitee: boolean;
};

export default function ContactsPage() {
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Demande | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/contact");
      const data = await res.json();
      setDemandes(data.demandes || []);
      setError(null);
    } catch {
      setError("Impossible de charger les demandes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const nonTraitees = demandes.filter((d) => !d.traitee).length;

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Demandes de contact</h1>
          <p className="page-subtitle">Messages reçus depuis le formulaire du site public.</p>
        </div>
        {nonTraitees > 0 && (
          <div className="status-pill status-warning" style={{ fontSize: "1rem", padding: "12px 20px" }}>
            📬 {nonTraitees} demande(s) non traitée(s)
          </div>
        )}
      </div>

      <div className="panel">
        {loading ? (
          <p style={{ color: "#94a3b8" }}>Chargement...</p>
        ) : error ? (
          <p className="status-pill status-warning">{error}</p>
        ) : demandes.length === 0 ? (
          <p style={{ color: "#64748b", textAlign: "center", padding: "40px" }}>Aucune demande reçue pour le moment.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nom</th>
                <th>Email</th>
                <th>Type chambre</th>
                <th>Date</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {demandes.map((d) => (
                <tr key={d.id_demande}>
                  <td style={{ color: "#64748b" }}>{d.id_demande}</td>
                  <td><strong>{d.nom}</strong></td>
                  <td style={{ color: "#38bdf8" }}>{d.email}</td>
                  <td>{d.type_chambre}</td>
                  <td style={{ fontSize: "0.85rem", color: "#64748b" }}>{new Date(d.date_demande).toLocaleDateString("fr-FR")}</td>
                  <td>
                    <span className={`status-pill ${d.traitee ? "status-muted" : "status-warning"}`}>
                      {d.traitee ? "Traitée" : "En attente"}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-secondary" onClick={() => setSelected(d)}>
                      👁️ Voir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal détail */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: "20px" }}>
          <div className="panel" style={{ maxWidth: "600px", width: "100%", padding: "36px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ margin: 0 }}>📩 Demande de {selected.nom}</h2>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: "1.5rem", color: "#64748b", padding: 0 }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.95rem" }}>
              <p style={{ margin: 0 }}>📧 <strong>Email :</strong> <a href={`mailto:${selected.email}`} style={{ color: "#38bdf8" }}>{selected.email}</a></p>
              <p style={{ margin: 0 }}>🏠 <strong>Type recherché :</strong> {selected.type_chambre}</p>
              <p style={{ margin: 0 }}>📅 <strong>Date :</strong> {new Date(selected.date_demande).toLocaleDateString("fr-FR")}</p>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px", padding: "16px", marginTop: "8px" }}>
                <p style={{ margin: 0, color: "#cbd5e1", lineHeight: 1.7 }}>{selected.message}</p>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
