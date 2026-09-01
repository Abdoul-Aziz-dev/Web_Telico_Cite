"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ nom: "", prenom: "", login: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          router.replace(data.user.role === "gerant" ? "/dashboard" : "/visiteur");
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const payload = isLogin
        ? { login: form.login, password: form.password }
        : { nom: form.nom, prenom: form.prenom, login: form.login, password: form.password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Une erreur est survenue");
      router.replace(data.user.role === "gerant" ? "/dashboard" : "/visiteur");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "16px", background: "#050b14" }}>
        <div style={{ width: "40px", height: "40px", border: "4px solid rgba(56,189,248,0.2)", borderTopColor: "#38bdf8", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <p style={{ color: "#94a3b8" }}>Vérification de la session...</p>
        <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      background: "radial-gradient(circle at center, rgba(56,189,248,0.1) 0%, transparent 60%), linear-gradient(180deg, #050b14 0%, #03070c 100%)"
    }}>
      <div className="panel" style={{ maxWidth: "480px", width: "100%", boxShadow: "0 30px 60px rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", padding: "40px" }}>
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <img src="/logo.png" alt="Logo Cité Telico" className="brand-logo-img" style={{ margin: "0 auto 12px", display: "block" }} />
          <h1 className="brand-name-large" style={{ fontSize: "1.8rem", margin: 0, background: "none", color: "#fff" }}>Cité Telico</h1>
          <p style={{ color: "#64748b", fontSize: "0.9rem", marginTop: "6px" }}>
            {isLogin ? "Accédez à votre espace sécurisé" : "Créez votre compte visiteur pour louer"}
          </p>
        </div>

        {error && (
          <div className="status-pill status-warning" style={{ width: "100%", justifyContent: "center", marginBottom: "20px", borderRadius: "12px" }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-grid">
          {!isLogin && (
            <>
              <div className="form-field">
                <label>Nom complet</label>
                <input className="input" type="text" required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="ex: Diawara" />
              </div>
              <div className="form-field">
                <label>Prénom</label>
                <input className="input" type="text" required value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} placeholder="ex: Mamadou" />
              </div>
            </>
          )}
          <div className="form-field">
            <label>Identifiant / Login</label>
            <input className="input" type="text" required value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} placeholder="ex: aziz" autoCapitalize="none" />
          </div>
          <div className="form-field">
            <label>Mot de passe {!isLogin && <span style={{ color: "#64748b", fontSize: "0.8rem" }}>(min. 6 caractères)</span>}</label>
            <input className="input" type="password" required minLength={isLogin ? undefined : 6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%", marginTop: "10px" }}>
            {loading ? "Chargement..." : isLogin ? "Se connecter" : "S'inscrire"}
          </button>
        </form>

        <div style={{ marginTop: "24px", textAlign: "center", fontSize: "0.9rem", color: "#94a3b8" }}>
          {isLogin ? (
            <p>
              Nouveau visiteur ?{" "}
              <button type="button" onClick={() => { setIsLogin(false); setError(null); }} style={{ background: "none", border: "none", color: "#38bdf8", fontWeight: 600, padding: 0, textDecoration: "underline" }}>
                Créer un compte
              </button>
            </p>
          ) : (
            <p>
              Déjà inscrit ?{" "}
              <button type="button" onClick={() => { setIsLogin(true); setError(null); }} style={{ background: "none", border: "none", color: "#38bdf8", fontWeight: 600, padding: 0, textDecoration: "underline" }}>
                Se connecter
              </button>
            </p>
          )}
          <div style={{ marginTop: "16px" }}>
            <Link href="/" style={{ fontSize: "0.85rem", color: "#64748b", textDecoration: "underline" }}>
              ← Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
