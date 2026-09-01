"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Summary = {
  clients: number;
  chambres: number;
  contrats: number;
  paiements: number;
  totalRevenue: number;
  totalDepenses: number;
  clotures: number;
  chambresOccupees: number;
  chambresLibres: number;
  tauxOccupation: number;
};

type ContratPreview = {
  id_contrat: number;
  client?: { nom: string; prenom: string } | null;
  date_debut: string;
  date_fin?: string | null;
  montant: number;
};

type PaiementPreview = {
  id_paiement: number;
  client?: { nom: string; prenom: string } | null;
  montant: number;
  date_paiement: string;
  mois_paye: string;
  mois_ym?: string | null;
};

type DepensePreview = {
  id_depense: number;
  montant: number;
  date_depense: string;
};

type MonthBar = { label: string; revenue: number; depense: number; revHeight: number; depHeight: number };

function buildMonthlyBars(paiements: PaiementPreview[], depenses: DepensePreview[]): MonthBar[] {
  const now = new Date();
  const months: { label: string; ym: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("fr-FR", { month: "short" });
    months.push({ label, ym });
  }

  const revenueByMonth: Record<string, number> = {};
  const depenseByMonth: Record<string, number> = {};
  for (const m of months) { revenueByMonth[m.ym] = 0; depenseByMonth[m.ym] = 0; }

  for (const p of paiements) {
    if (p.mois_ym && revenueByMonth[p.mois_ym] !== undefined)
      revenueByMonth[p.mois_ym] += p.montant;
  }
  for (const d of depenses) {
    const ym = new Date(d.date_depense).toISOString().slice(0, 7);
    if (depenseByMonth[ym] !== undefined) depenseByMonth[ym] += d.montant;
  }

  const allValues = months.flatMap(m => [revenueByMonth[m.ym], depenseByMonth[m.ym]]);
  const maxVal = Math.max(...allValues, 1);

  return months.map(m => ({
    label: m.label,
    revenue: revenueByMonth[m.ym],
    depense: depenseByMonth[m.ym],
    revHeight: Math.round((revenueByMonth[m.ym] / maxVal) * 140),
    depHeight: Math.round((depenseByMonth[m.ym] / maxVal) * 140),
  }));
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [latestContracts, setLatestContracts] = useState<ContratPreview[]>([]);
  const [latestPayments, setLatestPayments] = useState<PaiementPreview[]>([]);
  const [allPayments, setAllPayments] = useState<PaiementPreview[]>([]);
  const [allDepenses, setAllDepenses] = useState<DepensePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        const [summaryRes, contratsRes, paiementsRes, depensesRes] = await Promise.all([
          fetch("/api/summary", { cache: "no-store" }),
          fetch("/api/contrats", { cache: "no-store" }),
          fetch("/api/paiements", { cache: "no-store" }),
          fetch("/api/depenses", { cache: "no-store" }),
        ]);

        if (!summaryRes.ok || !contratsRes.ok || !paiementsRes.ok || !depensesRes.ok) {
          throw new Error("Impossible de charger les donnees du tableau de bord.");
        }

        const summaryData = await summaryRes.json();
        const contratsData = await contratsRes.json();
        const paiementsData = await paiementsRes.json();
        const depensesData = await depensesRes.json();

        const contractsList = (contratsData.contrats || [])
          .slice()
          .sort((a: ContratPreview, b: ContratPreview) => new Date(b.date_debut).getTime() - new Date(a.date_debut).getTime())
          .slice(0, 5);

        const paymentsList = (paiementsData.paiements || [])
          .slice()
          .sort((a: PaiementPreview, b: PaiementPreview) => new Date(b.date_paiement).getTime() - new Date(a.date_paiement).getTime())
          .slice(0, 5);

        setSummary(summaryData);
        setLatestContracts(contractsList);
        setLatestPayments(paymentsList);
        setAllPayments(paiementsData.paiements || []);
        setAllDepenses(depensesData.depenses || []);
        setError(null);
      } catch {
        setError("Impossible de charger les donnees du tableau de bord.");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const paidThisMonth = new Set(
    allPayments
      .filter(p => p.mois_ym === currentYM)
      .map(p => p.client ? `${p.client.nom} ${p.client.prenom}` : "")
  );

  const retardsCount = Math.max(0, (summary?.clients ?? 0) - paidThisMonth.size);

  const expiringSoon = latestContracts.filter(c => {
    if (!c.date_fin) return false;
    const diff = (new Date(c.date_fin).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  }).length;

  const bars = buildMonthlyBars(allPayments, allDepenses);

  function formatDate(d: string) {
    try { return new Date(d).toLocaleDateString("fr-FR"); } catch { return d; }
  }

  return (
    <div className="page">
      <div className="page-header" style={{ marginBottom: "10px" }}>
        <div>
          <h1 className="page-title" style={{ fontSize: "2rem", fontWeight: 800 }}>Tableau de bord</h1>
          <p className="page-subtitle" style={{ marginTop: "6px" }}>
            Vue d'ensemble de la Cite Telico : Suivi des flux de tresorerie, locataires et contrats.
          </p>
        </div>
        <div className="button-group">
          <Link href="/paiements" className="btn btn-primary" style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
            <span>➕</span> Enregistrer Paiement
          </Link>
          <Link href="/clients" className="btn btn-secondary" style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
            <span>👥</span> Ajouter Locataire
          </Link>
        </div>
      </div>

      <section className="grid-4">
        <article className="metric-card" style={{ borderLeft: "5px solid #38bdf8" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ color: "#94a3b8" }}>Locataires Actifs</span>
            <span style={{ fontSize: "1.5rem" }}>👥</span>
          </div>
          <strong>{loading ? "..." : summary?.clients ?? 0}</strong>
          <span style={{ fontSize: "0.85rem", color: "#34d399" }}>✨ locataires sous contrat</span>
        </article>

        <article className="metric-card" style={{ borderLeft: "5px solid #a855f7" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ color: "#94a3b8" }}>Taux d'Occupation</span>
            <span style={{ fontSize: "1.5rem" }}>📈</span>
          </div>
          <strong>{loading ? "..." : `${summary?.tauxOccupation ?? 0}%`}</strong>
          <span style={{ fontSize: "0.85rem", color: "#a855f7" }}>
            {loading ? "..." : `${summary?.chambresOccupees ?? 0} occupees sur ${summary?.chambres ?? 0}`}
          </span>
        </article>

        <article className="metric-card" style={{ borderLeft: "5px solid #34d399" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ color: "#94a3b8" }}>Revenus Encaisses</span>
            <span style={{ fontSize: "1.5rem" }}>💰</span>
          </div>
          <strong>{loading ? "..." : (summary?.totalRevenue ?? 0).toLocaleString()} <span style={{ fontSize: "1rem" }}>GNF</span></strong>
          <span style={{ fontSize: "0.85rem", color: "#34d399" }}>✔ cumule total</span>
        </article>

        <article className="metric-card" style={{ borderLeft: "5px solid #f87171" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span style={{ color: "#94a3b8" }}>Depenses Enregistrees</span>
            <span style={{ fontSize: "1.5rem" }}>📉</span>
          </div>
          <strong>{loading ? "..." : (summary?.totalDepenses ?? 0).toLocaleString()} <span style={{ fontSize: "1rem" }}>GNF</span></strong>
          <span style={{ fontSize: "0.85rem", color: "#f87171" }}>💸 charges operationnelles</span>
        </article>
      </section>

      <section className="grid-3" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
        {/* Graphique */}
        <div className="panel" style={{ padding: "24px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "1.15rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>📊 Flux financier (6 derniers mois)</span>
            <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#64748b" }}>en GNF</span>
          </h3>
          <div style={{ position: "relative", height: "200px", width: "100%", marginTop: "20px" }}>
            <svg viewBox="0 0 500 200" style={{ width: "100%", height: "100%" }}>
              <line x1="40" y1="20" x2="480" y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
              <line x1="40" y1="80" x2="480" y2="80" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
              <line x1="40" y1="140" x2="480" y2="140" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
              <line x1="40" y1="170" x2="480" y2="170" stroke="rgba(255,255,255,0.1)" />
              {bars.map((bar, i) => {
                const x = 70 + i * 68;
                const revH = Math.max(bar.revHeight, 4);
                const depH = Math.max(bar.depHeight, 4);
                return (
                  <g key={i}>
                    <rect x={x} y={170 - revH} width="16" height={revH} rx="4" fill="#38bdf8" opacity="0.85" />
                    <rect x={x + 18} y={170 - depH} width="16" height={depH} rx="4" fill="#f87171" opacity="0.85" />
                    <text x={x + 8} y="190" fill="#64748b" fontSize="10" textAnchor="middle">{bar.label}</text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div style={{ display: "flex", gap: "20px", marginTop: "14px", justifyContent: "center", fontSize: "0.85rem" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ display: "inline-block", width: "12px", height: "12px", background: "#38bdf8", borderRadius: "3px" }}></span>
              Revenus
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ display: "inline-block", width: "12px", height: "12px", background: "#f87171", borderRadius: "3px" }}></span>
              Depenses
            </span>
          </div>
        </div>

        {/* Disponibilite */}
        <div className="panel" style={{ padding: "24px", display: "flex", flexDirection: "column" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "1.15rem" }}>🧹 Disponibilite</h3>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "10px" }}>
            <div style={{ position: "relative", width: "100px", height: "100px" }}>
              <svg viewBox="0 0 36 36" style={{ width: "100%", height: "100%" }}>
                <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                <circle cx="18" cy="18" r="16" fill="none" stroke="#a855f7" strokeWidth="4"
                  strokeDasharray={`${summary?.tauxOccupation ?? 0} ${100 - (summary?.tauxOccupation ?? 0)}`}
                  strokeDashoffset="25"
                />
              </svg>
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontWeight: 800, fontSize: "1.2rem" }}>
                {loading ? "..." : `${summary?.tauxOccupation ?? 0}%`}
              </div>
            </div>
            <p style={{ fontSize: "0.9rem", color: "#94a3b8", textAlign: "center", margin: "10px 0 0 0" }}>
              {loading ? "Chargement..." : `${summary?.chambresOccupees ?? 0} occupees sur ${summary?.chambres ?? 0} disponibles.`}
            </p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center", marginTop: "8px" }}>
              <span style={{ fontSize: "0.8rem", background: "rgba(52,211,153,0.12)", color: "#34d399", padding: "4px 10px", borderRadius: "999px" }}>
                🟢 {summary?.chambresLibres ?? 0} libres
              </span>
              <span style={{ fontSize: "0.8rem", background: "rgba(248,113,113,0.12)", color: "#f87171", padding: "4px 10px", borderRadius: "999px" }}>
                🟠 {summary?.chambresOccupees ?? 0} occupees
              </span>
            </div>
          </div>
        </div>

        {/* Actions Urgentes */}
        <div className="panel" style={{ padding: "24px" }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: "1.15rem", color: "#fbbf24" }}>⚠ Actions Urgentes</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.88rem" }}>
            {loading ? (
              <p style={{ color: "#64748b" }}>Calcul en cours...</p>
            ) : (
              <>
                <Link href="/retards" style={{ textDecoration: "none" }}>
                  <div style={{ background: retardsCount > 0 ? "rgba(245,158,11,0.1)" : "rgba(52,211,153,0.08)", border: `1px solid ${retardsCount > 0 ? "rgba(245,158,11,0.2)" : "rgba(52,211,153,0.2)"}`, padding: "12px", borderRadius: "14px", cursor: "pointer" }}>
                    <strong>{retardsCount > 0 ? "⚠️ Relances Loyers" : "✅ Loyers du mois"}</strong>
                    <p style={{ margin: "4px 0 0 0", color: "#cbd5e1" }}>
                      {retardsCount > 0
                        ? `${retardsCount} locataire(s) n'ont pas encore paye ce mois-ci.`
                        : "Tous les locataires ont paye ce mois-ci."}
                    </p>
                  </div>
                </Link>

                <div style={{ background: expiringSoon > 0 ? "rgba(56,189,248,0.1)" : "rgba(52,211,153,0.08)", border: `1px solid ${expiringSoon > 0 ? "rgba(56,189,248,0.2)" : "rgba(52,211,153,0.2)"}`, padding: "12px", borderRadius: "14px" }}>
                  <strong>{expiringSoon > 0 ? "📋 Fin de Contrats" : "✅ Contrats OK"}</strong>
                  <p style={{ margin: "4px 0 0 0", color: "#cbd5e1" }}>
                    {expiringSoon > 0
                      ? `${expiringSoon} contrat(s) expirent dans moins de 30 jours.`
                      : "Aucun contrat n'expire dans les 30 prochains jours."}
                  </p>
                </div>

                {summary && summary.totalRevenue > summary.totalDepenses ? (
                  <div style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", padding: "12px", borderRadius: "14px" }}>
                    <strong style={{ color: "#34d399" }}>💰 Bilan Positif</strong>
                    <p style={{ margin: "4px 0 0 0", color: "#cbd5e1" }}>
                      Solde: +{(summary.totalRevenue - summary.totalDepenses).toLocaleString()} GNF
                    </p>
                  </div>
                ) : summary ? (
                  <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", padding: "12px", borderRadius: "14px" }}>
                    <strong style={{ color: "#f87171" }}>📉 Deficit</strong>
                    <p style={{ margin: "4px 0 0 0", color: "#cbd5e1" }}>
                      Solde: {(summary.totalRevenue - summary.totalDepenses).toLocaleString()} GNF
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </section>

      <section className="grid-2">
        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Contrats recents</h2>
            <Link href="/contrats" style={{ fontSize: "0.85rem", color: "#38bdf8" }}>Voir tout ➜</Link>
          </div>
          <table className="table">
            <thead><tr><th>ID</th><th>Client</th><th>Debut</th><th>Fin</th><th>Montant</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5}>Chargement...</td></tr>
              ) : latestContracts.length === 0 ? (
                <tr><td colSpan={5}>Aucun contrat recent.</td></tr>
              ) : latestContracts.map(c => (
                <tr key={c.id_contrat}>
                  <td style={{ color: "#64748b" }}>#{c.id_contrat}</td>
                  <td><strong>{c.client?.nom} {c.client?.prenom}</strong></td>
                  <td>{formatDate(c.date_debut)}</td>
                  <td>{c.date_fin ? formatDate(c.date_fin) : <span style={{ color: "#34d399" }}>En cours</span>}</td>
                  <td>{c.montant.toLocaleString()} <span style={{ fontSize: "0.78rem", color: "#64748b" }}>GNF</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Paiements recents</h2>
            <Link href="/paiements" style={{ fontSize: "0.85rem", color: "#38bdf8" }}>Voir tout ➜</Link>
          </div>
          <table className="table">
            <thead><tr><th>Client</th><th>Mois</th><th>Montant</th><th>Date</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4}>Chargement...</td></tr>
              ) : latestPayments.length === 0 ? (
                <tr><td colSpan={4}>Aucun paiement recent.</td></tr>
              ) : latestPayments.map(p => (
                <tr key={p.id_paiement}>
                  <td><strong>{p.client?.nom} {p.client?.prenom}</strong></td>
                  <td>{p.mois_paye}</td>
                  <td><strong style={{ color: "#34d399" }}>{p.montant.toLocaleString()}</strong> <span style={{ fontSize: "0.78rem", color: "#64748b" }}>GNF</span></td>
                  <td style={{ fontSize: "0.85rem", color: "#64748b" }}>{formatDate(p.date_paiement)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {error && (
        <section className="panel">
          <h2 style={{ color: "#f87171" }}>Erreur</h2>
          <p>{error}</p>
        </section>
      )}
    </div>
  );
}
