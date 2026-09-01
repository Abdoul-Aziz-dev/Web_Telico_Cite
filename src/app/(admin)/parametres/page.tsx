"use client";
import { useEffect, useState } from "react";

type User = { id_user: number; nom: string; prenom: string; login: string; role: string };
type AuditLog = { id_audit: number; date_action: string; utilisateur?: string; action: string; details?: string; ip?: string };

export default function ParametresPage() {
  const [activeTab, setActiveTab] = useState<"users" | "security" | "backup" | "clear" | "audit">("users");
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);

  // Formulaire création user
  const [newUser, setNewUser] = useState({ nom: "", prenom: "", login: "", password: "", role: "visiteur" });
  // Formulaire changement MDP
  const [pwdForm, setPwdForm] = useState({ id_user: "", new_password: "", confirm: "" });
  // Vidage
  const [clearConfirm, setClearConfirm] = useState("");
  // Restauration
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);

  function notify(text: string, type: "ok" | "err") {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  }

  async function loadData() {
    setLoading(true);
    try {
      const [resUsers, resAudit] = await Promise.all([
        fetch("/api/admin/parametres"),
        fetch("/api/admin/audit"),
      ]);
      const dataUsers = await resUsers.json();
      const dataAudit = await resAudit.json();
      setUsers(dataUsers.users || []);
      setLogs(dataAudit.logs || []);
    } catch {
      notify("Erreur lors du chargement des données", "err");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/parametres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_user", ...newUser }),
    });
    const data = await res.json();
    if (!res.ok) return notify(data.error, "err");
    notify(`Utilisateur "${newUser.login}" créé avec succès !`, "ok");
    setNewUser({ nom: "", prenom: "", login: "", password: "", role: "visiteur" });
    loadData();
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwdForm.new_password !== pwdForm.confirm) return notify("Les mots de passe ne correspondent pas", "err");
    const res = await fetch("/api/admin/parametres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "change_password", id_user: Number(pwdForm.id_user), new_password: pwdForm.new_password }),
    });
    const data = await res.json();
    if (!res.ok) return notify(data.error, "err");
    notify("Mot de passe modifié avec succès !", "ok");
    setPwdForm({ id_user: "", new_password: "", confirm: "" });
    loadData();
  }

  async function handleDeleteUser(id: number, login: string) {
    if (!confirm(`Supprimer l'utilisateur "${login}" ?`)) return;
    const res = await fetch("/api/admin/parametres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_user", id_user: id }),
    });
    const data = await res.json();
    if (!res.ok) return notify(data.error, "err");
    notify("Utilisateur supprimé.", "ok");
    loadData();
  }

  async function handleClearData(e: React.FormEvent) {
    e.preventDefault();
    if (clearConfirm !== "VIDER") return notify("Tapez exactement VIDER pour confirmer", "err");
    const res = await fetch("/api/admin/parametres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear_data", confirm: "VIDER" }),
    });
    const data = await res.json();
    if (!res.ok) return notify(data.error, "err");
    notify("Toutes les données opérationnelles ont été vidées.", "ok");
    setClearConfirm("");
    loadData();
  }

  function handleDownloadBackup() {
    window.open("/api/admin/backup", "_blank");
  }

  async function handleRestoreBackup(e: React.FormEvent) {
    e.preventDefault();
    if (!restoreFile) return notify("Veuillez sélectionner un fichier JSON de sauvegarde", "err");
    setRestoring(true);

    try {
      const fileText = await restoreFile.text();
      const backupData = JSON.parse(fileText);

      const res = await fetch("/api/admin/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupData }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la restauration");

      notify("🎉 Base de données restaurée avec succès !", "ok");
      setRestoreFile(null);
      loadData();
    } catch (error: unknown) {
      const errMessage = error instanceof Error ? error.message : "Fichier de sauvegarde invalide";
      notify(errMessage, "err");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">⚙️ Paramètres & Administration</h1>
          <p className="page-subtitle">Gestion globale des utilisateurs, sécurité, maintenance et traçabilité de la Cité Telico.</p>
        </div>
      </div>

      {msg && (
        <div className={`status-pill ${msg.type === "ok" ? "status-complete" : "status-warning"}`} style={{ padding: "16px 24px", borderRadius: "16px", fontSize: "0.95rem", justifyContent: "center", marginBottom: "20px" }}>
          {msg.type === "ok" ? "✅" : "⚠️"} {msg.text}
        </div>
      )}

      {/* TABS NAVIGATION */}
      <div className="panel panel-highlight" style={{ display: "flex", gap: "10px", padding: "10px", flexWrap: "wrap", marginBottom: "24px" }}>
        <button className={`btn ${activeTab === "users" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("users")}>
          👥 Utilisateurs ({users.length})
        </button>
        <button className={`btn ${activeTab === "security" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("security")}>
          🔑 Sécurité & Mots de Passe
        </button>
        <button className={`btn ${activeTab === "backup" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("backup")}>
          💾 Sauvegarde & Restauration
        </button>
        <button className={`btn ${activeTab === "audit" ? "btn-primary" : "btn-secondary"}`} onClick={() => setActiveTab("audit")}>
          📋 Journal d'Audit ({logs.length})
        </button>
        <button className={`btn ${activeTab === "clear" ? "btn-danger" : "btn-secondary"}`} onClick={() => setActiveTab("clear")} style={{ marginLeft: "auto" }}>
          ⚠️ Purge de Base
        </button>
      </div>

      {/* TAB 1: GESTION DES UTILISATEURS */}
      {activeTab === "users" && (
        <section className="grid-2">
          <div className="panel">
            <h2>➕ Créer un utilisateur</h2>
            <form className="form-grid" onSubmit={handleCreateUser}>
              <div className="form-field"><label>Nom</label><input className="input" required value={newUser.nom} onChange={(e) => setNewUser({ ...newUser, nom: e.target.value })} /></div>
              <div className="form-field"><label>Prénom</label><input className="input" required value={newUser.prenom} onChange={(e) => setNewUser({ ...newUser, prenom: e.target.value })} /></div>
              <div className="form-field"><label>Login</label><input className="input" required value={newUser.login} onChange={(e) => setNewUser({ ...newUser, login: e.target.value })} autoCapitalize="none" /></div>
              <div className="form-field"><label>Mot de passe</label><input className="input" type="password" required minLength={6} value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} /></div>
              <div className="form-field">
                <label>Rôle</label>
                <select className="select" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                  <option value="visiteur">Visiteur (Lecture seule)</option>
                  <option value="gerant">Gérant (Administrateur)</option>
                </select>
              </div>
              <button className="btn btn-primary" type="submit">✅ Créer l'utilisateur</button>
            </form>
          </div>

          <div className="panel">
            <h2>👥 Tous les comptes d'accès</h2>
            {loading ? <p style={{ color: "#94a3b8" }}>Chargement...</p> : (
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead><tr><th>#</th><th>Utilisateur</th><th>Login</th><th>Rôle</th><th>Actions</th></tr></thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id_user}>
                        <td style={{ color: "#64748b" }}>{u.id_user}</td>
                        <td><strong>{u.prenom} {u.nom}</strong></td>
                        <td style={{ fontFamily: "monospace", color: "#38bdf8" }}>{u.login}</td>
                        <td>
                          <span className={`status-pill ${u.role === "gerant" ? "status-complete" : "status-warning"}`} style={{ fontSize: "0.78rem", padding: "3px 10px" }}>
                            {u.role === "gerant" ? "👑 Admin / Gérant" : "👁️ Visiteur"}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDeleteUser(u.id_user, u.login)}>🗑️ Supprimer</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB 2: SECURITE & MOT DE PASSE */}
      {activeTab === "security" && (
        <section style={{ maxWidth: "600px", margin: "0 auto" }}>
          <div className="panel">
            <h2>🔑 Modifier le mot de passe</h2>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "20px" }}>Sélectionnez un compte d'accès pour définir un nouveau mot de passe sécurisé.</p>
            <form className="form-grid" onSubmit={handleChangePassword}>
              <div className="form-field">
                <label>Compte utilisateur</label>
                <select className="select" required value={pwdForm.id_user} onChange={(e) => setPwdForm({ ...pwdForm, id_user: e.target.value })}>
                  <option value="">Sélectionner un compte</option>
                  {users.map((u) => <option key={u.id_user} value={u.id_user}>{u.prenom} {u.nom} ({u.login} - {u.role})</option>)}
                </select>
              </div>
              <div className="form-field"><label>Nouveau mot de passe</label><input className="input" type="password" required minLength={6} value={pwdForm.new_password} onChange={(e) => setPwdForm({ ...pwdForm, new_password: e.target.value })} /></div>
              <div className="form-field"><label>Confirmer le mot de passe</label><input className="input" type="password" required value={pwdForm.confirm} onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })} /></div>
              <button className="btn btn-primary" type="submit" style={{ width: "100%" }}>🔒 Mettre à jour le mot de passe</button>
            </form>
          </div>
        </section>
      )}

      {/* TAB 3: SAUVEGARDE ET RESTAURATION */}
      {activeTab === "backup" && (
        <section className="grid-2">
          {/* SAUVEGARDE */}
          <div className="panel">
            <h2>💾 Exporter une Sauvegarde</h2>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "20px" }}>
              Téléchargez un fichier de sauvegarde JSON contenant l'intégralité des données (Clients, Chambres, Contrats, Paiements, Dépenses, Clôtures, Mails).
            </p>
            <button className="btn btn-primary" onClick={handleDownloadBackup} style={{ width: "100%", padding: "14px" }}>
              ⬇️ Télécharger la sauvegarde (.JSON)
            </button>
          </div>

          {/* RESTAURATION */}
          <div className="panel" style={{ border: "1px solid rgba(56,189,248,0.3)" }}>
            <h2>🔄 Restaurer la Base de Données</h2>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "20px" }}>
              Restaurez les données de la Cité Telico à partir d'un fichier de sauvegarde JSON précédemment exporté.
            </p>
            <form onSubmit={handleRestoreBackup} className="form-grid">
              <div className="form-field">
                <label>Fichier de sauvegarde (.JSON)</label>
                <input type="file" accept=".json" className="input" onChange={(e) => setRestoreFile(e.target.files?.[0] || null)} required />
              </div>
              <button className="btn btn-secondary" type="submit" disabled={restoring} style={{ width: "100%", padding: "14px" }}>
                {restoring ? "⌛ Restauration en cours..." : "📤 Importer & Restaurer la Base"}
              </button>
            </form>
          </div>
        </section>
      )}

      {/* TAB 4: JOURNAL D'AUDIT */}
      {activeTab === "audit" && (
        <div className="panel">
          <h2>📋 Journal d'Audit & Traçabilité ({logs.length})</h2>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "20px" }}>Historique chronologique de toutes les opérations effectuées par les gérants.</p>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr><th>Date & Heure</th><th>Utilisateur</th><th>Action</th><th>Détails</th><th>IP</th></tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id_audit}>
                    <td style={{ fontSize: "0.85rem", color: "#64748b", whiteSpace: "nowrap" }}>{new Date(l.date_action).toLocaleString("fr-FR")}</td>
                    <td style={{ fontFamily: "monospace", color: "#38bdf8" }}>{l.utilisateur || "-"}</td>
                    <td><span className="status-pill status-complete" style={{ fontSize: "0.75rem", padding: "3px 10px" }}>{l.action}</span></td>
                    <td style={{ fontSize: "0.85rem", color: "#cbd5e1" }}>{l.details || "-"}</td>
                    <td style={{ fontSize: "0.8rem", color: "#64748b" }}>{l.ip || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: PURGE DE BASE */}
      {activeTab === "clear" && (
        <section style={{ maxWidth: "600px", margin: "0 auto" }}>
          <div className="panel" style={{ border: "1px solid rgba(248,113,113,0.4)" }}>
            <h2 style={{ color: "#f87171" }}>⚠️ Purge des données opérationnelles</h2>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem", marginBottom: "20px" }}>
              Cette action supprime tous les clients, contrats, paiements, dépenses et clôtures tout en conservant vos comptes utilisateurs et la liste des chambres. <strong style={{ color: "#f87171" }}>Action irréversible.</strong>
            </p>
            <form className="form-grid" onSubmit={handleClearData}>
              <div className="form-field">
                <label style={{ color: "#f87171" }}>Tapez <strong>VIDER</strong> pour confirmer la suppression</label>
                <input className="input" value={clearConfirm} onChange={(e) => setClearConfirm(e.target.value)} placeholder="VIDER" style={{ borderColor: "rgba(248,113,113,0.4)" }} />
              </div>
              <button className="btn btn-danger" type="submit" style={{ width: "100%", padding: "14px" }}>🗑️ Vider toutes les données opérationnelles</button>
            </form>
          </div>
        </section>
      )}
    </main>
  );
}
