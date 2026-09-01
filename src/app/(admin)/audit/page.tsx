"use client";
import { useEffect, useState } from "react";

type AuditLog = {
  id_audit: number;
  date_action: string;
  utilisateur?: string | null;
  action: string;
  details?: string | null;
  ip?: string | null;
};

const ACTION_COLORS: Record<string, string> = {
  CONNEXION: "status-complete",
  DECONNEXION: "status-muted",
  ECHEC_CONNEXION: "status-danger",
  CREATION_USER: "status-complete",
  SUPPRESSION_USER: "status-danger",
  CHANGEMENT_MDP: "status-warning",
  VIDAGE_DONNEES: "status-danger",
};

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("");

  useEffect(() => {
    fetch("/api/admin/audit")
      .then((r) => r.json())
      .then((d) => { setLogs(d.logs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const actions = Array.from(new Set(logs.map((l) => l.action)));

  const filtered = logs.filter((l) => {
    const matchSearch = !search || l.utilisateur?.toLowerCase().includes(search.toLowerCase()) || l.details?.toLowerCase().includes(search.toLowerCase());
    const matchAction = !filterAction || l.action === filterAction;
    return matchSearch && matchAction;
  });

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Journal d'Audit</h1>
          <p className="page-subtitle">Traçabilité complète de toutes les actions effectuées sur la plateforme.</p>
        </div>
        <div className="status-pill status-warning" style={{ fontSize: "0.95rem", padding: "10px 18px" }}>
          🔍 {logs.length} événements enregistrés
        </div>
      </div>

      <div className="panel panel-highlight" style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
        <input className="input" style={{ flex: 1, minWidth: "200px" }} placeholder="Rechercher par utilisateur ou détails..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="select" style={{ maxWidth: "220px" }} value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
          <option value="">Toutes les actions</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        {(search || filterAction) && (
          <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(""); setFilterAction(""); }}>✕ Effacer</button>
        )}
      </div>

      <div className="panel">
        {loading ? <p style={{ color: "#94a3b8" }}>Chargement...</p> : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr><th>Date & Heure</th><th>Utilisateur</th><th>Action</th><th>Détails</th><th>IP</th></tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id_audit}>
                    <td style={{ fontSize: "0.85rem", color: "#64748b", whiteSpace: "nowrap" }}>{new Date(l.date_action).toLocaleString("fr-FR")}</td>
                    <td style={{ fontFamily: "monospace", color: "#38bdf8" }}>{l.utilisateur || "-"}</td>
                    <td><span className={`status-pill ${ACTION_COLORS[l.action] || "status-muted"}`} style={{ fontSize: "0.75rem", padding: "3px 10px" }}>{l.action}</span></td>
                    <td style={{ fontSize: "0.85rem", color: "#cbd5e1", maxWidth: "300px" }}>{l.details || "-"}</td>
                    <td style={{ fontSize: "0.8rem", color: "#64748b" }}>{l.ip || "-"}</td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: "#64748b" }}>Aucun événement trouvé.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
