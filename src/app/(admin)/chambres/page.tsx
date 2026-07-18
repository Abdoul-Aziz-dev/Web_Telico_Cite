"use client";
import { useEffect, useState } from "react";

type Chambre = {
  id_chambre: number;
  numero: string;
  type_chambre: string;
  prix: number;
  statut: string;
};

export default function ChambresPage() {
  const [chambres, setChambres] = useState<Chambre[]>([]);
  const [filteredChambres, setFilteredChambres] = useState<Chambre[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Chambre | null>(null);
  const [form, setForm] = useState({ numero: "", type_chambre: "Standard", prix: 0, statut: "Libre" });
  
  // Status filter state
  const [filterStatut, setFilterStatut] = useState("Tous");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/chambres');
      const data = await res.json();
      const list = data.chambres || [];
      setChambres(list);
      setFilteredChambres(list);
      setError(null);
    } catch {
      setError('Impossible de charger les chambres.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (filterStatut === "Tous") {
      setFilteredChambres(chambres);
    } else {
      setFilteredChambres(chambres.filter(c => c.statut === filterStatut));
    }
  }, [chambres, filterStatut]);

  function resetForm() {
    setEditing(null);
    setForm({ numero: "", type_chambre: "Standard", prix: 0, statut: "Libre" });
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      if (editing) {
        await fetch(`/api/chambres/${editing.id_chambre}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
        setEditing(null);
      } else {
        await fetch('/api/chambres', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(form) });
      }
      resetForm();
      load();
      setError(null);
    } catch {
      setError('Impossible de sauvegarder la chambre.');
    }
  }

  function handleEdit(chambre: Chambre) {
    setEditing(chambre);
    setForm({ numero: chambre.numero, type_chambre: chambre.type_chambre, prix: chambre.prix, statut: chambre.statut });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleLiberer(chambre: Chambre) {
    if (!confirm(`Voulez-vous libérer la chambre N° ${chambre.numero} ? (Son statut repassera à Libre)`)) return;
    try {
      await fetch(`/api/chambres/${chambre.id_chambre}`, { 
        method: 'PUT', 
        headers: { 'content-type': 'application/json' }, 
        body: JSON.stringify({ ...chambre, statut: 'Libre' }) 
      });
      load();
      setError(null);
    } catch {
      setError('Impossible de libérer la chambre.');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer définitivement cette chambre ? Cette action est irréversible.')) return;
    try {
      await fetch(`/api/chambres/${id}`, { method: 'DELETE' });
      load();
      setError(null);
    } catch {
      setError('Impossible de supprimer la chambre.');
    }
  }

  function exportAvailableRoomsPDF() {
    const available = chambres.filter(c => c.statut === "Libre");
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    const html = `
      <html>
        <head>
          <title>Cité Telico - Chambres Disponibles</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; padding: 40px; }
            h1 { text-align: center; color: #050b14; margin-bottom: 5px; }
            .subtitle { text-align: center; color: #64748b; font-size: 0.95rem; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e2e8f0; padding: 12px 16px; text-align: left; font-size: 0.9rem; }
            th { background-color: #f8fafc; font-weight: 600; color: #475569; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .footer { margin-top: 50px; text-align: center; font-size: 0.8rem; color: #94a3b8; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <h1>Cité Telico</h1>
          <div class="subtitle">Liste des chambres disponibles à la location - ${new Date().toLocaleDateString('fr-FR')}</div>
          <table>
            <thead>
              <tr>
                <th>Numéro de Chambre</th>
                <th>Type</th>
                <th>Prix mensuel (GNF)</th>
              </tr>
            </thead>
            <tbody>
              ${available.map(c => `
                <tr>
                  <td><strong>Chambre N° ${c.numero}</strong></td>
                  <td>${c.type_chambre}</td>
                  <td><strong>${c.prix.toLocaleString()} GNF</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="footer">
            Cité Telico Property Manager &copy; ${new Date().getFullYear()} - Document généré automatiquement
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestion des chambres</h1>
          <p className="page-subtitle">Supervisez la disponibilité des chambres, leur tarification et leur statut en temps réel.</p>
        </div>
        <div className="button-group">
          <button className="btn btn-primary" form="room-form">
            {editing ? '💾 Modifier la chambre' : '➕ Nouvelle chambre'}
          </button>
          <button className="btn btn-secondary" type="button" onClick={exportAvailableRoomsPDF}>🖨️ Exporter PDF (Disponibles)</button>
        </div>
      </div>

      <section className="panel panel-highlight" style={{ display: 'flex', gap: '30px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2>Filtrer chambres</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Visualisez les chambres selon leur état d'occupation.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {["Tous", "Libre", "Occupée"].map((statusOption) => (
            <button
              key={statusOption}
              className={`btn ${filterStatut === statusOption ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterStatut(statusOption)}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              {statusOption === "Libre" ? "🟢 Libre" : statusOption === "Occupée" ? "⚠️ Occupée" : "📋 Tous"}
            </button>
          ))}
        </div>
      </section>

      <section className="grid-2">
        <div className="panel">
          <h2>{editing ? `✏️ Modifier chambre N° ${editing.numero}` : '➕ Nouvelle chambre'}</h2>
          <form id="room-form" className="form-grid" onSubmit={save}>
            <div className="form-field">
              <label>Numéro de chambre</label>
              <input className="input" value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} required />
            </div>
            <div className="form-field">
              <label>Type de chambre</label>
              <select className="select" value={form.type_chambre} onChange={e => setForm({ ...form, type_chambre: e.target.value })}>
                <option>Standard</option>
                <option>Premium</option>
                <option>Studio</option>
                <option>Appartement</option>
              </select>
            </div>
            <div className="form-field">
              <label>Prix mensuel (GNF)</label>
              <input className="input" type="number" min="0" value={form.prix} onChange={e => setForm({ ...form, prix: Number(e.target.value) })} required />
            </div>
            <div className="form-field">
              <label>Statut</label>
              <select className="select" value={form.statut} onChange={e => setForm({ ...form, statut: e.target.value })}>
                <option value="Libre">Libre</option>
                <option value="Occupée">Occupée</option>
              </select>
            </div>
            <div className="button-group">
              <button className="btn btn-primary" type="submit">{editing ? 'Enregistrer' : 'Créer'}</button>
              {editing && <button className="btn btn-secondary" type="button" onClick={resetForm}>Annuler</button>}
            </div>
            {error && <p className="status-pill status-warning">{error}</p>}
          </form>
        </div>

        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h2 style={{ margin: 0 }}>Inventaire ({filteredChambres.length} chambres)</h2>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              🟢 {chambres.filter(c => c.statut === 'Libre').length} libres · ⚠️ {chambres.filter(c => c.statut === 'Occupée').length} occupées
            </span>
          </div>
          {loading ? (
            <p style={{ color: '#94a3b8' }}>Chargement des chambres...</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Type</th>
                  <th>Prix / mois</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredChambres.map(row => (
                  <tr key={row.id_chambre}>
                    <td><strong>{row.numero}</strong></td>
                    <td>{row.type_chambre}</td>
                    <td>{row.prix.toLocaleString()} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>GNF</span></td>
                    <td>
                      <span className={`status-pill ${row.statut === 'Libre' ? 'status-complete' : 'status-warning'}`}>
                        {row.statut === 'Libre' ? '🟢 Libre' : '⚠️ Occupée'}
                      </span>
                    </td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(row)} title="Modifier">✏️</button>
                        {row.statut === 'Occupée' && (
                          <button className="btn btn-sm btn-secondary" onClick={() => handleLiberer(row)} title="Libérer la chambre" style={{ background: 'rgba(52, 211, 153, 0.12)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.2)' }}>🔓 Libérer</button>
                        )}
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(row.id_chambre)} title="Supprimer définitivement">🗑️</button>
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
