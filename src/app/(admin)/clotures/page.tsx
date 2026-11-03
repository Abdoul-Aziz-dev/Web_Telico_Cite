"use client";

import { useEffect, useState } from "react";
import { escapeHtml } from "../../../lib/html";

type Cloture = {
  id_cloture: number;
  mois: string;
  date_cloture: string;
  total_du: number;
  total_encaisse: number;
  total_depense: number;
  solde: number;
  statut: string;
  commentaire?: string | null;
};

export default function CloturesPage() {
  const [clotures, setClotures] = useState<Cloture[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const now = new Date();
  const [form, setForm] = useState({
    mois: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    commentaire: "",
  });
  const [report, setReport] = useState<{ total_du: number; total_encaisse: number; total_depense: number; solde: number } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/clotures");
      if (!res.ok) throw new Error("Impossible de charger l'historique des clôtures.");
      const data = await res.json();
      setClotures(data.clotures || []);
      setError(null);
    } catch {
      setError("Impossible de charger les clotures.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let active = true;
    if (!form.mois) {
      setReport(null);
      return;
    }
    fetch(`/api/clotures?mois=${encodeURIComponent(form.mois)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Calcul du bilan impossible.");
        if (active) setReport(data.report);
      })
      .catch((err: unknown) => {
        if (active) {
          setReport(null);
          setError(err instanceof Error ? err.message : "Calcul du bilan impossible.");
        }
      });
    return () => { active = false; };
  }, [form.mois]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      const res = await fetch("/api/clotures", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible de créer la clôture.");
      setForm({ mois: "", commentaire: "" });
      await load();
      setError(null);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Impossible de créer la clôture.");
    }
  }

  const totalSoldes = clotures.reduce((s, c) => s + c.solde, 0);

  function exportRapportPDF() {
    const win = window.open("", "_blank");
    if (!win) return;
    const totalEnc = clotures.reduce((s, c) => s + c.total_encaisse, 0);
    const totalDep = clotures.reduce((s, c) => s + c.total_depense, 0);
    const soldeClass = totalSoldes >= 0 ? "pos" : "neg";
    const soldePrefix = totalSoldes >= 0 ? "+" : "";

    const rows = clotures.map(c => {
      const sc = c.solde >= 0 ? "pos" : "neg";
      const sp = c.solde >= 0 ? "+" : "";
      return `<tr>
        <td><strong>${escapeHtml(c.mois)}</strong></td>
        <td>${new Date(c.date_cloture).toLocaleDateString("fr-FR")}</td>
        <td>${c.total_du.toLocaleString()}</td>
        <td class="pos">${c.total_encaisse.toLocaleString()}</td>
        <td class="neg">${c.total_depense.toLocaleString()}</td>
        <td class="${sc}">${sp}${c.solde.toLocaleString()}</td>
        <td>${escapeHtml(c.statut)}</td>
      </tr>`;
    }).join("");

    win.document.write(`<!DOCTYPE html>
<html><head><title>Rapport Mensuel - Cite Telico</title>
<style>
  body{font-family:Arial,sans-serif;color:#1e293b;padding:40px}
  h1{text-align:center;margin-bottom:4px}
  h2{font-size:1rem;color:#64748b;text-align:center;margin-bottom:30px}
  .kpis{display:flex;gap:20px;margin-bottom:30px}
  .kpi{flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;text-align:center}
  .kpi-val{font-size:1.6rem;font-weight:900;color:#0f172a}
  .kpi-lbl{font-size:0.78rem;color:#64748b;margin-top:4px}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #e2e8f0;padding:10px 14px;text-align:left;font-size:0.88rem}
  th{background:#f8fafc;font-weight:600;color:#475569}
  .pos{color:#15803d;font-weight:700}
  .neg{color:#dc2626;font-weight:700}
  .total-row td{font-weight:800;background:#f0fdf4;border-top:2px solid #86efac}
  .footer{margin-top:40px;text-align:center;font-size:0.78rem;color:#94a3b8}
</style></head>
<body onload="window.print();window.close()">
  <h1>Cite Telico - Rapport Financier Mensuel</h1>
  <h2>Genere le ${new Date().toLocaleDateString("fr-FR")} - ${clotures.length} cloture(s)</h2>
  <div class="kpis">
    <div class="kpi"><div class="kpi-val">${totalEnc.toLocaleString()} GNF</div><div class="kpi-lbl">Total encaisse</div></div>
    <div class="kpi"><div class="kpi-val">${totalDep.toLocaleString()} GNF</div><div class="kpi-lbl">Total depenses</div></div>
    <div class="kpi"><div class="kpi-val ${soldeClass}">${soldePrefix}${totalSoldes.toLocaleString()} GNF</div><div class="kpi-lbl">Solde net global</div></div>
  </div>
  <table>
    <thead><tr><th>Mois</th><th>Date cloture</th><th>Total du</th><th>Encaisse</th><th>Depenses</th><th>Solde</th><th>Statut</th></tr></thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="3"><strong>TOTAUX</strong></td>
        <td class="pos">${totalEnc.toLocaleString()} GNF</td>
        <td class="neg">${totalDep.toLocaleString()} GNF</td>
        <td class="${soldeClass}">${soldePrefix}${totalSoldes.toLocaleString()} GNF</td>
        <td>-</td>
      </tr>
    </tbody>
  </table>
  <div class="footer">Cite Telico &copy; ${new Date().getFullYear()} - Document confidentiel</div>
</body></html>`);
    win.document.close();
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clotures mensuelles</h1>
          <p className="page-subtitle">Enregistrez et suivez les bilans mensuels de tresorerie.</p>
        </div>
        <div className="button-group">
          <button className="btn btn-primary" form="cloture-form">📊 Nouvelle clôture</button>
          <button className="btn btn-secondary" onClick={exportRapportPDF}>🖨️ Rapport mensuel PDF</button>
        </div>
      </div>

      <section className="grid-3">
        <article className="metric-card" style={{ borderLeft: "5px solid #34d399" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#94a3b8" }}>Total encaisse</span>
            <span>💰</span>
          </div>
          <strong>{clotures.reduce((s, c) => s + c.total_encaisse, 0).toLocaleString()} <span style={{ fontSize: "0.9rem" }}>GNF</span></strong>
          <span style={{ fontSize: "0.85rem", color: "#34d399" }}>cumule sur {clotures.length} mois</span>
        </article>
        <article className="metric-card" style={{ borderLeft: "5px solid #f87171" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#94a3b8" }}>Total depense</span>
            <span>📉</span>
          </div>
          <strong>{clotures.reduce((s, c) => s + c.total_depense, 0).toLocaleString()} <span style={{ fontSize: "0.9rem" }}>GNF</span></strong>
          <span style={{ fontSize: "0.85rem", color: "#f87171" }}>charges cumulees</span>
        </article>
        <article className="metric-card" style={{ borderLeft: `5px solid ${totalSoldes >= 0 ? "#38bdf8" : "#f87171"}` }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#94a3b8" }}>Solde net global</span>
            <span>⚖️</span>
          </div>
          <strong style={{ color: totalSoldes >= 0 ? "#34d399" : "#f87171" }}>{totalSoldes.toLocaleString()} <span style={{ fontSize: "0.9rem" }}>GNF</span></strong>
          <span style={{ fontSize: "0.85rem", color: totalSoldes >= 0 ? "#34d399" : "#f87171" }}>{totalSoldes >= 0 ? "✅ Bilan positif" : "⚠️ Deficit"}</span>
        </article>
      </section>

      <section className="grid-2">
        <div className="panel">
          <h2>📊 Nouvelle cloture</h2>
          <form id="cloture-form" className="form-grid" onSubmit={save}>
            <div className="form-field">
              <label>Mois</label>
              <input className="input" type="month" value={form.mois} onChange={e => setForm({ ...form, mois: e.target.value })} required />
            </div>
            {report && (
              <div className="panel" style={{ gridColumn: "1 / -1", margin: 0 }}>
                <strong>Bilan calculé depuis les opérations enregistrées</strong>
                <p>Total dû : {report.total_du.toLocaleString()} GNF</p>
                <p>Encaissé : {report.total_encaisse.toLocaleString()} GNF</p>
                <p>Dépenses : {report.total_depense.toLocaleString()} GNF</p>
                <p>Solde : <strong style={{ color: report.solde >= 0 ? "#34d399" : "#f87171" }}>{report.solde.toLocaleString()} GNF</strong></p>
              </div>
            )}
            <div className="form-field">
              <label>Commentaire (optionnel)</label>
              <input className="input" value={form.commentaire} onChange={e => setForm({ ...form, commentaire: e.target.value })} placeholder="Remarques supplementaires..." />
            </div>
            <button className="btn btn-primary" type="submit" disabled={!report}>✅ Créer la clôture calculée</button>
            {error && <p className="status-pill status-warning">{error}</p>}
          </form>
        </div>

        <div className="panel">
          <h2>Historique des clotures</h2>
          {loading ? (
            <p style={{ color: "#94a3b8" }}>Chargement...</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Mois</th>
                  <th>Encaisse</th>
                  <th>Depense</th>
                  <th>Solde</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {clotures.map(cloture => (
                  <tr key={cloture.id_cloture}>
                    <td><strong>{cloture.mois}</strong></td>
                    <td style={{ color: "#34d399" }}>{cloture.total_encaisse.toLocaleString()}</td>
                    <td style={{ color: "#f87171" }}>{cloture.total_depense.toLocaleString()}</td>
                    <td>
                      <strong style={{ color: cloture.solde >= 0 ? "#34d399" : "#f87171" }}>
                        {cloture.solde >= 0 ? "+" : ""}{cloture.solde.toLocaleString()}
                      </strong>
                    </td>
                    <td>
                      <span className={`status-pill ${cloture.statut === "Valide" ? "status-complete" : "status-warning"}`}>
                        {cloture.statut}
                      </span>
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
