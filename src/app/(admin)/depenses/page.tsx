"use client";

import { useEffect, useState } from "react";

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

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/depenses');
      const data = await res.json();
      setDepenses(data.depenses || []);
      setError(null);
    } catch {
      setError('Impossible de charger les depenses.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      if (editing) {
        await fetch(`/api/depenses/${editing.id_depense}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
        setEditing(null);
      } else {
        await fetch('/api/depenses', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
      }
      setForm({ libelle: "", montant: 0, date_depense: new Date().toISOString().slice(0, 10) });
      load();
      setError(null);
    } catch {
      setError('Impossible d\'enregistrer la depense.');
    }
  }

  function handleEdit(dep: Depense) {
    setEditing(dep);
    setForm({ libelle: dep.libelle, montant: dep.montant, date_depense: dep.date_depense.slice(0, 10) });
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer cette depense ?')) return;
    try {
      await fetch(`/api/depenses/${id}`, { method: 'DELETE' });
      load();
    } catch {
      setError('Impossible de supprimer la depense.');
    }
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Depenses</h1>
          <p className="page-subtitle">Suivez les frais et depenses mensuelles de votre gestion immobiliere.</p>
        </div>
        <button className="btn btn-primary" form="depense-form">
          {editing ? 'Modifier la depense' : 'Ajouter une depense'}
        </button>
      </div>

      <section className="grid-2">
        <div className="panel">
          <h2>{editing ? 'Modifier la depense' : 'Nouvelle depense'}</h2>
          <form id="depense-form" className="form-grid" onSubmit={save}>
            <div className="form-field">
              <label>Libelle</label>
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
              <button className="btn btn-primary" type="submit">Enregistrer</button>
              {editing && (
                <button className="btn btn-secondary" type="button" onClick={() => {
                  setEditing(null);
                  setForm({ libelle: "", montant: 0, date_depense: new Date().toISOString().slice(0, 10) });
                }}>Annuler</button>
              )}
            </div>
            {error && <p className="status-pill status-warning">{error}</p>}
          </form>
        </div>

        <div className="panel">
          <h2>Historique des depenses</h2>
          {loading ? (
            <p>Chargement...</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Libelle</th>
                  <th>Montant</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {depenses.map(depense => (
                  <tr key={depense.id_depense}>
                    <td>{depense.id_depense}</td>
                    <td>{depense.libelle}</td>
                    <td>{depense.montant.toLocaleString()} GNF</td>
                    <td>{new Date(depense.date_depense).toISOString().slice(0, 10)}</td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(depense)}>✏️</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(depense.id_depense)}>🗑️</button>
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
