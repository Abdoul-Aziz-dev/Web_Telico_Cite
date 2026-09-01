"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Chambre = { numero: string; type_chambre: string; prix: number; statut: string };
type ContratChambre = { chambre?: { numero: string } | null };
type Contrat = {
  id_contrat: number;
  date_debut: string;
  date_fin?: string | null;
  montant: number;
  contrat_chambres: ContratChambre[];
};
type Paiement = {
  id_paiement: number;
  date_paiement: string;
  mois_paye: string;
  numero_recu?: string | null;
  montant: number;
  statut: string;
};
type ClientDetail = {
  id_client: number;
  nom: string;
  prenom: string;
  sexe: string;
  telephone?: string | null;
  profession?: string | null;
  date_entree: string;
  statut: string;
  chambre?: Chambre | null;
  contrats?: Contrat[];
  paiements?: Paiement[];
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("fr-FR");
}

export default function FicheClientPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.client) setClient(d.client);
        else setError("Locataire introuvable.");
      })
      .catch(() => setError("Impossible de charger la fiche."))
      .finally(() => setLoading(false));
  }, [id]);

  function printFiche() {
    if (!client) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const totalPaye = (client.paiements || []).reduce((s, p) => s + p.montant, 0);
    win.document.write(`
      <html><head><title>Fiche Locataire - ${client.prenom} ${client.nom}</title>
      <style>
        body{font-family:Arial,sans-serif;color:#1e293b;padding:40px;line-height:1.6}
        h1{color:#0f172a;border-bottom:2px solid #0f172a;padding-bottom:10px}
        h2{color:#0284c7;margin-top:30px;font-size:1.1rem}
        table{width:100%;border-collapse:collapse;margin-top:10px}
        th,td{border:1px solid #e2e8f0;padding:10px;text-align:left;font-size:0.88rem}
        th{background:#f8fafc;font-weight:600}
        .badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:0.8rem;font-weight:600}
        .actif{background:#dcfce7;color:#166534}
        .inactif{background:#f1f5f9;color:#475569}
        .footer{margin-top:50px;text-align:center;font-size:0.78rem;color:#94a3b8}
      </style></head>
      <body onload="window.print();window.close()">
        <h1>Fiche Locataire — Cité Telico</h1>
        <p><strong>Nom complet :</strong> ${client.prenom} ${client.nom} &nbsp;|&nbsp;
           <strong>Sexe :</strong> ${client.sexe === "M" ? "Masculin" : "Féminin"} &nbsp;|&nbsp;
           <strong>Statut :</strong> <span class="badge ${client.statut === "Actif" ? "actif" : "inactif"}">${client.statut}</span></p>
        <p><strong>Téléphone :</strong> ${client.telephone || "—"} &nbsp;|&nbsp;
           <strong>Profession :</strong> ${client.profession || "—"} &nbsp;|&nbsp;
           <strong>Date d'entrée :</strong> ${fmt(client.date_entree)}</p>
        ${client.chambre ? `
        <h2>Logement Actuel</h2>
        <p>Chambre N° <strong>${client.chambre.numero}</strong> — ${client.chambre.type_chambre} — <strong>${client.chambre.prix.toLocaleString()} GNF/mois</strong></p>` : ""}
        <h2>Contrats (${(client.contrats || []).length})</h2>
        <table><thead><tr><th>N°</th><th>Chambre(s)</th><th>Début</th><th>Fin</th><th>Loyer mensuel</th></tr></thead><tbody>
        ${(client.contrats || []).map(ct => `<tr>
          <td>#${ct.id_contrat}</td>
          <td>${ct.contrat_chambres.map(cc => cc.chambre?.numero).filter(Boolean).join(", ") || "—"}</td>
          <td>${fmt(ct.date_debut)}</td>
          <td>${ct.date_fin ? fmt(ct.date_fin) : "En cours"}</td>
          <td>${ct.montant.toLocaleString()} GNF</td>
        </tr>`).join("")}
        </tbody></table>
        <h2>Paiements (${(client.paiements || []).length}) — Total : ${totalPaye.toLocaleString()} GNF</h2>
        <table><thead><tr><th>Date</th><th>Mois payé</th><th>N° Reçu</th><th>Montant</th><th>Statut</th></tr></thead><tbody>
        ${(client.paiements || []).map(p => `<tr>
          <td>${fmt(p.date_paiement)}</td>
          <td>${p.mois_paye}</td>
          <td>${p.numero_recu || "—"}</td>
          <td>${p.montant.toLocaleString()} GNF</td>
          <td>${p.statut}</td>
        </tr>`).join("")}
        </tbody></table>
        <div class="footer">Cité Telico — Document généré le ${new Date().toLocaleDateString("fr-FR")}</div>
      </body></html>
    `);
    win.document.close();
  }

  if (loading) return <main className="page"><p style={{ color: "#94a3b8" }}>Chargement...</p></main>;
  if (error || !client) return (
    <main className="page">
      <p style={{ color: "#f87171" }}>{error}</p>
      <Link href="/clients" className="btn btn-secondary" style={{ marginTop: "16px" }}>← Retour</Link>
    </main>
  );

  const totalPaye = (client.paiements || []).reduce((s, p) => s + p.montant, 0);
  const contratActif = (client.contrats || []).find(ct => !ct.date_fin || new Date(ct.date_fin) >= new Date());

  return (
    <main className="page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {client.sexe === "M" ? "👨" : "👩"} {client.prenom} {client.nom}
          </h1>
          <p className="page-subtitle">
            Fiche complète du locataire — entrée le {fmt(client.date_entree)}
          </p>
        </div>
        <div className="button-group">
          {client.telephone && (
            <a
              href={`https://wa.me/${client.telephone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(`Bonjour ${client.prenom} ${client.nom}, nous vous contactons depuis l'administration de la Cité Telico. Cordialement.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ background: "rgba(37,211,102,0.15)", color: "#25D366", border: "1px solid rgba(37,211,102,0.3)" }}
            >
              💬 WhatsApp
            </a>
          )}
          <button className="btn btn-secondary" onClick={printFiche}>🖨️ Imprimer la fiche</button>
          <button className="btn btn-secondary" onClick={() => router.push("/clients")}>← Retour</button>
        </div>
      </div>

      {/* Cartes résumé */}
      <section className="grid-4" style={{ marginBottom: "24px" }}>
        <article className="metric-card" style={{ borderLeft: "5px solid #38bdf8" }}>
          <span style={{ color: "#94a3b8" }}>Statut</span>
          <strong>
            <span className={`status-pill ${client.statut === "Actif" ? "status-complete" : "status-muted"}`} style={{ fontSize: "0.9rem" }}>
              {client.statut}
            </span>
          </strong>
        </article>
        <article className="metric-card" style={{ borderLeft: "5px solid #a855f7" }}>
          <span style={{ color: "#94a3b8" }}>Chambre actuelle</span>
          <strong>{client.chambre ? `N° ${client.chambre.numero}` : "—"}</strong>
          <span style={{ fontSize: "0.82rem", color: "#64748b" }}>{client.chambre?.type_chambre || "Non assignée"}</span>
        </article>
        <article className="metric-card" style={{ borderLeft: "5px solid #34d399" }}>
          <span style={{ color: "#94a3b8" }}>Total encaissé</span>
          <strong>{totalPaye.toLocaleString()} <span style={{ fontSize: "0.9rem" }}>GNF</span></strong>
          <span style={{ fontSize: "0.82rem", color: "#64748b" }}>{(client.paiements || []).length} paiement(s)</span>
        </article>
        <article className="metric-card" style={{ borderLeft: "5px solid #fbbf24" }}>
          <span style={{ color: "#94a3b8" }}>Loyer mensuel</span>
          <strong>{contratActif ? `${contratActif.montant.toLocaleString()} GNF` : "—"}</strong>
          <span style={{ fontSize: "0.82rem", color: "#64748b" }}>{contratActif ? "Contrat actif" : "Aucun contrat actif"}</span>
        </article>
      </section>

      <section className="grid-2">
        {/* Infos personnelles */}
        <div className="panel">
          <h2 style={{ marginBottom: "18px" }}>📋 Informations personnelles</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.92rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "10px" }}>
              <span style={{ color: "#94a3b8" }}>Nom complet</span>
              <strong>{client.prenom} {client.nom}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "10px" }}>
              <span style={{ color: "#94a3b8" }}>Sexe</span>
              <span>{client.sexe === "M" ? "👨 Masculin" : "👩 Féminin"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "10px" }}>
              <span style={{ color: "#94a3b8" }}>Téléphone</span>
              <span>{client.telephone || <span style={{ color: "#475569" }}>Non renseigné</span>}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "10px" }}>
              <span style={{ color: "#94a3b8" }}>Profession</span>
              <span>{client.profession || <span style={{ color: "#475569" }}>Non renseignée</span>}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#94a3b8" }}>Date d'entrée</span>
              <span>{fmt(client.date_entree)}</span>
            </div>
          </div>
        </div>

        {/* Logement */}
        <div className="panel">
          <h2 style={{ marginBottom: "18px" }}>🏠 Logement assigné</h2>
          {client.chambre ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.92rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "10px" }}>
                <span style={{ color: "#94a3b8" }}>Numéro</span>
                <strong>Chambre N° {client.chambre.numero}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "10px" }}>
                <span style={{ color: "#94a3b8" }}>Type</span>
                <span>{client.chambre.type_chambre}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "10px" }}>
                <span style={{ color: "#94a3b8" }}>Loyer mensuel</span>
                <strong style={{ color: "#34d399" }}>{client.chambre.prix.toLocaleString()} GNF</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#94a3b8" }}>Statut chambre</span>
                <span className={`status-pill ${client.chambre.statut === "Libre" ? "status-complete" : "status-warning"}`} style={{ fontSize: "0.78rem" }}>
                  {client.chambre.statut}
                </span>
              </div>
            </div>
          ) : (
            <p style={{ color: "#64748b" }}>Aucune chambre assignée à ce locataire.</p>
          )}
        </div>
      </section>

      {/* Contrats */}
      <div className="panel" style={{ marginTop: "24px" }}>
        <h2 style={{ marginBottom: "18px" }}>📝 Historique des contrats ({(client.contrats || []).length})</h2>
        {!(client.contrats || []).length ? (
          <p style={{ color: "#64748b" }}>Aucun contrat enregistré.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>N°</th><th>Chambre(s)</th><th>Début</th><th>Fin</th><th>Loyer mensuel</th><th>Statut</th></tr>
            </thead>
            <tbody>
              {client.contrats!.map((ct) => {
                const expired = ct.date_fin && new Date(ct.date_fin) < new Date();
                return (
                  <tr key={ct.id_contrat}>
                    <td style={{ color: "#64748b" }}>#{ct.id_contrat}</td>
                    <td>{ct.contrat_chambres.map(cc => cc.chambre?.numero).filter(Boolean).join(", ") || "—"}</td>
                    <td>{fmt(ct.date_debut)}</td>
                    <td>{ct.date_fin ? <span className={`status-pill ${expired ? "status-warning" : "status-complete"}`} style={{ fontSize: "0.75rem" }}>{fmt(ct.date_fin)}</span> : <span style={{ color: "#34d399" }}>En cours</span>}</td>
                    <td><strong>{ct.montant.toLocaleString()}</strong> GNF</td>
                    <td><span className={`status-pill ${!ct.date_fin || !expired ? "status-complete" : "status-muted"}`} style={{ fontSize: "0.75rem" }}>{!ct.date_fin ? "Actif" : expired ? "Expiré" : "Actif"}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Paiements */}
      <div className="panel" style={{ marginTop: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <h2 style={{ margin: 0 }}>💰 Historique des paiements ({(client.paiements || []).length})</h2>
          <span style={{ fontSize: "0.9rem", color: "#34d399", fontWeight: 600 }}>
            Total : {totalPaye.toLocaleString()} GNF
          </span>
        </div>
        {!(client.paiements || []).length ? (
          <p style={{ color: "#64748b" }}>Aucun paiement enregistré.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Date</th><th>Mois payé</th><th>N° Reçu</th><th>Montant</th><th>Statut</th></tr>
            </thead>
            <tbody>
              {client.paiements!.map((p) => (
                <tr key={p.id_paiement}>
                  <td>{fmt(p.date_paiement)}</td>
                  <td>{p.mois_paye}</td>
                  <td><span style={{ fontFamily: "monospace", fontSize: "0.82rem", color: "#94a3b8" }}>{p.numero_recu || "—"}</span></td>
                  <td><strong style={{ color: "#34d399" }}>{p.montant.toLocaleString()}</strong> <span style={{ fontSize: "0.78rem", color: "#64748b" }}>GNF</span></td>
                  <td><span className="status-pill status-complete" style={{ fontSize: "0.75rem" }}>{p.statut}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
