"use client";

import { useEffect, useState } from "react";

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
  const [form, setForm] = useState({
    mois: "",
    date_cloture: new Date().toISOString().slice(0, 10),
    total_du: 0,
    total_encaisse: 0,
    total_depense: 0,
    solde: 0,
    statut: "Valide",
    commentaire: ""
  });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/clotures');
      const data = await res.json();
      setClotures(data.clotures || []);
      setError(null);
    } catch {
      setError('Impossible de charger les clotures.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // Auto-calculate solde when encaisse/depense changes
  useEffect(() => {
    setForm(f => ({ ...f, solde: f.total_encaisse - f.total_depense }));
  }, [form.total_encaisse, form.total_depense]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await fetch('/api/clotures', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
      setForm({ mois: "", date_cloture: new Date().toISOString().slice(0, 10), total_du: 0, total_encaisse: 0, total_depense: 0, solde: 0, statut: "Valide", commentaire: "" });
      load();
      setError(null);
    } catch {
      setError('Impossible de creer la cloture.');
    }
  }

  const totalSoldes = clotures.reduce((s, c) => s + c.solde, 0);

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clotures mensuelles</h1>
          <p className="page-subtitle">Enregistrez et suivez les bilans mensuels de tresorerie pour votre gestion immobiliere.</p>
        </div>
        <button className="btn btn-primary" form="cloture-form">📊 Nouvelle cloture</button>
      </div>

      {/* Bilan global */}
      <section className="grid-3">
        <article className="metric-card" style={{ borderLeft: '5px solid #34d399' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8' }}>Total encaisse</span>
            <span>💰</span>
          </div>
          <strong>{clotures.reduce((s, c) => s + c.total_encaisse, 0).toLocaleString()} <span style={{ fontSize: '0.9rem' }}>GNF</span></strong>
          <span style={{ fontSize: '0.85rem', color: '#34d399' }}>cumule sur {clotures.length} mois</span>
        </article>
        <article className="metric-card" style={{ borderLeft: '5px solid #f87171' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8' }}>Total depense</span>
            <span>📉</span>
          </div>
          <strong>{clotures.reduce((s, c) => s + c.total_depense, 0).toLocaleString()} <span style={{ fontSize: '0.9rem' }}>GNF</span></strong>
          <span style={{ fontSize: '0.85rem', color: '#f87171' }}>charges cumulees</span>
        </article>
        <article className="metric-card" style={{ borderLeft: `5px solid ${totalSoldes >= 0 ? '#38bdf8' : '#f87171'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#94a3b8' }}>Solde net global</span>
            <span>⚖️</span>
          </div>
          <strong style={{ color: totalSoldes >= 0 ? '#34d399' : '#f87171' }}>{totalSoldes.toLocaleString()} <span style={{ fontSize: '0.9rem' }}>GNF</span></strong>
          <span style={{ fontSize: '0.85rem', color: totalSoldes >= 0 ? '#34d399' : '#f87171' }}>{totalSoldes >= 0 ? '✅ Bilan positif' : '⚠️ Deficit'}</span>
        </article>
      </section>

      <section className="grid-2">
        <div className="panel">
          <h2>📊 Nouvelle cloture</h2>
          <form id="cloture-form" className="form-grid" onSubmit={save}>
            <div className="form-field">
              <label>Mois</label>
              <input className="input" placeholder="ex: Juillet 2026" value={form.mois} onChange={e => setForm({ ...form, mois: e.target.value })} required />
            </div>
            <div className="form-field">
              <label>Date de cloture</label>
              <input className="input" type="date" value={form.date_cloture} onChange={e => setForm({ ...form, date_cloture: e.target.value })} required />
            </div>
            <div className="form-field">
              <label>Total du cette periode</label>
              <input className="input" type="number" min="0" value={form.total_du} onChange={e => setForm({ ...form, total_du: Number(e.target.value) })} required />
            </div>
            <div className="form-field">
              <label>Total encaisse</label>
              <input className="input" type="number" min="0" value={form.total_encaisse} onChange={e => setForm(f => ({ ...f, total_encaisse: Number(e.target.value), solde: Number(e.target.value) - f.total_depense }))} required />
            </div>
            <div className="form-field">
              <label>Total depenses</label>
              <input className="input" type="number" min="0" value={form.total_depense} onChange={e => setForm(f => ({ ...f, total_depense: Number(e.target.value), solde: f.total_encaisse - Number(e.target.value) }))} required />
            </div>
            <div className="form-field">
              <label>Solde (auto-calcule)</label>
              <input className="input" type="number" value={form.solde} readOnly style={{ opacity: 0.7, cursor: 'not-allowed', color: form.solde >= 0 ? '#34d399' : '#f87171' }} />
            </div>
            <div className="form-field">
              <label>Statut</label>
              <select className="select" value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })}>
                <option value="Valide">Valide</option>
                <option value="En attente">En attente</option>
              </select>
            </div>
            <div className="form-field">
              <label>Commentaire (optionnel)</label>
              <input className="input" value={form.commentaire} onChange={e => setForm({ ...form, commentaire: e.target.value })} placeholder="Remarques supplementaires..." />
            </div>
            <button className="btn btn-primary" type="submit">✅ Creer la cloture</button>
            {error && <p className="status-pill status-warning">{error}</p>}
          </form>
        </div>

        <div className="panel">
          <h2>Historique des clotures</h2>
          {loading ? (
            <p style={{ color: '#94a3b8' }}>Chargement...</p>
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
                    <td style={{ color: '#34d399' }}>{cloture.total_encaisse.toLocaleString()}</td>
                    <td style={{ color: '#f87171' }}>{cloture.total_depense.toLocaleString()}</td>
                    <td>
                      <strong style={{ color: cloture.solde >= 0 ? '#34d399' : '#f87171' }}>
                        {cloture.solde >= 0 ? '+' : ''}{cloture.solde.toLocaleString()}
                      </strong>
                    </td>
                    <td>
                      <span className={`status-pill ${cloture.statut === 'Valide' ? 'status-complete' : 'status-warning'}`}>
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
