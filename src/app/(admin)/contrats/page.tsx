"use client";
import { useEffect, useState } from "react";

type Contrat = {
  id_contrat: number;
  client: { nom: string; prenom: string } | null;
  contrat_chambres: Array<{ chambre: { numero: string } | null }>;
  date_debut: string;
  date_fin: string | null;
  montant: number;
};

type Client = { id_client: number; nom: string; prenom: string };
type Chambre = { id_chambre: number; numero: string; type_chambre: string; prix: number };

export default function ContratsPage() {
  const [contrats, setContrats] = useState<Contrat[]>([]);
  const [filteredContrats, setFilteredContrats] = useState<Contrat[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [chambres, setChambres] = useState<Chambre[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ id_client: '', chambreIds: [] as number[], date_debut: new Date().toISOString().slice(0, 10), date_fin: '', montant: 0 });

  // Filter state
  const [filterType, setFilterType] = useState("Tous"); // "Tous" | "Actifs" | "Expirés"

  async function load() {
    setLoading(true);
    try {
      const [r1, r2, r3] = await Promise.all([fetch('/api/contrats'), fetch('/api/clients'), fetch('/api/chambres')]);
      const j1 = await r1.json();
      const j2 = await r2.json();
      const j3 = await r3.json();
      setContrats(j1.contrats || []);
      setClients(j2.clients || []);
      setChambres(j3.chambres || []);
      setError(null);
    } catch {
      setError('Impossible de charger les donnees des contrats.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let result = contrats;
    if (filterType === "Actifs") {
      result = result.filter(ct => !ct.date_fin || new Date(ct.date_fin) >= new Date());
    } else if (filterType === "Expirés") {
      result = result.filter(ct => ct.date_fin && new Date(ct.date_fin) < new Date());
    }
    setFilteredContrats(result);
  }, [contrats, filterType]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      const payload = { id_client: Number(form.id_client), chambreIds: form.chambreIds, date_debut: form.date_debut, date_fin: form.date_fin || null, montant: form.montant };
      await fetch('/api/contrats', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      setForm({ id_client: '', chambreIds: [], date_debut: new Date().toISOString().slice(0, 10), date_fin: '', montant: 0 });
      load();
      setError(null);
    } catch {
      setError('Impossible de creer le contrat.');
    }
  }

  async function handleTerminate(id: number) {
    if (!confirm('Voulez-vous résilier ce contrat ? Les chambres associées seront libérées et le locataire sera marqué inactif.')) return;
    try {
      await fetch(`/api/contrats/${id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ date_fin: new Date().toISOString().slice(0, 10) })
      });
      load();
      setError(null);
    } catch {
      setError('Impossible de résilier le contrat.');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Supprimer ce contrat ? Cette action est irreversible.')) return;
    try {
      await fetch(`/api/contrats/${id}`, { method: 'DELETE' });
      load();
      setError(null);
    } catch {
      setError('Impossible de supprimer le contrat.');
    }
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('fr-FR');
  }

  function printContractPDF(ct: Contrat) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    const roomNumbers = ct.contrat_chambres.map(cc => cc.chambre?.numero).filter(Boolean).join(', ');
    
    const html = `
      <html>
        <head>
          <title>Contrat de Bail - Cité Telico</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; padding: 50px; line-height: 1.6; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 25px; margin-bottom: 40px; }
            .title { font-size: 2.2rem; font-weight: bold; color: #0f172a; margin: 0; letter-spacing: -0.5px; }
            .meta { text-align: right; color: #475569; font-size: 0.95rem; }
            .section { margin-bottom: 35px; }
            .section-title { font-size: 1.3rem; font-weight: 600; color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 18px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: left; }
            th { background-color: #f8fafc; font-weight: 600; color: #475569; }
            .rules { font-size: 0.85rem; color: #475569; }
            .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
            .signature-box { border-top: 1px solid #b8c2cc; width: 42%; text-align: center; padding-top: 15px; font-size: 0.9rem; color: #64748b; }
            .stamp { border: 2px dashed #0284c7; padding: 15px; text-align: center; color: #0284c7; font-weight: bold; font-family: monospace; border-radius: 8px; margin: 25px 0; max-width: 250px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <div>
              <h1 class="title">CONTRAT DE BAIL</h1>
              <span style="color: #64748b; font-size: 0.95rem;">Cité Telico - Conakry, Guinée</span>
            </div>
            <div class="meta">
              <strong>CONTRAT N° :</strong> CT-BAIL-${ct.id_contrat.toString().padStart(4, '0')}<br>
              <strong>Date d'effet :</strong> ${new Date(ct.date_debut).toLocaleDateString('fr-FR')}
            </div>
          </div>

          <div class="section">
            <h2 class="section-title">1. Les Parties Contratantes</h2>
            <p><strong>Bailleur :</strong> La direction de la Cité Telico, représentée par le Gérant en fonction.</p>
            <p><strong>Preneur (Locataire) :</strong> M./Mme <strong>${ct.client?.prenom} ${ct.client?.nom}</strong>, résidant de la Cité.</p>
          </div>

          <div class="section">
            <h2 class="section-title">2. Objet du Contrat & Désignation des Lieux</h2>
            <p>Le Bailleur donne à loyer à usage d'habitation au Preneur qui l'accepte, la chambre désignée ci-après :</p>
            <table>
              <thead>
                <tr>
                  <th>Chambre(s) Louée(s)</th>
                  <th>Désignation</th>
                  <th>Loyer Mensuel</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Chambre N° ${roomNumbers}</strong></td>
                  <td>Chambre individuelle de haut standing, Cité Telico</td>
                  <td><strong>${ct.montant.toLocaleString()} GNF</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="section">
            <h2 class="section-title">3. Modalités Financières & Conditions de Bail</h2>
            <p><strong>Loyer mensuel :</strong> Réglable en début de terme de chaque mois au bureau de gestion immobilière.</p>
            <p><strong>Date de fin de bail :</strong> ${ct.date_fin ? new Date(ct.date_fin).toLocaleDateString('fr-FR') : 'Indéterminée (Reconduction tacite mensuelle)'}</p>
          </div>

          <div class="stamp">
            CITÉ TELICO CONAKRY<br>
            CONTRAT CERTIFIÉ ET ACTIF
          </div>

          <div class="section">
            <h2 class="section-title">4. Règlement Intérieur & Obligations du Locataire</h2>
            <div class="rules">
              <p><strong>Article 1 — Paiement des Loyers :</strong> Le loyer est réductible et payable d'avance le 1er de chaque mois et au plus tard le 5 du mois en cours. Tout retard non justifié pourra entraîner l'application de pénalités de retard et/ou la résiliation du bail.</p>
              <p><strong>Article 2 — Usage des Lieux & Entretien :</strong> Les lieux loués doivent être maintenus dans un état de propreté irréprochable. Toute dégradation causée par le locataire sera réparée à ses frais exclusifs.</p>
              <p><strong>Article 3 — Nuisances & Sérénité :</strong> Les fêtes bruyantes, l'usage d'appareils sonores à fort volume après 22h et tout comportement troublant la tranquillité des résidents sont formellement interdits.</p>
              <p><strong>Article 4 — Sous-location :</strong> La sous-location partielle ou totale du logement est strictement interdite sans l'accord écrit de la Direction.</p>
              <p><strong>Article 5 — Clause Résolutoire :</strong> En cas de bêtises exagérées, dégradations volontaires, non-respect répété du règlement ou retard supérieur à 30 jours, le présent contrat sera résilié de plein droit après mise en demeure.</p>
            </div>
          </div>

          <div class="signatures">
            <div class="signature-box">
              Le Bailleur (Direction Cité Telico)<br>
              <em>(Signature & Cachet)</em>
            </div>
            <div class="signature-box">
              Le Preneur (Locataire : M./Mme ${ct.client?.nom})<br>
              <em>("Lu et approuvé, je m'engage à respecter le règlement")</em>
            </div>
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
          <h1 className="page-title">Contrats de location</h1>
          <p className="page-subtitle">Créez et suivez les contrats signés entre vos locataires et vos chambres.</p>
        </div>
        <button className="btn btn-primary" form="contract-form">📝 Créer un contrat</button>
      </div>

      <section className="panel panel-highlight" style={{ display: 'flex', gap: '30px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2>Filtrer contrats</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Visualisez les contrats actifs ou expirés dans le système.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {["Tous", "Actifs", "Expirés"].map((opt) => (
            <button
              key={opt}
              className={`btn ${filterType === opt ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterType(opt)}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              {opt === "Actifs" ? "🔥 Actifs" : opt === "Expirés" ? "💨 Expirés" : "📋 Tous"}
            </button>
          ))}
        </div>
      </section>

      <section className="grid-2">
        <div className="panel">
          <h2>📝 Créer un nouveau contrat</h2>
          <form id="contract-form" className="form-grid" onSubmit={save}>
            <div className="form-field">
              <label>Client / Locataire</label>
              <select className="select" value={form.id_client} onChange={e => setForm({ ...form, id_client: e.target.value })} required>
                <option value="">Sélectionner un client</option>
                {clients.map(c => <option key={c.id_client} value={c.id_client}>{c.nom} {c.prenom}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Date de début</label>
              <input className="input" type="date" value={form.date_debut} onChange={e => setForm({ ...form, date_debut: e.target.value })} required />
            </div>
            <div className="form-field">
              <label>Date de fin (optionnel)</label>
              <input className="input" type="date" value={form.date_fin} onChange={e => setForm({ ...form, date_fin: e.target.value })} />
            </div>
            <div className="form-field">
              <label>Montant mensuel (GNF)</label>
              <input className="input" type="number" min="0" value={form.montant} onChange={e => setForm({ ...form, montant: Number(e.target.value) })} required />
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>Chambres assignées <span style={{ fontSize: '0.8rem', color: '#64748b' }}>(Ctrl+clic pour plusieurs)</span></label>
              <select className="select" multiple size={4} value={form.chambreIds.map(String)} onChange={e => {
                const opts = Array.from(e.target.selectedOptions).map(o => Number(o.value));
                setForm({ ...form, chambreIds: opts });
              }}>
                {chambres.map(ch => <option key={ch.id_chambre} value={ch.id_chambre}>{ch.numero} — {ch.type_chambre} ({ch.prix.toLocaleString()} GNF)</option>)}
              </select>
            </div>
            <button className="btn btn-primary" type="submit">✅ Enregistrer le contrat</button>
            {error && <p className="status-pill status-warning">{error}</p>}
          </form>
        </div>

        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h2 style={{ margin: 0 }}>Contrats enregistrés ({filteredContrats.length})</h2>
          </div>
          {loading ? (
            <p style={{ color: '#94a3b8' }}>Chargement des contrats...</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Client</th>
                  <th>Chambres</th>
                  <th>Début</th>
                  <th>Fin</th>
                  <th>Montant</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContrats.map(ct => {
                  const isExpired = ct.date_fin && new Date(ct.date_fin) < new Date();
                  return (
                    <tr key={ct.id_contrat}>
                      <td style={{ color: '#64748b' }}>#{ct.id_contrat}</td>
                      <td><strong>{ct.client?.nom} {ct.client?.prenom}</strong></td>
                      <td>{ct.contrat_chambres.map(cc => cc.chambre?.numero).filter(Boolean).join(', ') || '-'}</td>
                      <td>{formatDate(ct.date_debut)}</td>
                      <td>
                        {ct.date_fin ? (
                          <span className={`status-pill ${isExpired ? 'status-warning' : 'status-complete'}`} style={{ fontSize: '0.78rem' }}>
                            {formatDate(ct.date_fin)}
                          </span>
                        ) : <span style={{ color: '#34d399' }}>En cours</span>}
                      </td>
                      <td><strong>{ct.montant.toLocaleString()}</strong> <span style={{ fontSize: '0.8rem', color: '#64748b' }}>GNF</span></td>
                      <td>
                        <div className="actions">
                          <button className="btn btn-sm btn-secondary" onClick={() => printContractPDF(ct)} title="Imprimer le contrat">🖨️ Imprimer</button>
                          {!ct.date_fin && (
                            <button className="btn btn-sm btn-secondary" onClick={() => handleTerminate(ct.id_contrat)} title="Résilier le bail" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.2)' }}>🛑 Résilier</button>
                          )}
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(ct.id_contrat)} title="Super-suppression">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}
