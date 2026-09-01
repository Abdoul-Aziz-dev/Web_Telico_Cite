"use client";
import { useEffect, useState } from "react";

type ConnexionLog = {
  id_connexion: number;
  login: string;
  nom: string;
  prenom: string;
  role: string;
  date_connexion: string;
  ip?: string | null;
  action: string;
};

export default function UtilisateursPage() {
  const [logs, setLogs] = useState<ConnexionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/connexions")
      .then((r) => r.json())
      .then((d) => { setLogs(d.logs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = logs.filter((l) =>
    !search ||
    l.login.toLowerCase().includes(search.toLowerCase()) ||
    l.nom.toLowerCase().includes(search.toLowerCase()) ||
    l.prenom.toLowerCase().includes(search.toLowerCase())
  );

  // Utilisateurs uniques connectés récemment (dernière connexion)
  const uniqueUsers = Object.values(
    logs.filter(l => l.action === "connexion").reduce((acc, l) => {
      if (!acc[l.login] || new Date(l.date_connexion) > new Date(acc[l.login].date_connexion)) {
        acc[l.login] = l;
      }
      return acc;
    }, {} as Record<string, ConnexionLog>)
  );

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Utilisateurs & Connexions</h1>
          <p className="page-subtitle">Suivez qui se connecte sur la plateforme et l'historique complet des sessions.</p>
        </div>
      </div>

      {/* Résumé utilisateurs actifs */}
      <section className="grid-4">
        <article className="metric-card" style={{ borderLeft: "5px solid #38bdf8" }}>
          <span style={{ color: "#94a3b8" }}>Total connexions</span>
          <strong>{logs.filter(l => l.action === "connexion").length}</strong>
          <span style={{ fontSize: "0.85rem", color: "#38bdf8" }}>depuis le début</span>
        </article>
        <article className="metric-card" style={{ borderLeft: "5px solid #a855f7" }}>
          <span style={{ color: "#94a3b8" }}>Utilisateurs distincts</span>
          <strong>{uniqueUsers.length}</strong>
          <span style={{ fontSize: "0.85rem", color: "#a855f7" }}>comptes actifs</span>
        </article>
        <article className="metric-card" style={{ borderLeft: "5px solid #34d399" }}>
          <span style={{ color: "#94a3b8" }}>Gérants</span>
          <strong>{uniqueUsers.filter(u => u.role === "gerant").length}</strong>
          <span style={{ fontSize: "0.85rem", color: "#34d399" }}>administrateurs</span>
        </article>
        <article className="metric-card" style={{ borderLeft: "5px solid #fbbf24" }}>
          <span style={{ color: "#94a3b8" }}>Visiteurs</span>
          <strong>{uniqueUsers.filter(u => u.role === "visiteur").length}</strong>
          <span style={{ fontSize: "0.85rem", color: "#fbbf24" }}>locataires connectés</span>
        </article>
      </section>

      {/* Dernières connexions par utilisateur */}
      <div className="panel">
        <h2 style={{ margin: "0 0 18px 0" }}>👥 Utilisateurs (dernière session)</h2>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr><th>Utilisateur</th><th>Login</th><th>Rôle</th><th>Dernière connexion</th><th>IP</th></tr>
            </thead>
            <tbody>
              {uniqueUsers.map((u) => (
                <tr key={u.login}>
                  <td><strong>{u.prenom} {u.nom}</strong></td>
                  <td style={{ fontFamily: "monospace", color: "#38bdf8" }}>{u.login}</td>
                  <td><span className={`status-pill ${u.role === "gerant" ? "status-complete" : "status-warning"}`}>{u.role}</span></td>
                  <td style={{ fontSize: "0.85rem", color: "#64748b" }}>{new Date(u.date_connexion).toLocaleString("fr-FR")}</td>
                  <td style={{ fontSize: "0.8rem", color: "#64748b" }}>{u.ip || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historique complet */}
      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "12px" }}>
          <h2 style={{ margin: 0 }}>📋 Historique complet ({filtered.length})</h2>
          <input className="input" style={{ maxWidth: "260px", padding: "10px 14px" }} placeholder="Rechercher par login ou nom..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {loading ? <p style={{ color: "#94a3b8" }}>Chargement...</p> : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr><th>Date & Heure</th><th>Utilisateur</th><th>Login</th><th>Rôle</th><th>Action</th><th>IP</th></tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id_connexion}>
                    <td style={{ fontSize: "0.85rem", color: "#64748b" }}>{new Date(l.date_connexion).toLocaleString("fr-FR")}</td>
                    <td><strong>{l.prenom} {l.nom}</strong></td>
                    <td style={{ fontFamily: "monospace", color: "#38bdf8" }}>{l.login}</td>
                    <td><span className={`status-pill ${l.role === "gerant" ? "status-complete" : "status-warning"}`} style={{ fontSize: "0.75rem", padding: "3px 8px" }}>{l.role}</span></td>
                    <td><span className={`status-pill ${l.action === "connexion" ? "status-complete" : "status-muted"}`} style={{ fontSize: "0.75rem", padding: "3px 8px" }}>{l.action === "connexion" ? "🟢 Connexion" : "🔴 Déconnexion"}</span></td>
                    <td style={{ fontSize: "0.8rem", color: "#64748b" }}>{l.ip || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
