"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const ITEMS_PAR_PAGE = 10;

type Client = {
  id_client: number;
  nom: string;
  prenom: string;
  sexe: string;
  telephone?: string;
  profession?: string;
  date_entree: string;
  statut: string;
};

type ContratDetail = {
  id_contrat: number;
  date_debut: string;
  date_fin?: string | null;
  montant: number;
  contrat_chambres: { chambre?: { numero: string } | null }[];
};

type PaiementDetail = {
  id_paiement: number;
  date_paiement: string;
  mois_paye: string;
  numero_recu?: string | null;
  montant: number;
  statut: string;
};

type ClientDetail = Client & {
  chambre?: { numero: string; type_chambre: string; prix: number; statut: string } | null;
  contrats?: ContratDetail[];
  paiements?: PaiementDetail[];
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filtered, setFiltered] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState({ nom: "", prenom: "", sexe: "M", telephone: "", profession: "", date_entree: new Date().toISOString().slice(0, 10) });
  const [dossierClient, setDossierClient] = useState<ClientDetail | null>(null);
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(data.clients || []);
      setError(null);
    } catch {
      setError("Impossible de charger les clients.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const query = search.toLowerCase();
    setFiltered(clients.filter((c) =>
      c.nom.toLowerCase().includes(query) ||
      c.prenom.toLowerCase().includes(query) ||
      `${c.nom} ${c.prenom}`.toLowerCase().includes(query) ||
      `${c.prenom} ${c.nom}`.toLowerCase().includes(query) ||
      c.telephone?.toLowerCase().includes(query) ||
      c.profession?.toLowerCase().includes(query)
    ));
    setPage(1);
  }, [clients, search]);

  const rows = useMemo(() => search ? filtered : clients, [search, filtered, clients]);
  const totalPages = Math.ceil(rows.length / ITEMS_PAR_PAGE);
  const pagedRows = rows.slice((page - 1) * ITEMS_PAR_PAGE, page * ITEMS_PAR_PAGE);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      if (editing) {
        await fetch(`/api/clients/${editing.id_client}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      } else {
        await fetch("/api/clients", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      }
      resetForm();
      load();
      setError(null);
    } catch {
      setError(editing ? "Impossible de mettre à jour le client." : "Impossible de créer le client.");
    }
  }

  function resetForm() {
    setEditing(null);
    setForm({ nom: "", prenom: "", sexe: "M", telephone: "", profession: "", date_entree: new Date().toISOString().slice(0, 10) });
  }

  function handleEdit(client: Client) {
    setEditing(client);
    setForm({ nom: client.nom, prenom: client.prenom, sexe: client.sexe, telephone: client.telephone || "", profession: client.profession || "", date_entree: client.date_entree.slice(0, 10) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: number) {
    if (!confirm("Supprimer ce client ?")) return;
    try {
      await fetch(`/api/clients/${id}`, { method: "DELETE" });
      load();
      setError(null);
    } catch {
      setError("Impossible de supprimer le client.");
    }
  }

  async function showDossier(id: number) {
    try {
      const res = await fetch(`/api/clients/${id}`);
      const data = await res.json();
      if (data.client) setDossierClient(data.client);
    } catch {
      setError("Impossible de charger le dossier du locataire.");
    }
  }

  async function handleDeactivate(id: number) {
    if (!confirm("Voulez-vous vraiment désactiver ce locataire et libérer sa chambre ?")) return;
    try {
      await fetch(`/api/clients/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ statut: "Inactif" }) });
      load();
      if (dossierClient?.id_client === id) setDossierClient(null);
    } catch {
      setError("Impossible de désactiver le locataire.");
    }
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestion des locataires</h1>
          <p className="page-subtitle">Ajoutez, recherchez et modifiez les locataires depuis une interface moderne.</p>
        </div>
        <div className="button-group">
          <button className="btn btn-primary" form="client-form">
            {editing ? "💾 Enregistrer les modifications" : "➕ Ajouter un locataire"}
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => window.print()}>🖨️ Exporter PDF</button>
        </div>
      </div>

      <section className="panel panel-highlight">
        <div className="panel-header">
          <h2>Recherche locataires</h2>
          <input className="input input-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Recherche par nom, téléphone ou profession" style={{ maxWidth: "400px" }} />
        </div>
      </section>

      <section className="grid-2">
        <div className="panel">
          <h2>{editing ? "✏️ Modifier le locataire" : "➕ Ajouter un locataire"}</h2>
          <form id="client-form" className="form-grid" onSubmit={save}>
            <div className="form-field">
              <label>Nom</label>
              <input className="input" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
            </div>
            <div className="form-field">
              <label>Prénom</label>
              <input className="input" value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required />
            </div>
            <div className="form-field">
              <label>Sexe</label>
              <select className="select" value={form.sexe} onChange={(e) => setForm({ ...form, sexe: e.target.value })}>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
            <div className="form-field">
              <label>Téléphone</label>
              <input className="input" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
            </div>
            <div className="form-field">
              <label>Profession</label>
              <input className="input" value={form.profession} onChange={(e) => setForm({ ...form, profession: e.target.value })} />
            </div>
            <div className="form-field">
              <label>Date d'entrée</label>
              <input className="input" type="date" value={form.date_entree} onChange={(e) => setForm({ ...form, date_entree: e.target.value })} required />
            </div>
            <div className="button-group" style={{ gridColumn: "1 / -1" }}>
              <button className="btn btn-primary" type="submit">{editing ? "💾 Enregistrer" : "✅ Créer le locataire"}</button>
              {editing && <button className="btn btn-secondary" type="button" onClick={resetForm}>Annuler</button>}
            </div>
            {error && <p className="status-pill status-warning">{error}</p>}
          </form>
        </div>

        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
            <h2 style={{ margin: 0 }}>Locataires ({rows.length})</h2>
          </div>
          {loading ? (
            <p style={{ color: "#94a3b8" }}>Chargement des locataires...</p>
          ) : (
            <>
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Locataire</th>
                    <th>Contact</th>
                    <th>Profession</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((client) => (
                    <tr key={client.id_client}>
                      <td style={{ color: "#64748b" }}>{client.id_client}</td>
                      <td><strong>{client.nom} {client.prenom}</strong><br /><span style={{ fontSize: "0.8rem", color: "#64748b" }}>{client.sexe === "M" ? "👨" : "👩"} {client.sexe}</span></td>
                      <td>{client.telephone || <span style={{ color: "#475569" }}>-</span>}</td>
                      <td>{client.profession || <span style={{ color: "#475569" }}>-</span>}</td>
                      <td><span className={`status-pill ${client.statut === "Actif" ? "status-complete" : "status-muted"}`}>{client.statut}</span></td>
                      <td>
                        <div className="actions">
                          <Link href={`/clients/${client.id_client}`} className="btn btn-sm btn-secondary">📄 Fiche</Link>
                          <button className="btn btn-sm btn-secondary" onClick={() => showDossier(client.id_client)}>📁 Dossier</button>
                          <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(client)}>✏️</button>
                          {client.statut === "Actif" && (
                            <button className="btn btn-sm btn-secondary" onClick={() => handleDeactivate(client.id_client)} style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>🚫 Désactiver</button>
                          )}
                          <button className="btn btn-sm btn-danger" onClick={() => handleDelete(client.id_client)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "20px" }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ opacity: page === 1 ? 0.4 : 1 }}>←</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button key={p} className={`btn btn-sm ${p === page ? "btn-primary" : "btn-secondary"}`} onClick={() => setPage(p)}>{p}</button>
                  ))}
                  <button className="btn btn-secondary btn-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ opacity: page === totalPages ? 0.4 : 1 }}>→</button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Modal Dossier */}
      {dossierClient && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: "20px" }}>
          <div className="panel" style={{ maxWidth: "800px", width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "36px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ margin: 0 }}>📁 Dossier : {dossierClient.prenom} {dossierClient.nom}</h2>
              <button onClick={() => setDossierClient(null)} style={{ background: "none", border: "none", fontSize: "1.5rem", color: "#64748b", padding: 0 }}>✕</button>
            </div>

            <div className="grid-2" style={{ marginBottom: "24px", gap: "16px" }}>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "20px", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: "1.05rem", color: "#38bdf8" }}>Informations Personnelles</h3>
                <p style={{ margin: "6px 0" }}>👤 <strong>Genre :</strong> {dossierClient.sexe === "M" ? "Masculin" : "Féminin"}</p>
                <p style={{ margin: "6px 0" }}>📞 <strong>Téléphone :</strong> {dossierClient.telephone || "Non renseigné"}</p>
                <p style={{ margin: "6px 0" }}>💼 <strong>Profession :</strong> {dossierClient.profession || "Non renseignée"}</p>
                <p style={{ margin: "6px 0" }}>📅 <strong>Date d'entrée :</strong> {new Date(dossierClient.date_entree).toLocaleDateString("fr-FR")}</p>
                <p style={{ margin: "6px 0" }}>⚡ <strong>Statut :</strong> <span className={`status-pill ${dossierClient.statut === "Actif" ? "status-complete" : "status-muted"}`} style={{ padding: "4px 8px", fontSize: "0.75rem" }}>{dossierClient.statut}</span></p>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "20px", borderRadius: "18px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: "1.05rem", color: "#38bdf8" }}>Logement Assigné</h3>
                {dossierClient.chambre ? (
                  <>
                    <p style={{ margin: "6px 0" }}>🔑 <strong>Chambre :</strong> N° {dossierClient.chambre.numero}</p>
                    <p style={{ margin: "6px 0" }}>🏢 <strong>Type :</strong> {dossierClient.chambre.type_chambre}</p>
                    <p style={{ margin: "6px 0" }}>💰 <strong>Loyer :</strong> {dossierClient.chambre.prix.toLocaleString()} GNF</p>
                    <p style={{ margin: "6px 0" }}>🟢 <strong>Statut :</strong> {dossierClient.chambre.statut}</p>
                  </>
                ) : (
                  <p style={{ color: "#64748b", margin: "10px 0 0 0" }}>Aucune chambre assignée.</p>
                )}
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <h3 style={{ margin: "0 0 12px 0", fontSize: "1.05rem", color: "#38bdf8" }}>Baux & Contrats</h3>
              {!dossierClient.contrats?.length ? (
                <p style={{ color: "#64748b" }}>Aucun contrat enregistré.</p>
              ) : (
                <table className="table" style={{ fontSize: "0.85rem" }}>
                  <thead><tr><th>N°</th><th>Chambre(s)</th><th>Début</th><th>Fin</th><th>Loyer</th></tr></thead>
                  <tbody>
                    {dossierClient.contrats.map((ct) => (
                      <tr key={ct.id_contrat}>
                        <td>#{ct.id_contrat}</td>
                        <td>{ct.contrat_chambres.map((cc) => cc.chambre?.numero).join(", ") || "N/A"}</td>
                        <td>{new Date(ct.date_debut).toLocaleDateString("fr-FR")}</td>
                        <td>{ct.date_fin ? new Date(ct.date_fin).toLocaleDateString("fr-FR") : <span style={{ color: "#34d399" }}>En cours</span>}</td>
                        <td>{ct.montant.toLocaleString()} GNF</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div>
              <h3 style={{ margin: "0 0 12px 0", fontSize: "1.05rem", color: "#38bdf8" }}>Historique des Règlements</h3>
              {!dossierClient.paiements?.length ? (
                <p style={{ color: "#64748b" }}>Aucun paiement reçu.</p>
              ) : (
                <table className="table" style={{ fontSize: "0.85rem" }}>
                  <thead><tr><th>Date</th><th>Mois payé</th><th>Reçu</th><th>Montant</th><th>Statut</th></tr></thead>
                  <tbody>
                    {dossierClient.paiements.map((p) => (
                      <tr key={p.id_paiement}>
                        <td>{new Date(p.date_paiement).toLocaleDateString("fr-FR")}</td>
                        <td>{p.mois_paye}</td>
                        <td><span style={{ fontFamily: "monospace" }}>{p.numero_recu || "N/A"}</span></td>
                        <td><strong style={{ color: "#34d399" }}>{p.montant.toLocaleString()} GNF</strong></td>
                        <td><span className="status-pill status-complete" style={{ padding: "3px 8px", fontSize: "0.72rem" }}>{p.statut}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
              <button className="btn btn-secondary" onClick={() => setDossierClient(null)}>Fermer le dossier</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
