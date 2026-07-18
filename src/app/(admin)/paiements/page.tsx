"use client";
import { useEffect, useState } from "react";

type Paiement = {
  id_paiement: number;
  client: { nom: string; prenom: string } | null;
  date_paiement: string;
  mois_paye: string;
  montant: number;
  statut: string;
  numero_recu?: string;
};

type Client = { id_client: number; nom: string; prenom: string };

export default function PaiementsPage() {
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ id_client: '', mois_paye: '', montant: 0 });
  const [filterMois, setFilterMois] = useState(""); // "" = all months

  async function load() {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([fetch('/api/paiements'), fetch('/api/clients')]);
      const j1 = await r1.json();
      const j2 = await r2.json();
      setPaiements(j1.paiements || []);
      setClients(j2.clients || []);
      setError(null);
    } catch {
      setError('Impossible de charger les paiements.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await fetch('/api/paiements', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id_client: Number(form.id_client), mois_paye: form.mois_paye, montant: form.montant }) });
      setForm({ id_client: '', mois_paye: '', montant: 0 });
      load();
      setError(null);
    } catch {
      setError('Impossible de créer le paiement.');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer ce paiement ? Cette action est irréversible.')) return;
    try {
      await fetch(`/api/paiements/${id}`, { method: 'DELETE' });
      load();
    } catch {
      setError('Impossible de supprimer le paiement.');
    }
  }

  // Get unique months for filter dropdown
  const allMois = Array.from(new Set(paiements.map(p => p.mois_paye))).sort().reverse();

  const filtered = paiements.filter(p => {
    const matchSearch = !search || 
      `${p.client?.nom} ${p.client?.prenom}`.toLowerCase().includes(search.toLowerCase()) ||
      p.mois_paye.toLowerCase().includes(search.toLowerCase()) ||
      (p.numero_recu || '').toLowerCase().includes(search.toLowerCase());
    const matchMois = !filterMois || p.mois_paye === filterMois;
    return matchSearch && matchMois;
  });

  const totalEncaisse = filtered.reduce((s, p) => s + p.montant, 0);

  function printReceipt(p: Paiement) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const html = `
      <html>
        <head>
          <title>Reçu de Paiement - Cité Telico</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; padding: 50px; max-width: 620px; margin: auto; }
            .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
            h1 { font-size: 2rem; margin: 0; }
            .subtitle { color: #64748b; margin: 5px 0 0; }
            .badge { display: inline-block; background: #f0fdf4; color: #15803d; border: 1px solid #86efac; padding: 6px 16px; border-radius: 99px; font-weight: bold; margin-top: 15px; }
            dl { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 30px; margin: 20px 0; }
            dt { font-weight: 600; color: #475569; font-size: 0.9rem; }
            dd { margin: 0; font-size: 0.95rem; }
            .amount-box { background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; text-align: center; padding: 25px; margin: 25px 0; }
            .amount { font-size: 2.2rem; font-weight: 900; color: #0f172a; }
            .footer { text-align: center; color: #94a3b8; font-size: 0.8rem; margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <h1>CITÉ TELICO</h1>
            <p class="subtitle">Conakry, Guinée — Gestion Immobilière</p>
            <div class="badge">✅ PAIEMENT CONFIRMÉ</div>
          </div>
          <h2 style="margin-bottom: 6px;">Reçu de Paiement</h2>
          <p style="color: #64748b; font-size: 0.9rem;">N° de reçu : <strong>${p.numero_recu || 'N/A'}</strong></p>
          <dl>
            <dt>Locataire</dt>
            <dd><strong>${p.client?.prenom} ${p.client?.nom}</strong></dd>
            <dt>Mois payé</dt>
            <dd>${p.mois_paye}</dd>
            <dt>Date de paiement</dt>
            <dd>${new Date(p.date_paiement).toLocaleDateString('fr-FR')}</dd>
            <dt>Statut</dt>
            <dd>${p.statut}</dd>
          </dl>
          <div class="amount-box">
            <p style="margin: 0 0 8px; color: #64748b; font-size: 0.9rem;">Montant encaissé</p>
            <div class="amount">${p.montant.toLocaleString()} GNF</div>
          </div>
          <div class="footer">
            Cité Telico Property Manager &copy; ${new Date().getFullYear()} — Document généré automatiquement
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  }

  function exportFinancialPDF() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const totalAll = paiements.reduce((s, p) => s + p.montant, 0);
    const html = `
      <html>
        <head>
          <title>Flux Financier - Cité Telico</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; padding: 40px; }
            h1 { text-align: center; margin-bottom: 5px; }
            .subtitle { text-align: center; color: #64748b; font-size: 0.9rem; margin-bottom: 30px; }
            .kpi-row { display: flex; gap: 20px; margin-bottom: 30px; }
            .kpi { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; text-align: center; }
            .kpi-value { font-size: 1.8rem; font-weight: 900; color: #0f172a; }
            .kpi-label { font-size: 0.8rem; color: #64748b; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e2e8f0; padding: 10px 14px; text-align: left; font-size: 0.88rem; }
            th { background: #f8fafc; font-weight: 600; color: #475569; }
            tr:nth-child(even) { background: #f8fafc; }
            .total-row td { font-weight: 800; background: #f0fdf4; color: #15803d; border-top: 2px solid #86efac; }
            .footer { margin-top: 40px; text-align: center; font-size: 0.78rem; color: #94a3b8; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <h1>Cité Telico — Rapport Financier</h1>
          <div class="subtitle">État des paiements au ${new Date().toLocaleDateString('fr-FR')}</div>
          <div class="kpi-row">
            <div class="kpi"><div class="kpi-value">${paiements.length}</div><div class="kpi-label">Paiements enregistrés</div></div>
            <div class="kpi"><div class="kpi-value">${totalAll.toLocaleString()} GNF</div><div class="kpi-label">Total encaissé</div></div>
          </div>
          <table>
            <thead>
              <tr><th>Locataire</th><th>Mois payé</th><th>Num. Reçu</th><th>Date Paiement</th><th>Montant (GNF)</th></tr>
            </thead>
            <tbody>
              ${filtered.map(p => `
                <tr>
                  <td>${p.client?.prenom} ${p.client?.nom}</td>
                  <td>${p.mois_paye}</td>
                  <td style="font-family: monospace; font-size: 0.82rem;">${p.numero_recu || '-'}</td>
                  <td>${new Date(p.date_paiement).toLocaleDateString('fr-FR')}</td>
                  <td><strong>${p.montant.toLocaleString()}</strong></td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="4">TOTAL ENCAISSÉ (${filtered.length} paiements)</td>
                <td>${totalEncaisse.toLocaleString()} GNF</td>
              </tr>
            </tbody>
          </table>
          <div class="footer">Cité Telico Property Manager &copy; ${new Date().getFullYear()} — Document généré automatiquement</div>
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
          <h1 className="page-title">Paiements</h1>
          <p className="page-subtitle">Suivez les recettes mensuelles de vos contrats et conservez un historique clair.</p>
        </div>
        <div className="button-group">
          <button className="btn btn-primary" form="payment-form">💳 Ajouter un paiement</button>
          <button className="btn btn-secondary" onClick={exportFinancialPDF}>🖨️ Exporter flux financier</button>
        </div>
      </div>

      <section className="panel panel-highlight" style={{ display: 'flex', gap: '20px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div>
          <h2>Filtrer par mois</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Ciblez un mois précis pour consulter ses paiements.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="select"
            style={{ maxWidth: '200px' }}
            value={filterMois}
            onChange={e => setFilterMois(e.target.value)}
          >
            <option value="">📅 Tous les mois</option>
            {allMois.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {filterMois && (
            <button className="btn btn-secondary" onClick={() => setFilterMois("")} style={{ padding: '8px 14px', fontSize: '0.85rem' }}>✕ Effacer</button>
          )}
        </div>
      </section>

      <section className="grid-2">
        <div className="panel">
          <h2>💳 Enregistrer un paiement</h2>
          <form id="payment-form" className="form-grid" onSubmit={save}>
            <div className="form-field">
              <label>Locataire</label>
              <select className="select" value={form.id_client} onChange={e => setForm({ ...form, id_client: e.target.value })} required>
                <option value="">Sélectionner un locataire</option>
                {clients.map(c => <option key={c.id_client} value={c.id_client}>{c.nom} {c.prenom}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Mois payé</label>
              <input className="input" placeholder="ex: Juillet 2026" value={form.mois_paye} onChange={e => setForm({ ...form, mois_paye: e.target.value })} required />
            </div>
            <div className="form-field">
              <label>Montant (GNF)</label>
              <input className="input" type="number" min="0" value={form.montant} onChange={e => setForm({ ...form, montant: Number(e.target.value) })} required />
            </div>
            <button className="btn btn-primary" type="submit">✅ Enregistrer le paiement</button>
            {error && <p className="status-pill status-warning">{error}</p>}
          </form>

          {/* Summary card */}
          <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(52, 211, 153, 0.08)', border: '1px solid rgba(52, 211, 153, 0.2)', borderRadius: '18px' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>Total encaissé {filterMois ? `(${filterMois})` : '(affiché)'}</p>
            <p style={{ margin: '6px 0 0', fontSize: '1.5rem', fontWeight: 800, color: '#34d399' }}>
              {totalEncaisse.toLocaleString()} GNF
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>{filtered.length} paiement(s) affiché(s)</p>
          </div>
        </div>

        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ margin: 0 }}>Historique des paiements</h2>
            <input
              className="input"
              style={{ maxWidth: '220px', padding: '10px 14px', fontSize: '0.9rem' }}
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {loading ? (
            <p style={{ color: '#94a3b8' }}>Chargement en cours...</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Mois</th>
                  <th>Montant</th>
                  <th>Reçu</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(payment => (
                  <tr key={payment.id_paiement}>
                    <td><strong>{payment.client?.nom} {payment.client?.prenom}</strong></td>
                    <td>{payment.mois_paye}</td>
                    <td><strong style={{ color: '#34d399' }}>{payment.montant.toLocaleString()}</strong> <span style={{ fontSize: '0.8rem', color: '#64748b' }}>GNF</span></td>
                    <td><span style={{ fontSize: '0.78rem', color: '#64748b', fontFamily: 'monospace' }}>{payment.numero_recu || '-'}</span></td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-sm btn-secondary" onClick={() => printReceipt(payment)} title="Imprimer le reçu">🧾 Reçu</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(payment.id_paiement)} title="Supprimer">🗑️</button>
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

