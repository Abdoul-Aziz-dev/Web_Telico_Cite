"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type LocataireRetard = {
  id_client: number;
  nom: string;
  prenom: string;
  telephone?: string | null;
  chambre?: { numero: string; type_chambre: string } | null;
  loyer: number;
  date_entree: string;
  relance: boolean;
};

export default function RetardsPage() {
  const [retards, setRetards] = useState<LocataireRetard[]>([]);
  const [moisCourant, setMoisCourant] = useState("");
  const [loading, setLoading] = useState(true);
  const [relancingId, setRelancingId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/retards");
      const d = await res.json();
      setRetards(d.enRetard || []);
      setMoisCourant(d.mois || "");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function marquerRelance(id: number) {
    setRelancingId(id);
    try {
      await fetch("/api/admin/retards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id_client: id, mois: moisCourant }),
      });
      setRetards(prev => prev.map(r => r.id_client === id ? { ...r, relance: true } : r));
    } finally {
      setRelancingId(null);
    }
  }

  function fmt(d: string) { return new Date(d).toLocaleDateString("fr-FR"); }

  const MOIS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
  const labelMois = moisCourant
    ? `${MOIS_FR[parseInt(moisCourant.split("-")[1]) - 1]} ${moisCourant.split("-")[0]}`
    : "";

  const totalManquant = retards.reduce((s, r) => s + r.loyer, 0);
  const relancesCount = retards.filter(r => r.relance).length;

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">⚠️ Loyers en retard</h1>
          <p className="page-subtitle">Locataires actifs n'ayant pas encore payé pour {labelMois || "ce mois"}.</p>
        </div>
        <Link href="/paiements" className="btn btn-primary">💳 Enregistrer un paiement</Link>
      </div>

      <section className="grid-4" style={{ marginBottom: "24px" }}>
        <article className="metric-card" style={{ borderLeft: "5px solid #f87171" }}>
          <span style={{ color: "#94a3b8" }}>En retard</span>
          <strong style={{ color: "#f87171" }}>{loading ? "..." : retards.length}</strong>
          <span style={{ fontSize: "0.82rem", color: "#64748b" }}>locataire(s)</span>
        </article>
        <article className="metric-card" style={{ borderLeft: "5px solid #fbbf24" }}>
          <span style={{ color: "#94a3b8" }}>Montant manquant</span>
          <strong style={{ color: "#fbbf24" }}>{loading ? "..." : totalManquant.toLocaleString()} <span style={{ fontSize: "0.9rem" }}>GNF</span></strong>
          <span style={{ fontSize: "0.82rem", color: "#64748b" }}>à encaisser</span>
        </article>
        <article className="metric-card" style={{ borderLeft: "5px solid #38bdf8" }}>
          <span style={{ color: "#94a3b8" }}>Relancés</span>
          <strong style={{ color: "#38bdf8" }}>{relancesCount}</strong>
          <span style={{ fontSize: "0.82rem", color: "#64748b" }}>enregistré(s) en base</span>
        </article>
        <article className="metric-card" style={{ borderLeft: "5px solid #a855f7" }}>
          <span style={{ color: "#94a3b8" }}>Restants</span>
          <strong style={{ color: "#a855f7" }}>{retards.length - relancesCount}</strong>
          <span style={{ fontSize: "0.82rem", color: "#64748b" }}>à relancer</span>
        </article>
      </section>

      <div className="panel">
        {loading ? (
          <p style={{ color: "#94a3b8" }}>Calcul en cours...</p>
        ) : retards.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <p style={{ fontSize: "2rem", marginBottom: "12px" }}>🎉</p>
            <p style={{ fontSize: "1.1rem", color: "#34d399", fontWeight: 600 }}>Tous les locataires ont payé pour {labelMois} !</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Locataire</th><th>Chambre</th><th>Téléphone</th><th>Loyer dû</th><th>Entrée le</th><th>Statut relance</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {retards.map(r => (
                <tr key={r.id_client}>
                  <td><strong>{r.prenom} {r.nom}</strong></td>
                  <td>{r.chambre ? `N° ${r.chambre.numero} — ${r.chambre.type_chambre}` : "—"}</td>
                  <td>{r.telephone || "—"}</td>
                  <td><strong style={{ color: "#fbbf24" }}>{r.loyer.toLocaleString()}</strong> <span style={{ fontSize: "0.78rem", color: "#64748b" }}>GNF</span></td>
                  <td style={{ fontSize: "0.85rem", color: "#64748b" }}>{fmt(r.date_entree)}</td>
                  <td>
                    {r.relance
                      ? <span className="status-pill status-complete" style={{ fontSize: "0.75rem" }}>✅ Relancé</span>
                      : <span className="status-pill status-warning" style={{ fontSize: "0.75rem" }}>⏳ En attente</span>}
                  </td>
                  <td>
                    <div className="actions">
                      <Link href={`/clients/${r.id_client}`} className="btn btn-sm btn-secondary">📄 Fiche</Link>
                      <Link href="/paiements" className="btn btn-sm btn-secondary" style={{ background: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.2)" }}>💳 Payer</Link>
                      {r.telephone && (
                        <a
                          href={`https://wa.me/${r.telephone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Bonjour ${r.prenom} ${r.nom}, nous vous contactons concernant la Cité Telico pour le règlement de votre loyer de ${labelMois} (${r.loyer.toLocaleString()} GNF). Merci de régulariser la situation dès que possible. Cordialement.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-secondary"
                          style={{ background: "rgba(37,211,102,0.15)", color: "#25D366", border: "1px solid rgba(37,211,102,0.3)" }}
                        >
                          💬 WhatsApp
                        </a>
                      )}
                      {!r.relance && (
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => marquerRelance(r.id_client)}
                          disabled={relancingId === r.id_client}
                          style={{ background: "rgba(56,189,248,0.1)", color: "#38bdf8", border: "1px solid rgba(56,189,248,0.2)" }}
                        >
                          {relancingId === r.id_client ? "⏳" : "📞 Marquer Relancé"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
