"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { escapeHtml } from "../../../lib/html";

type Chambre = {
  id_chambre: number;
  numero: string;
  type_chambre: string;
  prix: number;
  statut: string;
  photo?: string | null;
  clients?: { id_client: number; nom: string; prenom: string; telephone?: string | null }[];
};

type Client = {
  id_client: number;
  nom: string;
  prenom: string;
  id_chambre?: number | null;
  telephone?: string | null;
  statut: string;
};

const TYPES_CHAMBRE = [
  "Chambre simple",
  "Chambre douce meublée",
  "Chambre douce non meublée",
  "Chambre salon",
];

export default function ChambresPage() {
  const [chambres, setChambres] = useState<Chambre[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres & vue
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState("Tous");
  const [filterType, setFilterType] = useState("Tous");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Formulaire Modal
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Chambre | null>(null);
  const [form, setForm] = useState({
    numero: "",
    type_chambre: "Chambre simple",
    prix: 1500000,
    statut: "Libre",
    photo: "",
  });

  async function loadData() {
    setLoading(true);
    try {
      const [roomsRes, clientsRes] = await Promise.all([
        fetch("/api/chambres"),
        fetch("/api/clients"),
      ]);
      const roomsData = await roomsRes.json();
      const clientsData = await clientsRes.json();

      setChambres(roomsData.chambres || []);
      setClients(clientsData.clients || []);
      setError(null);
    } catch {
      setError("Impossible de charger la liste des logements.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredChambres = useMemo(() => {
    return chambres.filter((c) => {
      const matchSearch =
        c.numero.toLowerCase().includes(search.toLowerCase()) ||
        c.type_chambre.toLowerCase().includes(search.toLowerCase());
      const matchStatut = filterStatut === "Tous" || c.statut === filterStatut;
      const matchType = filterType === "Tous" || c.type_chambre === filterType;
      return matchSearch && matchStatut && matchType;
    });
  }, [chambres, search, filterStatut, filterType]);

  // Statistiques
  const totalChambres = chambres.length;
  const occupees = chambres.filter((c) => c.statut === "Occupée").length;
  const libres = chambres.filter((c) => c.statut === "Libre").length;
  const tauxOccupation = totalChambres === 0 ? 0 : Math.round((occupees / totalChambres) * 100);
  const potentielMensuel = chambres.reduce((sum, c) => sum + c.prix, 0);

  function resetForm() {
    setEditing(null);
    setForm({
      numero: "",
      type_chambre: "Chambre simple",
      prix: 1500000,
      statut: "Libre",
      photo: "",
    });
  }

  function handleEdit(c: Chambre) {
    setEditing(c);
    setForm({
      numero: c.numero,
      type_chambre: c.type_chambre,
      prix: c.prix,
      statut: c.statut,
      photo: c.photo || "",
    });
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      const url = editing ? `/api/chambres/${editing.id_chambre}` : "/api/chambres";
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Erreur de sauvegarde");

      resetForm();
      setShowForm(false);
      loadData();
    } catch {
      setError("Erreur lors de l'enregistrement de la chambre.");
    }
  }

  async function handleDelete(id: number, numero: string) {
    if (!confirm(`Voulez-vous vraiment supprimer la chambre N° ${numero} ?`)) return;
    try {
      const res = await fetch(`/api/chambres/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setChambres((prev) => prev.filter((c) => c.id_chambre !== id));
    } catch {
      setError("Impossible de supprimer la chambre.");
    }
  }

  async function handleLiberer(id: number, numero: string) {
    if (!confirm(`Libérer la chambre N° ${numero} ? Son statut repassera à "Libre".`)) return;
    try {
      const res = await fetch(`/api/chambres/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: "Libre" }),
      });
      if (!res.ok) throw new Error();
      loadData();
    } catch {
      setError("Erreur lors de la libération de la chambre.");
    }
  }

  const getEmojiForType = (type: string) => {
    switch (type) {
      case "Chambre simple": return "🛏️";
      case "Chambre douce meublée": return "✨";
      case "Chambre douce non meublée": return "🛋️";
      case "Chambre salon": return "🏠";
      default: return "🛏️";
    }
  };

  function printReport() {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Inventaire des Chambres — Cité Telico</title>
      <style>
        body{font-family:Arial,sans-serif;color:#1e293b;padding:30px;line-height:1.5}
        h1{color:#0f172a;border-bottom:2px solid #0f172a;padding-bottom:8px}
        table{width:100%;border-collapse:collapse;margin-top:16px}
        th,td{border:1px solid #cbd5e1;padding:8px 12px;text-align:left;font-size:0.85rem}
        th{background:#f1f5f9;font-weight:700}
        .libre{color:#166534;font-weight:600}
        .occupee{color:#991b1b;font-weight:600}
        .footer{margin-top:40px;text-align:center;font-size:0.75rem;color:#64748b}
      </style></head>
      <body onload="window.print();window.close()">
        <h1>Inventaire des Chambres — Cité Telico</h1>
        <p><strong>Total :</strong> ${totalChambres} | <strong>Occupées :</strong> ${occupees} | <strong>Libres :</strong> ${libres} | <strong>Taux :</strong> ${tauxOccupation}%</p>
        <table>
          <thead>
            <tr><th>N°</th><th>Type</th><th>Prix mensuel</th><th>Statut</th><th>Occupant actuel</th></tr>
          </thead>
          <tbody>
            ${filteredChambres.map(c => {
              const clientAcc = clients.find(cl => cl.id_chambre === c.id_chambre && cl.statut === "Actif");
              return `<tr>
                <td><strong>${escapeHtml(c.numero)}</strong></td>
                <td>${escapeHtml(c.type_chambre)}</td>
                <td>${c.prix.toLocaleString()} GNF</td>
                <td class="${c.statut === 'Libre' ? 'libre' : 'occupee'}">${escapeHtml(c.statut)}</td>
                <td>${clientAcc ? `${escapeHtml(clientAcc.prenom)} ${escapeHtml(clientAcc.nom)}` : "—"}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
        <div class="footer">Cité Telico — Édité le ${new Date().toLocaleDateString("fr-FR")}</div>
      </body></html>
    `);
    win.document.close();
  }

  return (
    <main className="page">
      {/* En-tête */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestion des Logements & Chambres</h1>
          <p className="page-subtitle">Visualisez, filtrez et gérez le parc immobilier de la Cité Telico.</p>
        </div>
        <div className="button-group">
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            ➕ Ajouter une chambre
          </button>
          <button className="btn btn-secondary" onClick={printReport}>
            🖨️ Exporter PDF / Imprimer
          </button>
        </div>
      </div>

      {error && (
        <div className="status-pill status-warning" style={{ marginBottom: "20px", justifyContent: "center" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Cartes Métriques */}
      <section className="grid-4" style={{ marginBottom: "24px" }}>
        <article className="metric-card" style={{ borderLeft: "5px solid #38bdf8" }}>
          <span style={{ color: "#94a3b8" }}>Chambres Totales</span>
          <strong>{totalChambres}</strong>
          <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Potentiel : {potentielMensuel.toLocaleString()} GNF</span>
        </article>
        <article className="metric-card" style={{ borderLeft: "5px solid #34d399" }}>
          <span style={{ color: "#94a3b8" }}>Chambres Libres</span>
          <strong>{libres}</strong>
          <span style={{ fontSize: "0.8rem", color: "#34d399" }}>Prêtes à être louées</span>
        </article>
        <article className="metric-card" style={{ borderLeft: "5px solid #f43f5e" }}>
          <span style={{ color: "#94a3b8" }}>Chambres Occupées</span>
          <strong>{occupees}</strong>
          <span style={{ fontSize: "0.8rem", color: "#f43f5e" }}>Taux de remplissage : {tauxOccupation}%</span>
        </article>
        <article className="metric-card" style={{ borderLeft: "5px solid #a855f7" }}>
          <span style={{ color: "#94a3b8" }}>Taux d'occupation</span>
          <strong>{tauxOccupation}%</strong>
          <div style={{ height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", marginTop: "8px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${tauxOccupation}%`, background: "#a855f7", borderRadius: "3px" }} />
          </div>
        </article>
      </section>

      {/* Barre de Recherche et Filtres */}
      <section className="panel" style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: "12px", flex: 1, minWidth: "280px" }}>
            <input
              className="input input-search"
              placeholder="🔍 Rechercher par N° ou type de chambre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1 }}
            />
            <select
              className="select"
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              style={{ width: "160px" }}
            >
              <option value="Tous">Tous statuts</option>
              <option value="Libre">Libres</option>
              <option value="Occupée">Occupées</option>
            </select>
            <select
              className="select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ width: "200px" }}
            >
              <option value="Tous">Tous types</option>
              {TYPES_CHAMBRE.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Toggle de vue */}
          <div style={{ display: "flex", gap: "6px", background: "rgba(255,255,255,0.05)", padding: "4px", borderRadius: "12px" }}>
            <button
              className={`btn btn-sm ${viewMode === "grid" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setViewMode("grid")}
            >
              📱 Grille
            </button>
            <button
              className={`btn btn-sm ${viewMode === "table" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setViewMode("table")}
            >
              📊 Tableau
            </button>
          </div>
        </div>
      </section>

      {/* Liste des Chambres */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "#94a3b8" }}>
          <p>Chargement des chambres en cours...</p>
        </div>
      ) : filteredChambres.length === 0 ? (
        <div className="panel" style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
          <p style={{ fontSize: "1.1rem" }}>Aucune chambre ne correspond à vos filtres.</p>
          <button className="btn btn-secondary" onClick={() => { setSearch(""); setFilterStatut("Tous"); setFilterType("Tous"); }} style={{ marginTop: "12px" }}>
            Réinitialiser les filtres
          </button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="room-showcase-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "20px" }}>
          {filteredChambres.map((c) => {
            const occupant = clients.find((cl) => cl.id_chambre === c.id_chambre && cl.statut === "Actif");
            const isLibre = c.statut === "Libre";

            return (
              <article key={c.id_chambre} className="panel" style={{ padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                    <div>
                      <span style={{ fontSize: "2rem", display: "block", marginBottom: "4px" }}>{getEmojiForType(c.type_chambre)}</span>
                      <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#fff" }}>Chambre N° {c.numero}</h3>
                      <span style={{ fontSize: "0.82rem", color: "#94a3b8" }}>{c.type_chambre}</span>
                    </div>
                    <span className={`status-pill ${isLibre ? "status-complete" : "status-warning"}`} style={{ fontSize: "0.78rem" }}>
                      {c.statut}
                    </span>
                  </div>

                  <div style={{ margin: "16px 0", padding: "12px", background: "rgba(255,255,255,0.03)", borderRadius: "12px" }}>
                    <span style={{ fontSize: "0.8rem", color: "#64748b", display: "block" }}>Loyer Mensuel</span>
                    <strong style={{ fontSize: "1.15rem", color: "#34d399" }}>{c.prix.toLocaleString()} GNF</strong>
                  </div>

                  {occupant ? (
                    <div style={{ padding: "10px", background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: "10px", marginBottom: "16px" }}>
                      <span style={{ fontSize: "0.78rem", color: "#f43f5e", fontWeight: 600 }}>Occupé par :</span>
                      <p style={{ margin: "2px 0 0 0", fontSize: "0.9rem", fontWeight: 600, color: "#fff" }}>
                        👤 {occupant.prenom} {occupant.nom}
                      </p>
                      {occupant.telephone && <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>📞 {occupant.telephone}</span>}
                    </div>
                  ) : (
                    <div style={{ padding: "10px", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: "10px", marginBottom: "16px" }}>
                      <span style={{ fontSize: "0.8rem", color: "#34d399" }}>🟢 Chambre disponible à la location</span>
                    </div>
                  )}
                </div>

                <div className="button-group" style={{ marginTop: "12px", gap: "6px" }}>
                  <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(c)} style={{ flex: 1 }}>✏️ Modifier</button>
                  {!isLibre && (
                    <button className="btn btn-sm btn-secondary" onClick={() => handleLiberer(c.id_chambre, c.numero)} style={{ background: "rgba(234,179,8,0.15)", color: "#eab308", border: "1px solid rgba(234,179,8,0.3)" }}>🔓 Libérer</button>
                  )}
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id_chambre, c.numero)}>🗑️</button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="panel">
          <table className="table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Type</th>
                <th>Loyer mensuel</th>
                <th>Statut</th>
                <th>Occupant Actuel</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredChambres.map((c) => {
                const occupant = clients.find((cl) => cl.id_chambre === c.id_chambre && cl.statut === "Actif");
                return (
                  <tr key={c.id_chambre}>
                    <td><strong>N° {c.numero}</strong></td>
                    <td>{getEmojiForType(c.type_chambre)} {c.type_chambre}</td>
                    <td><strong style={{ color: "#34d399" }}>{c.prix.toLocaleString()} GNF</strong></td>
                    <td>
                      <span className={`status-pill ${c.statut === "Libre" ? "status-complete" : "status-warning"}`}>
                        {c.statut}
                      </span>
                    </td>
                    <td>
                      {occupant ? (
                        <Link href={`/clients/${occupant.id_client}`} style={{ color: "#38bdf8", textDecoration: "underline" }}>
                          👤 {occupant.prenom} {occupant.nom}
                        </Link>
                      ) : (
                        <span style={{ color: "#64748b" }}>—</span>
                      )}
                    </td>
                    <td>
                      <div className="actions">
                        <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(c)}>✏️</button>
                        {c.statut !== "Libre" && (
                          <button className="btn btn-sm btn-secondary" onClick={() => handleLiberer(c.id_chambre, c.numero)} style={{ background: "rgba(234,179,8,0.15)", color: "#eab308" }}>🔓 Libérer</button>
                        )}
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id_chambre, c.numero)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal / Formulaire d'ajout ou modification */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: "20px" }}>
          <div className="panel" style={{ maxWidth: "480px", width: "100%", padding: "30px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0 }}>{editing ? "✏️ Modifier la chambre" : "➕ Nouvelle chambre"}</h2>
              <button onClick={() => { setShowForm(false); resetForm(); }} style={{ background: "none", border: "none", fontSize: "1.4rem", color: "#64748b", cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleSave} className="form-grid">
              <div className="form-field">
                <label>Numéro de chambre (ex: 101, A2)</label>
                <input
                  className="input"
                  required
                  value={form.numero}
                  onChange={(e) => setForm({ ...form, numero: e.target.value })}
                  placeholder="ex: 104"
                />
              </div>

              <div className="form-field">
                <label>Type de chambre</label>
                <select
                  className="select"
                  value={form.type_chambre}
                  onChange={(e) => setForm({ ...form, type_chambre: e.target.value })}
                >
                  {TYPES_CHAMBRE.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Loyer mensuel (GNF)</label>
                <input
                  className="input"
                  type="number"
                  required
                  step="10000"
                  value={form.prix}
                  onChange={(e) => setForm({ ...form, prix: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="form-field">
                <label>Statut initial</label>
                <select
                  className="select"
                  value={form.statut}
                  onChange={(e) => setForm({ ...form, statut: e.target.value })}
                >
                  <option value="Libre">Libre</option>
                  <option value="Occupée">Occupée</option>
                </select>
              </div>

              <div className="button-group" style={{ marginTop: "16px" }}>
                <button className="btn btn-primary" type="submit" style={{ width: "100%" }}>
                  {editing ? "💾 Enregistrer les modifications" : "✅ Créer la chambre"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
