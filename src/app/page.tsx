"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Chambre = {
  id_chambre: number;
  numero: string;
  type_chambre: string;
  prix: number;
  statut: string;
};

export default function PublicHome() {
  const [chambres, setChambres] = useState<Chambre[]>([]);
  const [filteredChambres, setFilteredChambres] = useState<Chambre[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("Tous");
  const [maxPrice, setMaxPrice] = useState("");
  const [user, setUser] = useState<any>(null);

  const [contactForm, setContactForm] = useState({ nom: "", email: "", message: "", typeChambre: "Standard" });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/chambres");
        const data = await res.json();
        const disponibles = (data.chambres || []).filter((c: Chambre) => c.statut === "Libre");
        setChambres(disponibles);
        setFilteredChambres(disponibles);

        // Get user session
        const authRes = await fetch("/api/auth/me");
        const authData = await authRes.json();
        setUser(authData.user);
      } catch (err) {
        console.error("Erreur lors de la recuperation des donnees.", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    let result = chambres;
    if (filterType !== "Tous") {
      result = result.filter(c => c.type_chambre === filterType);
    }
    if (maxPrice !== "") {
      const priceLimit = parseFloat(maxPrice);
      if (!isNaN(priceLimit)) {
        result = result.filter(c => c.prix <= priceLimit);
      }
    }
    setFilteredChambres(result);
  }, [filterType, maxPrice, chambres]);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setContactForm({ nom: "", email: "", message: "", typeChambre: "Standard" });
    }, 4000);
  };

  const getEmojiForType = (type: string) => {
    switch (type) {
      case "Studio": return "🏢";
      case "Premium": return "💎";
      case "Appartement": return "🏠";
      default: return "🛏️";
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="public-site">
      {/* Barre de navigation publique */}
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
        <Link href="/login" className="btn btn-primary" style={{ padding: "10px 20px" }}>
          {user ? (user.role === "gerant" ? "🔒 Espace Gestion" : "👤 Mon Espace") : "🔑 Connexion"}
        </Link>
      </header>

      {/* Hero Section */}
      <section id="hero" className="public-hero">
        <h1 className="public-hero-title">
          Votre Confort, Notre Priorite <br />
          Bienvenue a la <span style={{ color: "#38bdf8" }}>Cite Telico</span>
        </h1>
        <p className="public-hero-subtitle">
          Decouvrez nos residences d'exception et chambres haut standing dotees d'equipements de pointe et situees dans les meilleurs quartiers pour un cadre de vie de reve.
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
            <option value="Standard">Standard</option>
            <option value="Premium">Premium</option>
            <option value="Studio">Studio</option>
            <option value="Appartement">Appartement</option>
          </select>
          <a href="#chambres" className="btn btn-primary" style={{ borderRadius: "16px", padding: "12px 24px" }}>
            Rechercher
          </a>
        </div>
      </section>

      {/* Chambres Section */}
      <section id="chambres" className="public-section">
        <h2 className="public-section-title">Nos Residences Disponibles</h2>
        <p className="public-section-subtitle">
          Trouvez la chambre ideale correspondant a vos criteres. Nos biens vacants n'attendent que vous.
        </p>

        {loading ? (
          <p style={{ textAlign: "center", color: "#94a3b8" }}>Chargement des logements...</p>
        ) : filteredChambres.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
            <p style={{ fontSize: "1.2rem" }}>Aucune chambre libre ne correspond a vos filtres actuels.</p>
            <button className="btn btn-secondary" onClick={() => { setFilterType("Tous"); setMaxPrice(""); }} style={{ marginTop: "14px" }}>
              Reinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="room-showcase-grid">
            {filteredChambres.map((chambre) => (
              <article key={chambre.id_chambre} className="room-card">
                <div className="room-image-placeholder">
                  {getEmojiForType(chambre.type_chambre)}
                  <span className="room-tag">{chambre.type_chambre}</span>
                </div>
                <div className="room-card-content">
                  <div className="room-card-header">
                    <h3 className="room-card-title">Chambre N° {chambre.numero}</h3>
                    <span className="room-card-price">{chambre.prix.toLocaleString()} GNF / mois</span>
                  </div>
                  <div className="room-card-specs">
                    <span>⚡ Electricite 24/7</span>
                    <span>💧 Eau incluse</span>
                    <span>🧹 Entretien</span>
                  </div>
                  <a
                    href="#contact"
                    className="btn btn-secondary"
                    style={{ width: "100%", textAlign: "center", display: "block" }}
                    onClick={() => setContactForm({ ...contactForm, message: `Bonjour, je suis interesse par la Chambre N° ${chambre.numero} (${chambre.type_chambre}) a ${chambre.prix.toLocaleString()} GNF.` })}
                  >
                    Reserver / Visiter
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Services Section */}
      <section id="services" className="public-section" style={{ background: "rgba(10, 20, 35, 0.3)" }}>
        <h2 className="public-section-title">Prestations de Haut Standing</h2>
        <p className="public-section-subtitle">
          Beneficiez d'une qualite de service sans compromis, incluse dans votre bail.
        </p>

        <div className="services-grid">
          <div className="service-card">
            <span className="service-icon">🛡️</span>
            <h3>Securite H24</h3>
            <p>Cloture securisee, gardiennage physique permanent et systeme de videosurveillance moderne des espaces communs.</p>
          </div>
          <div className="service-card">
            <span className="service-icon">⚡</span>
            <h3>Energie &amp; Eau stables</h3>
            <p>Reseau d'alimentation fiable dote d'un groupe electrogene de secours et cuve de distribution d'eau a grand debit.</p>
          </div>
          <div className="service-card">
            <span className="service-icon">📡</span>
            <h3>Connexion Wifi</h3>
            <p>Acces internet haut debit illimite par fibre pour repondre a vos besoins de teletravail ou de divertissement.</p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="public-section">
        <h2 className="public-section-title">Discutons de Votre Projet</h2>
        <p className="public-section-subtitle">
          Une question concernant nos modalites de reservation ? Remplissez ce formulaire et obtenez un retour sous 24h.
        </p>

        <div className="contact-form-container">
          {submitted ? (
            <div className="status-pill status-complete" style={{ display: "flex", padding: "20px", fontSize: "1rem", borderRadius: "18px", margin: "0 auto", maxWidth: "100%", justifyContent: "center" }}>
              🎉 Merci ! Votre demande a ete transmise. Notre gerant vous recontactera sous peu.
            </div>
          ) : (
            <form className="form-grid" onSubmit={handleContactSubmit}>
              <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                <div className="form-field">
                  <label>Votre nom complet</label>
                  <input
                    className="input"
                    type="text"
                    required
                    value={contactForm.nom}
                    onChange={(e) => setContactForm({ ...contactForm, nom: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Votre adresse e-mail</label>
                  <input
                    className="input"
                    type="email"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Logement recherche</label>
                <select
                  className="select"
                  value={contactForm.typeChambre}
                  onChange={(e) => setContactForm({ ...contactForm, typeChambre: e.target.value })}
                >
                  <option value="Standard">Chambre Standard</option>
                  <option value="Premium">Chambre Premium</option>
                  <option value="Studio">Studio</option>
                  <option value="Appartement">Appartement complet</option>
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

              <button className="btn btn-primary" type="submit" style={{ marginTop: "10px" }}>
                Envoyer ma demande
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="public-footer">
        <div className="footer-brand">Cite Telico</div>
        <div className="footer-nav">
          <a href="#hero">Accueil</a>
          <a href="#chambres">Chambres</a>
          <a href="#services">Services</a>
          <a href="#contact">Contact</a>
        </div>
        <p>&copy; {currentYear} Cite Telico. Tous droits reserves.</p>
      </footer>
    </div>
  );
}
