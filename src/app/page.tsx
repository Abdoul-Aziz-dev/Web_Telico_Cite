"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Chambre = {
  id_chambre: number;
  numero: string;
  type_chambre: string;
  prix: number;
  statut: string;
  photo?: string | null;
};

type User = {
  id_user: number;
  nom: string;
  prenom: string;
  login: string;
  role: string;
};

const CHAMBRES_PAR_PAGE = 6;

export default function PublicHome() {
  const [chambres, setChambres] = useState<Chambre[]>([]);
  const [filteredChambres, setFilteredChambres] = useState<Chambre[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("Tous");
  const [maxPrice, setMaxPrice] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState(1);

  const [contactForm, setContactForm] = useState({ nom: "", email: "", message: "", typeChambre: "Standard" });
  const [submitted, setSubmitted] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      try {
        const [roomsRes, authRes] = await Promise.all([
          fetch("/api/chambres"),
          fetch("/api/auth/me"),
        ]);
        const roomsData = await roomsRes.json();
        const authData = await authRes.json();
        const disponibles = (roomsData.chambres || []).filter((c: Chambre) => c.statut === "Libre");
        setChambres(disponibles);
        setFilteredChambres(disponibles);
        setUser(authData.user ?? null);
      } catch (err) {
        console.error("Erreur lors de la récupération des données.", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    let result = chambres;
    if (filterType !== "Tous") result = result.filter((c) => c.type_chambre === filterType);
    if (maxPrice !== "") {
      const limit = parseFloat(maxPrice);
      if (!isNaN(limit)) result = result.filter((c) => c.prix <= limit);
    }
    setFilteredChambres(result);
    setPage(1);
  }, [filterType, maxPrice, chambres]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.refresh();
  }

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    setContactLoading(true);
    setContactError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de l'envoi");
      }
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setContactForm({ nom: "", email: "", message: "", typeChambre: "Standard" });
      }, 4000);
    } catch (err: unknown) {
      setContactError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setContactLoading(false);
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

  const totalPages = Math.ceil(filteredChambres.length / CHAMBRES_PAR_PAGE);
  const pagedChambres = filteredChambres.slice((page - 1) * CHAMBRES_PAR_PAGE, page * CHAMBRES_PAR_PAGE);
  const currentYear = new Date().getFullYear();

  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("site_theme") as "dark" | "light" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("site_theme", newTheme);
  };

  return (
    <div className={`public-site ${theme === "light" ? "light-mode" : ""}`}>
      {/* Navbar */}
      <header className="public-navbar">
        <div className="public-logo">
          <img src="/logo.png" alt="Cite Telico" className="brand-logo-img" />
          <span>Cite Telico</span>
        </div>
        <nav className="public-nav-links">
          <a href="#hero" className="public-nav-link">Accueil</a>
          <a href="#chambres" className="public-nav-link">Chambres</a>
          <a href="#services" className="public-nav-link">Services</a>
          <a href="#contact" className="public-nav-link">Contact</a>
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={toggleTheme}
            className="btn btn-secondary"
            style={{
              padding: "8px 14px",
              borderRadius: "20px",
              fontSize: "1.1rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: theme === "light" ? "rgba(0, 0, 0, 0.06)" : "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}
            title={theme === "dark" ? "Passer au Mode Clair" : "Passer au Mode Sombre"}
          >
            {theme === "dark" ? "🌙 Sombre" : "☀️ Clair"}
          </button>
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Link
                href={user.role === "gerant" ? "/dashboard" : "/visiteur"}
                className="btn btn-secondary"
                style={{ padding: "10px 18px", fontSize: "0.9rem" }}
              >
                {user.role === "gerant" ? "🔒 Espace Gestion" : "👤 Mon Espace"}
              </Link>
              <button onClick={handleLogout} className="btn btn-danger" style={{ padding: "10px 18px", fontSize: "0.9rem" }}>
                Déconnexion
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn btn-primary" style={{ padding: "10px 20px" }}>
              🔑 Connexion
            </Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <section id="hero" className="public-hero">
        <h1 className="public-hero-title">
          Votre Confort, Notre Priorité <br />
          Bienvenue à la <span style={{ color: "#38bdf8" }}>Cité Telico</span>
        </h1>
        <p className="public-hero-subtitle">
          Découvrez nos résidences d'exception et chambres haut standing dotées d'équipements de pointe.
        </p>
        <div className="public-search-bar">
          <span style={{ fontSize: "1.2rem", paddingLeft: "10px" }}>🔍</span>
          <input
            type="number"
            placeholder="Prix max (GNF)..."
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="Tous">Tous types</option>
            <option value="Chambre simple">Chambre simple</option>
            <option value="Chambre douce meublée">Chambre douce meublée</option>
            <option value="Chambre douce non meublée">Chambre douce non meublée</option>
            <option value="Chambre salon">Chambre salon</option>
          </select>
          <a href="#chambres" className="btn btn-primary" style={{ borderRadius: "16px", padding: "12px 24px" }}>
            Rechercher
          </a>
        </div>
      </section>

      {/* Chambres */}
      <section id="chambres" className="public-section">
        <h2 className="public-section-title">Nos Résidences Disponibles</h2>
        <p className="public-section-subtitle">
          Trouvez la chambre idéale correspondant à vos critères.
        </p>

        {loading ? (
          <p style={{ textAlign: "center", color: "#94a3b8" }}>Chargement des logements...</p>
        ) : filteredChambres.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
            <p style={{ fontSize: "1.2rem" }}>Aucune chambre libre ne correspond à vos filtres.</p>
            <button className="btn btn-secondary" onClick={() => { setFilterType("Tous"); setMaxPrice(""); }} style={{ marginTop: "14px" }}>
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <>
            <div className="room-showcase-grid">
              {pagedChambres.map((chambre) => (
                <article key={chambre.id_chambre} className="room-card">
                  <div className="room-image-placeholder">
                    {chambre.photo
                      ? <img src={chambre.photo} alt={`Chambre ${chambre.numero}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : getEmojiForType(chambre.type_chambre)}
                    <span className="room-tag">{chambre.type_chambre}</span>
                  </div>
                  <div className="room-card-content">
                    <div className="room-card-header">
                      <h3 className="room-card-title">Chambre N° {chambre.numero}</h3>
                      <span className="room-card-price">{chambre.prix.toLocaleString()} GNF / mois</span>
                    </div>
                    <div className="room-card-specs">
                      <span>⚡ Electricité 24/7</span>
                      <span>💧 Eau incluse</span>
                      <span>🧹 Entretien</span>
                    </div>
                    <a
                      href="#contact"
                      className="btn btn-secondary"
                      style={{ width: "100%", textAlign: "center", display: "block" }}
                      onClick={() => setContactForm({ ...contactForm, message: `Bonjour, je suis intéressé par la Chambre N° ${chambre.numero} (${chambre.type_chambre}) à ${chambre.prix.toLocaleString()} GNF.` })}
                    >
                      Réserver / Visiter
                    </a>
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "40px" }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ padding: "10px 20px", opacity: page === 1 ? 0.4 : 1 }}
                >
                  ← Précédent
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    className={`btn ${p === page ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setPage(p)}
                    style={{ padding: "10px 16px", minWidth: "44px" }}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className="btn btn-secondary"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{ padding: "10px 20px", opacity: page === totalPages ? 0.4 : 1 }}
                >
                  Suivant →
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Services */}
      <section id="services" className="public-section" style={{ background: "rgba(10, 20, 35, 0.3)" }}>
        <h2 className="public-section-title">Prestations de Haut Standing</h2>
        <p className="public-section-subtitle">Bénéficiez d'une qualité de service sans compromis.</p>
        <div className="services-grid">
          <div className="service-card">
            <span className="service-icon">🛡️</span>
            <h3>Sécurité H24</h3>
            <p>Clôture sécurisée, gardiennage physique permanent et vidéosurveillance moderne.</p>
          </div>
          <div className="service-card">
            <span className="service-icon">⚡</span>
            <h3>Énergie &amp; Eau stables</h3>
            <p>Réseau fiable avec groupe électrogène de secours et cuve d'eau à grand débit.</p>
          </div>
          <div className="service-card">
            <span className="service-icon">📡</span>
            <h3>Connexion Wifi</h3>
            <p>Accès internet haut débit illimité par fibre pour le télétravail ou le divertissement.</p>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="public-section">
        <h2 className="public-section-title">Discutons de Votre Projet</h2>
        <p className="public-section-subtitle">
          Une question ? Remplissez ce formulaire et obtenez un retour sous 24h.
        </p>
        <div className="contact-form-container">
          {submitted ? (
            <div className="status-pill status-complete" style={{ display: "flex", padding: "20px", fontSize: "1rem", borderRadius: "18px", margin: "0 auto", maxWidth: "100%", justifyContent: "center" }}>
              🎉 Merci ! Votre demande a été transmise. Notre gérant vous recontactera sous peu.
            </div>
          ) : (
            <form className="form-grid" onSubmit={handleContactSubmit}>
              {contactError && (
                <div className="status-pill status-warning" style={{ borderRadius: "12px", justifyContent: "center" }}>
                  ⚠️ {contactError}
                </div>
              )}
              <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                <div className="form-field">
                  <label>Votre nom complet</label>
                  <input className="input" type="text" required value={contactForm.nom} onChange={(e) => setContactForm({ ...contactForm, nom: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Votre adresse e-mail</label>
                  <input className="input" type="email" required value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} />
                </div>
              </div>
              <div className="form-field">
                <label>Logement recherché</label>
                <select className="select" value={contactForm.typeChambre} onChange={(e) => setContactForm({ ...contactForm, typeChambre: e.target.value })}>
                  <option value="Chambre simple">Chambre simple</option>
                  <option value="Chambre douce meublée">Chambre douce meublée</option>
                  <option value="Chambre douce non meublée">Chambre douce non meublée</option>
                  <option value="Chambre salon">Chambre salon</option>
                </select>
              </div>
              <div className="form-field">
                <label>Votre message</label>
                <textarea
                  className="input"
                  rows={4}
                  required
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  style={{ resize: "none" }}
                  placeholder="Expliquez-nous votre besoin..."
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={contactLoading} style={{ marginTop: "10px" }}>
                {contactLoading ? "Envoi en cours..." : "Envoyer ma demande"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="public-footer">
        <div className="footer-brand">Cité Telico</div>
        <div className="footer-nav">
          <a href="#hero">Accueil</a>
          <a href="#chambres">Chambres</a>
          <a href="#services">Services</a>
          <a href="#contact">Contact</a>
        </div>
        <p>&copy; {currentYear} Cité Telico. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
