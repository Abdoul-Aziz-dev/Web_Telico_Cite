"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Chambre = {
  id_chambre: number;
  numero: string;
  type_chambre: string;
  prix: number;
  statut: string;
  photo?: string | null;
};

type ReservationInfo = {
  id_client: number;
  nom: string;
  prenom: string;
  sexe: string;
  telephone?: string | null;
  profession?: string | null;
  date_entree: string;
  statut: string;
  chambre?: Chambre | null;
  contrats?: { id_contrat: number; montant: number; date_debut: string }[];
  paiements?: { id_paiement: number; mois_paye: string; montant: number; numero_recu?: string | null; date_paiement: string }[];
};

type RecuInfo = {
  numero_recu: string;
  montant: number;
  mois_paye: string;
  date_paiement: string;
  chambre_numero: string;
  chambre_type: string;
};

export default function VisitorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [chambres, setChambres] = useState<Chambre[]>([]);
  const [myReservations, setMyReservations] = useState<ReservationInfo[]>([]);

  // Reservation Form Modal state
  const [selectedChambre, setSelectedChambre] = useState<Chambre | null>(null);
  const [form, setForm] = useState({ sexe: "M", telephone: "", profession: "", mois_paye: "" });
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [recu, setRecu] = useState<RecuInfo | null>(null);

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

  async function loadData(currentUser: any) {
    try {
      // Load free chambers
      const resRooms = await fetch("/api/chambres");
      const roomsData = await resRooms.json();
      setChambres((roomsData.chambres || []).filter((c: Chambre) => c.statut === "Libre"));

      // Load visitor's active rentals (query clients by name/prenom)
      const resClients = await fetch("/api/clients");
      const clientsData = await resClients.json();
      
      const filtered = (clientsData.clients || []).filter(
        (c: any) =>
          c.nom.toLowerCase() === currentUser.nom.toLowerCase() &&
          c.prenom.toLowerCase() === currentUser.prenom.toLowerCase()
      );
      
      // Fetch details for each client record found (to include contracts and payments if endpoints support it, or resolve through custom logic)
      // Since we just need to list their bookings, let's load all data
      // For now, clients data includes chamber information as we defined in DB.
      // Let's resolve their rooms.
      const resolvedReservations = await Promise.all(
        filtered.map(async (cli: any) => {
          // get the individual client details to get specific room etc.
          const rCli = await fetch(`/api/clients/${cli.id_client}`);
          const dCli = await rCli.json();
          return dCli.client;
        })
      );
      setMyReservations(resolvedReservations.filter(Boolean));
    } catch (err) {
      console.error("Erreur chargement donnees", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (!data.user || data.user.role !== "visiteur") {
          router.push("/login");
        } else {
          setUser(data.user);
          // Set default booking month to current month/year
          const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
          const curMonth = months[new Date().getMonth()];
          const curYear = new Date().getFullYear();
          setForm(f => ({ ...f, mois_paye: `${curMonth} ${curYear}` }));
          
          await loadData(data.user);
        }
      } catch {
        router.push("/login");
      }
    }
    checkAuth();
  }, [router]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (err) {
      console.error(err);
    }
  }

  async function handleBookSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedChambre) return;
    setBookingLoading(true);
    setBookingError(null);

    try {
      const payload = {
        nom: user.nom,
        prenom: user.prenom,
        sexe: form.sexe,
        telephone: form.telephone,
        profession: form.profession,
        id_chambre: selectedChambre.id_chambre,
        montant: selectedChambre.prix,
        mois_paye: form.mois_paye
      };

      const res = await fetch("/api/auth/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Une erreur est survenue lors de la réservation.");
      }

      setRecu({
        numero_recu: data.paiement.numero_recu,
        montant: data.paiement.montant,
        mois_paye: data.paiement.mois_paye,
        date_paiement: new Date().toISOString(),
        chambre_numero: selectedChambre.numero,
        chambre_type: selectedChambre.type_chambre,
      });
      setSelectedChambre(null);
      setForm({ sexe: "M", telephone: "", profession: "", mois_paye: "" });
      await loadData(user);

    } catch (err: any) {
      setBookingError(err.message);
    } finally {
      setBookingLoading(false);
    }
  }

  function printRecu(r: RecuInfo) {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Reçu de Réservation - Cité Telico</title>
      <style>
        body{font-family:Arial,sans-serif;color:#1e293b;padding:50px;max-width:580px;margin:auto}
        .header{text-align:center;border-bottom:2px solid #0f172a;padding-bottom:20px;margin-bottom:30px}
        h1{font-size:1.8rem;margin:0}h2{font-size:1rem;color:#64748b;margin:5px 0 0}
        .badge{display:inline-block;background:#f0fdf4;color:#15803d;border:1px solid #86efac;padding:6px 18px;border-radius:99px;font-weight:700;margin-top:14px;font-size:0.95rem}
        .row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:0.92rem}
        .label{color:#64748b}.value{font-weight:600}
        .amount{text-align:center;background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;padding:24px;margin:24px 0}
        .amount-val{font-size:2rem;font-weight:900;color:#0f172a}
        .footer{text-align:center;color:#94a3b8;font-size:0.78rem;margin-top:40px;border-top:1px solid #e2e8f0;padding-top:16px}
      </style></head>
      <body onload="window.print();window.close()">
        <div class="header">
          <h1>CITÉ TELICO</h1>
          <h2>Conakry, Guinée — Gestion Immobilière</h2>
          <div class="badge">✅ RÉSERVATION CONFIRMÉE</div>
        </div>
        <div class="row"><span class="label">N° de reçu</span><span class="value" style="font-family:monospace">${r.numero_recu}</span></div>
        <div class="row"><span class="label">Locataire</span><span class="value">${user.prenom} ${user.nom}</span></div>
        <div class="row"><span class="label">Chambre réservée</span><span class="value">N° ${r.chambre_numero} — ${r.chambre_type}</span></div>
        <div class="row"><span class="label">Mois de bail</span><span class="value">${r.mois_paye}</span></div>
        <div class="row"><span class="label">Date de réservation</span><span class="value">${new Date(r.date_paiement).toLocaleDateString("fr-FR")}</span></div>
        <div class="amount">
          <div style="color:#64748b;font-size:0.88rem;margin-bottom:8px">Montant encaissé</div>
          <div class="amount-val">${r.montant.toLocaleString()} GNF</div>
        </div>
        <div class="footer">Cité Telico &copy; ${new Date().getFullYear()} — Merci de votre confiance</div>
      </body></html>
    `);
    win.document.close();
  }

  function printRecuPaiement(p: { numero_recu?: string | null; montant: number; mois_paye: string; date_paiement: string }, chambreNum: string) {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Reçu - Cité Telico</title>
      <style>
        body{font-family:Arial,sans-serif;color:#1e293b;padding:50px;max-width:580px;margin:auto}
        .header{text-align:center;border-bottom:2px solid #0f172a;padding-bottom:20px;margin-bottom:30px}
        h1{font-size:1.8rem;margin:0}.badge{display:inline-block;background:#f0fdf4;color:#15803d;border:1px solid #86efac;padding:6px 18px;border-radius:99px;font-weight:700;margin-top:14px}
        .row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:0.92rem}
        .label{color:#64748b}.value{font-weight:600}
        .amount{text-align:center;background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;padding:24px;margin:24px 0}
        .amount-val{font-size:2rem;font-weight:900}
        .footer{text-align:center;color:#94a3b8;font-size:0.78rem;margin-top:40px;border-top:1px solid #e2e8f0;padding-top:16px}
      </style></head>
      <body onload="window.print();window.close()">
        <div class="header"><h1>CITÉ TELICO</h1><div class="badge">✅ PAIEMENT CONFIRMÉ</div></div>
        <div class="row"><span class="label">N° reçu</span><span class="value" style="font-family:monospace">${p.numero_recu || "—"}</span></div>
        <div class="row"><span class="label">Locataire</span><span class="value">${user.prenom} ${user.nom}</span></div>
        <div class="row"><span class="label">Chambre</span><span class="value">N° ${chambreNum}</span></div>
        <div class="row"><span class="label">Mois payé</span><span class="value">${p.mois_paye}</span></div>
        <div class="row"><span class="label">Date</span><span class="value">${new Date(p.date_paiement).toLocaleDateString("fr-FR")}</span></div>
        <div class="amount"><div style="color:#64748b;font-size:0.88rem;margin-bottom:8px">Montant</div><div class="amount-val">${p.montant.toLocaleString()} GNF</div></div>
        <div class="footer">Cité Telico &copy; ${new Date().getFullYear()}</div>
      </body></html>
    `);
    win.document.close();
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

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "16px",
        background: "#050b14",
        color: "#e2e8f0"
      }}>
        <div style={{
          width: "40px",
          height: "40px",
          border: "4px solid rgba(56, 189, 248, 0.2)",
          borderTopColor: "#38bdf8",
          borderRadius: "50%",
          animation: "spin 1s linear infinite"
        }} />
        <p style={{ color: "#94a3b8" }}>Chargement de l'Espace Visiteur...</p>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}} />
      </div>
    );
  }

  return (
    <div className={`public-site ${theme === "light" ? "light-mode" : ""}`} style={{ background: theme === "light" ? "#f8fafc" : "#050b14", minHeight: "100vh" }}>
      {/* Header */}
      <header className="public-navbar">
        <div className="public-logo">
          <img src="/logo.png" alt="Cite Telico" className="brand-logo-img" />
          <span>Cite Telico</span>
          <span className="brand-status-badge" style={{ marginLeft: "10px", fontSize: "0.7rem" }}>Visiteur</span>
        </div>
        <nav className="public-nav-links">
          <a href="#chambres-libres" className="public-nav-link">Chambres Libres</a>
          <a href="#mes-locations" className="public-nav-link">Mes Réservations</a>
        </nav>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={toggleTheme}
            className="btn btn-secondary"
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: theme === "light" ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
            }}
            title={theme === "dark" ? "Passer au Mode Clair" : "Passer au Mode Sombre"}
          >
            {theme === "dark" ? "🌙 Sombre" : "☀️ Clair"}
          </button>
          <span style={{ fontSize: "0.9rem", color: theme === "light" ? "#475569" : "#94a3b8" }}>👋 {user.prenom} {user.nom}</span>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: "8px 18px", fontSize: "0.85rem" }}>
            ❌ Déconnexion
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="public-section" style={{ paddingTop: "40px" }}>
        
        {successMsg && (
          <div className="status-pill status-complete" style={{ display: "flex", padding: "20px", fontSize: "1.05rem", borderRadius: "18px", marginBottom: "30px", justifyContent: "center", width: "100%" }}>
            🎉 {successMsg}
          </div>
        )}

        {/* Modal Reçu de réservation */}
        {recu && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
            <div className="panel" style={{ maxWidth: "500px", width: "100%", padding: "36px", textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🎉</div>
              <h2 style={{ margin: "0 0 6px", fontSize: "1.4rem" }}>Réservation confirmée !</h2>
              <p style={{ color: "#94a3b8", marginBottom: "24px" }}>Chambre N° {recu.chambre_numero} — {recu.chambre_type}</p>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "20px", marginBottom: "24px", textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "0.9rem" }}>
                  <span style={{ color: "#94a3b8" }}>N° de reçu</span>
                  <span style={{ fontFamily: "monospace", color: "#38bdf8" }}>{recu.numero_recu}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: "0.9rem" }}>
                  <span style={{ color: "#94a3b8" }}>Mois de bail</span>
                  <strong>{recu.mois_paye}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: "0.9rem" }}>
                  <span style={{ color: "#94a3b8" }}>Montant encaissé</span>
                  <strong style={{ color: "#34d399" }}>{recu.montant.toLocaleString()} GNF</strong>
                </div>
              </div>
              <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                <button className="btn btn-primary" onClick={() => printRecu(recu)}>🖨️ Imprimer le reçu</button>
                <button className="btn btn-secondary" onClick={() => setRecu(null)}>Fermer</button>
              </div>
            </div>
          </div>
        )}

        {/* Action Header */}
        <div style={{ marginBottom: "50px", textAlign: "center" }}>
          <h1 className="public-hero-title" style={{ fontSize: "2.8rem", marginBottom: "12px" }}>
            Trouvez et Réservez votre chambre idéale
          </h1>
          <p className="public-hero-subtitle" style={{ fontSize: "1.1rem", margin: "0 auto", maxWidth: "600px" }}>
            Parcourez notre liste de chambres de haut standing disponibles en temps réel, payez en toute sécurité et réservez instantanément.
          </p>
        </div>

        {/* Section 1: Chambres Libres */}
        <section id="chambres-libres" style={{ marginBottom: "80px" }}>
          <h2 className="public-section-title" style={{ textAlign: "left", marginBottom: "35px" }}>🛏️ Chambres disponibles ({chambres.length})</h2>
          
          {chambres.length === 0 ? (
            <div className="panel" style={{ textAlign: "center", padding: "60px 40px", color: "#94a3b8" }}>
              <p style={{ fontSize: "1.2rem", margin: 0 }}>Toutes les chambres de la cité Telico sont actuellement occupées.</p>
              <p style={{ fontSize: "0.9rem", marginTop: "8px" }}>Veuillez repasser ultérieurement ou contacter la gérance.</p>
            </div>
          ) : (
            <div className="room-showcase-grid">
              {chambres.map((chambre) => (
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
                      <span>⚡ Énergie 24/7</span>
                      <span>💧 Eau incluse</span>
                      <span>🧹 Service Entretien</span>
                    </div>
                    <button
                      className="btn btn-primary"
                      style={{ width: "100%", textAlign: "center" }}
                      onClick={() => setSelectedChambre(chambre)}
                    >
                      💳 Réservez maintenant
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Section 2: Mes Locations */}
        <section id="mes-locations" style={{ marginBottom: "50px" }}>
          <h2 className="public-section-title" style={{ textAlign: "left", marginBottom: "35px" }}>💼 Mon Historique de Réservations</h2>
          
          {myReservations.length === 0 ? (
            <div className="panel" style={{ padding: "40px", color: "#94a3b8", textAlign: "center" }}>
              Vous n'avez effectué aucune réservation pour le moment.
            </div>
          ) : (
            <div className="panel">
              <table className="table">
                <thead>
                  <tr>
                    <th>N° Chambre</th>
                    <th>Date d'entrée</th>
                    <th>Loyer contractuel</th>
                    <th>Statut occupation</th>
                    <th>Reçus</th>
                  </tr>
                </thead>
                <tbody>
                  {myReservations.map((resv, i) => (
                    <tr key={i}>
                      <td><strong>{resv.chambre?.numero || "N/A"}</strong></td>
                      <td>{new Date(resv.date_entree).toLocaleDateString("fr-FR")}</td>
                      <td><strong>{(resv.chambre?.prix || 0).toLocaleString()}</strong> GNF / mois</td>
                      <td>
                        <span className={`status-pill ${resv.statut === "Actif" ? "status-complete" : "status-muted"}`}>
                          {resv.statut === "Actif" ? "Actuelle (Occupée)" : "Libérée (Historique)"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {(resv.paiements || []).map((p) => (
                            <button
                              key={p.id_paiement}
                              className="btn btn-sm btn-secondary"
                              onClick={() => printRecuPaiement(p, resv.chambre?.numero || "?")}
                              style={{ fontSize: "0.78rem", whiteSpace: "nowrap" }}
                            >
                              🧾 {p.mois_paye}
                            </button>
                          ))}
                          {!(resv.paiements || []).length && <span style={{ color: "#475569", fontSize: "0.82rem" }}>—</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </main>

      {/* Booking Form Modal */}
      {selectedChambre && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999,
          padding: "20px"
        }}>
          <div className="panel" style={{
            maxWidth: "600px",
            width: "100%",
            boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "36px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ margin: 0 }}>Réservez la Chambre N° {selectedChambre.numero}</h2>
              <button
                onClick={() => { setSelectedChambre(null); setBookingError(null); }}
                style={{ background: "none", border: "none", fontSize: "1.5rem", color: "#64748b", padding: 0 }}
              >
                ✕
              </button>
            </div>

            {bookingError && (
              <div className="status-pill status-warning" style={{ width: "100%", justifyContent: "center", marginBottom: "18px", borderRadius: "12px" }}>
                ⚠️ {bookingError}
              </div>
            )}

            <form onSubmit={handleBookSubmit} className="form-grid">
              <div style={{ fontSize: "0.95rem", color: "#94a3b8", background: "rgba(255,255,255, 0.03)", padding: "16px", borderRadius: "16px", border: "1px solid rgba(255,255,255, 0.05)", marginBottom: "8px" }}>
                <p style={{ margin: "0 0 8px 0" }}>💰 <strong>Loyer mensuel :</strong> {selectedChambre.prix.toLocaleString()} GNF</p>
                <p style={{ margin: 0 }}>👤 <strong>Locataire principal :</strong> {user.prenom} {user.nom}</p>
              </div>

              <div className="grid-2">
                <div className="form-field">
                  <label>Sexe</label>
                  <select className="select" value={form.sexe} onChange={(e) => setForm({ ...form, sexe: e.target.value })}>
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Téléphone de contact</label>
                  <input
                    className="input"
                    type="tel"
                    required
                    placeholder="+224..."
                    value={form.telephone}
                    onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-field">
                  <label>Profession</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="ex: Étudiant, Ingénieur..."
                    value={form.profession}
                    onChange={(e) => setForm({ ...form, profession: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Mois de départ du bail</label>
                  <input
                    className="input"
                    required
                    placeholder="ex: Juillet 2026"
                    value={form.mois_paye}
                    onChange={(e) => setForm({ ...form, mois_paye: e.target.value })}
                  />
                </div>
              </div>

              {/* Simulation Banner */}
              <div style={{ padding: "16px", background: "rgba(52, 211, 153, 0.07)", border: "1px solid rgba(52, 211, 153, 0.15)", borderRadius: "16px", fontSize: "0.85rem", color: "#86efac", display: "flex", gap: "8px" }}>
                <span>🛡️</span>
                <span><strong>Simulateur de Paiement Intégré :</strong> En validant, un paiement fictif de {selectedChambre.prix.toLocaleString()} GNF sera débité pour confirmer instantanément votre contrat de bail.</span>
              </div>

              <div className="button-group" style={{ justifyContent: "flex-end", marginTop: "14px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setSelectedChambre(null); setBookingError(null); }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={bookingLoading}
                >
                  {bookingLoading ? "Traitement bancaire..." : `💳 Payer & Confirmer (${selectedChambre.prix.toLocaleString()} GNF)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
