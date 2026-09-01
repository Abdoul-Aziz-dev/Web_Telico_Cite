"use client";
import { useEffect, useState } from "react";

const ITEMS_PAR_PAGE = 10;

type Depense = {
  id_depense: number;
  libelle: string;
  montant: number;
  date_depense: string;
};

export default function DepensesPage() {
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Depense | null>(null);
  const [form, setForm] = useState({ libelle: "", montant: 0, date_depense: new Date().toISOString().slice(0, 10) });
  const [filterDebut, setFilterDebut] = useState("");
  const [filterFin, setFilterFin] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/depenses");
      const data = await res.json();
      setDepenses(data.depenses || []);
      setError(null);
    } catch {
      setError("Impossible de charger les dépenses.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { setPage(1); }, [filterDebut, filterFin, search]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      if (editing) {
        await fetch(`/api/depenses/${editing.id_depense}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
        setEditing(null);
      } else {
        await fetch("/api/depenses", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      }
      setForm({ libelle: "", montant: 0, date_depense: new Date().toISOString().slice(0, 10) });
      load();
      setError(null);
    } catch {
      setError("Impossible d'enregistrer la dépense.");
    }
  }

  function handleEdit(dep: Depense) {
    setEditing(dep);
    setForm({ libelle: dep.libelle, montant: dep.montant, date_depense: dep.date_depense.slice(0, 10) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: number) {
    if (!confirm("Supprimer cette dépense ?")) return;
    try {
      await fetch(`/api/depenses/${id}`, { method: "DELETE" });
      load();
    } catch {
      setError("Impossible de supprimer la dépense.");
    }
  }

  const filtered = depenses.filter((d) => {
    const date = new Date(d.date_depense);
    const matchSearch = !search || d.libelle.toLowerCase().includes(search.toLowerCase());
    const matchDebut = !filterDebut || date >= new Date(filterDebut);
    const matchFin = !filterFin || date <= new Date(filterFin);
    return matchSearch && matchDebut && matchFin;
  });

  const totalFiltre = filtered.reduce((s, d) => s + d.montant, 0);
  const totalPages = Math.ceil(filtered.length / ITEMS_PAR_PAGE);
  const paged = filtered.slice((page - 1) * ITEMS_PAR_PAGE, page * ITEMS_PAR_PAGE);

  function exportPDF() {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Dépenses - Cité Telico</title>
      <style>
        body{font-family:Arial,sans-serif;color:#1e293b;padding:40px}
        h1{text-align:center;margin-bottom:5px}
        .sub{text-align:center;color:#64748b;font-size:0.9rem;margin-bottom:30px}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #e2e8f0;padding:10px;text-align:left;font-size:0.88rem}
        th{background:#f8fafc;font-weight:600}
        .total td{font-weight:800;background:#fef2f2;color:#dc2626;border-top:2px solid #fca5a5}
        .footer{margin-top:40px;text-align:center;font-size:0.78rem;color:#94a3b8}
      </style></head>
      <body onload="window.print();window.close()">
        <h1>Cité Telico — Rapport des Dépenses</h1>
        <div class="sub">Période : ${filterDebut || "—"} → ${filterFin || "—"} — Généré le ${new Date().toLocaleDateString("fr-FR")}</div>
        <table><thead><tr><th>ID</th><th>Libellé</th><th>Date</th><th>Montant (GNF)</th></tr></thead><tbody>
        ${filtered.map(d => `<tr><td>#${d.id_depense}</td><td>${d.libelle}</td><td>${new Date(d.date_depense).toLocaleDateString("fr-FR")}</td><td>${d.montant.toLocaleString()}</td></tr>`).join("")}
        <tr class="total"><td colspan="3">TOTAL (${filtered.length} dépenses)</td><td>${totalFiltre.toLocaleString()} GNF</td></tr>
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
          <h1 className="page-title">Dépenses</h1>
          <p className="page-subtitle">Suivez et filtrez les charges opérationnelles de la Cité Telico.</p>
        </div>
        <div className="button-group">
          <button className="btn btn-primary" form="depense-form">{editing ? "💾 Modifier" : "➕ Ajouter"}</button>
          <button className="btn btn-secondary" onClick={exportPDF}>🖨️ Exporter PDF</button>
        </div>
      </div>

      {/* Filtres */}
      <section className="panel panel-highlight" style={{ display: "flex", gap: "20px", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap" }}>
        <div>
          <h2>Filtrer les dépenses</h2>
          <p style={{ margin: 0, color: "#64748b", fontSize: "0.85rem" }}>Par période et/ou libellé.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "0.78rem", color: "#64748b" }}>Du</label>
            <input className="input" type="date" value={filterDebut} onChange={e => setFilterDebut(e.target.value)} style={{ maxWidth: "160px" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "0.78rem", color: "#64748b" }}>Au</label>
            <input className="input" type="date" value={filterFin} onChange={e => setFilterFin(e.target.value)} style={{ maxWidth: "160px" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "0.78rem", color: "#64748b" }}>Libellé</label>
            <input className="input" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: "180px" }} />
          </div>
          {(filterDebut || filterFin || search) && (
            <button className="btn btn-secondary" onClick={() => { setFilterDebut(""); setFilterFin(""); setSearch(""); }} style={{ marginTop: "18px", padding: "8px 14px", fontSize: "0.85rem" }}>✕ Effacer</button>
          )}
        </div>
      </section>

      <section className="grid-2">
        <div className="panel">
          <h2>{editing ? "✏️ Modifier la dépense" : "➕ Nouvelle dépense"}</h2>
          <form id="depense-form" className="form-grid" onSubmit={save}>
            <div className="form-field">
              <label>Libellé</label>
              <input className="input" value={form.libelle} onChange={e => setForm({ ...form, libelle: e.target.value })} required />
            </div>
            <div className="form-field">
              <label>Montant (GNF)</label>
              <input className="input" type="number" min="0" value={form.montant} onChange={e => setForm({ ...form, montant: Number(e.target.value) })} required />
            </div>
            <div className="form-field">
              <label>Date</label>
              <input className="input" type="date" value={form.date_depense} onChange={e => setForm({ ...form, date_depense: e.target.value })} required />
            </div>
            <div className="button-group">
              <button className="btn btn-primary" type="submit">{editing ? "💾 Enregistrer" : "✅ Ajouter"}</button>
              {editing && <button className="btn btn-secondary" type="button" onClick={() => { setEditing(null); setForm({ libelle: "", montant: 0, date_depense: new Date().toISOString().slice(0, 10) }); }}>Annuler</button>}
            </div>
            {error && <p className="status-pill status-warning">{error}</p>}
          </form>

          {/* Résumé */}
          <div style={{ marginTop: "24px", padding: "20px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "18px" }}>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#94a3b8" }}>Total dépenses {filterDebut || filterFin ? "(période filtrée)" : "(affiché)"}</p>
            <p style={{ margin: "6px 0 0", fontSize: "1.5rem", fontWeight: 800, color: "#f87171" }}>{totalFiltre.toLocaleString()} GNF</p>
            <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#64748b" }}>{filtered.length} dépense(s) affichée(s)</p>
          </div>
        </div>

        <div className="panel">
          <h2 style={{ marginBottom: "18px" }}>Historique des dépenses</h2>
          {loading ? (
            <p style={{ color: "#94a3b8" }}>Chargement...</p>
          ) : (
            <>
              <table className="table">
                <thead>
                  <tr><th>ID</th><th>Libellé</th><th>Montant</th><th>Date</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {paged.map(dep => (
                    <tr key={dep.id_depense}>
                      <td style={{ color: "#64748b" }}>#{dep.id_depense}</td>
                      <td>{dep.libelle}</td>
                      <td><strong style={{ color: "#f87171" }}>{dep.montant.toLocaleString()}</strong> <span style={{ fontSize: "0.78rem", color: "#64748b" }}>GNF</span></td>
                      <td>{new Date(dep.date_depense).toLocaleDateString("fr-FR")}</td>
                      <td>
                        <div className="actions">
                          <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(dep)}>✏️</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(dep.id_depense)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "20px" }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ opacity: page === 1 ? 0.4 : 1 }}>←</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} className={`btn btn-sm ${p === page ? "btn-primary" : "btn-secondary"}`} onClick={() => setPage(p)}>{p}</button>
                  ))}
                  <button className="btn btn-secondary btn-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ opacity: page === totalPages ? 0.4 : 1 }}>→</button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
