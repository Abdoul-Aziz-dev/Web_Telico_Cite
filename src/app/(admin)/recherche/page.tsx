"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type ClientResult = { id_client: number; nom: string; prenom: string; telephone?: string | null; statut: string };
type ChambreResult = { id_chambre: number; numero: string; type_chambre: string; prix: number; statut: string };
type PaiementResult = { id_paiement: number; mois_paye: string; montant: number; numero_recu?: string | null; client?: { nom: string; prenom: string } | null };

export default function RecherchePage() {
  const [q, setQ] = useState("");
  const [clients, setClients] = useState<ClientResult[]>([]);
  const [chambres, setChambres] = useState<ChambreResult[]>([]);
  const [paiements, setPaiements] = useState<PaiementResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (query: string) => {
    if (query.trim().length < 2) { setClients([]); setChambres([]); setPaiements([]); setSearched(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setClients(data.clients || []);
      setChambres(data.chambres || []);
      setPaiements(data.paiements || []);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(q), 350);
    return () => clearTimeout(t);
  }, [q, search]);

  const total = clients.length + chambres.length + paiements.length;

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">🔎 Recherche globale</h1>
          <p className="page-subtitle">Cherchez simultanément dans les locataires, chambres et paiements.</p>
        </div>
      </div>

      <div className="panel panel-highlight">
        <input
          className="input"
          autoFocus
          placeholder="Tapez un nom, numéro de chambre, mois, numéro de reçu..."
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{ fontSize: "1.1rem", padding: "18px 20px" }}
        />
        {q.length > 0 && q.length < 2 && (
          <p style={{ color: "#64748b", fontSize: "0.85rem", marginTop: "8px" }}>Tapez au moins 2 caractères...</p>
        )}
      </div>

      {loading && <p style={{ color: "#94a3b8" }}>Recherche en cours...</p>}

      {searched && !loading && (
        <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
          {total === 0 ? `Aucun résultat pour "${q}"` : `${total} résultat(s) pour "${q}"`}
        </p>
      )}

      {clients.length > 0 && (
        <div className="panel">
          <h2 style={{ marginBottom: "16px" }}>👥 Locataires ({clients.length})</h2>
          <table className="table">
            <thead><tr><th>Nom</th><th>Téléphone</th><th>Statut</th><th></th></tr></thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id_client}>
                  <td><strong>{c.prenom} {c.nom}</strong></td>
                  <td>{c.telephone || "—"}</td>
                  <td><span className={`status-pill ${c.statut === "Actif" ? "status-complete" : "status-muted"}`} style={{ fontSize: "0.75rem" }}>{c.statut}</span></td>
                  <td><Link href={`/clients/${c.id_client}`} className="btn btn-sm btn-secondary">📄 Fiche</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {chambres.length > 0 && (
        <div className="panel">
          <h2 style={{ marginBottom: "16px" }}>🛏️ Chambres ({chambres.length})</h2>
          <table className="table">
            <thead><tr><th>N°</th><th>Type</th><th>Prix</th><th>Statut</th></tr></thead>
            <tbody>
              {chambres.map(c => (
                <tr key={c.id_chambre}>
                  <td><strong>N° {c.numero}</strong></td>
                  <td>{c.type_chambre}</td>
                  <td>{c.prix.toLocaleString()} GNF</td>
                  <td><span className={`status-pill ${c.statut === "Libre" ? "status-complete" : "status-warning"}`} style={{ fontSize: "0.75rem" }}>{c.statut}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {paiements.length > 0 && (
        <div className="panel">
          <h2 style={{ marginBottom: "16px" }}>💳 Paiements ({paiements.length})</h2>
          <table className="table">
            <thead><tr><th>Client</th><th>Mois payé</th><th>Montant</th><th>N° Reçu</th></tr></thead>
            <tbody>
              {paiements.map(p => (
                <tr key={p.id_paiement}>
                  <td><strong>{p.client?.prenom} {p.client?.nom}</strong></td>
                  <td>{p.mois_paye}</td>
                  <td><strong style={{ color: "#34d399" }}>{p.montant.toLocaleString()}</strong> GNF</td>
                  <td><span style={{ fontFamily: "monospace", fontSize: "0.82rem", color: "#94a3b8" }}>{p.numero_recu || "—"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
