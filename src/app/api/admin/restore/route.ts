import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { prisma } from "../../../../../prisma/client";

export async function POST(req: Request) {
  try {
    const sessionCookie = cookies().get("user_session");
    if (!sessionCookie) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

    const user = JSON.parse(sessionCookie.value);
    if (user.role !== "gerant") return NextResponse.json({ error: "Accès refusé. Administrateur uniquement." }, { status: 403 });

    const body = await req.json();
    const { backupData } = body;

    if (!backupData || typeof backupData !== "object") {
      return NextResponse.json({ error: "Données de sauvegarde invalides" }, { status: 400 });
    }

    const { clients, chambres, contrats, contratChambres, paiements, depenses, clotures, demandesContact } = backupData;

    // Transaction de restauration sécurisée
    await prisma.$transaction(async (tx) => {
      // 1. Purge propre des anciennes données opérationnelles
      await tx.paiement.deleteMany();
      await tx.contratChambre.deleteMany();
      await tx.contrat.deleteMany();
      await tx.client.deleteMany();
      await tx.depense.deleteMany();
      await tx.cloture.deleteMany();
      await tx.demandeContact.deleteMany();

      // 2. Restauration des Chambres (si données présentes)
      if (Array.isArray(chambres) && chambres.length > 0) {
        for (const ch of chambres) {
          await tx.chambre.upsert({
            where: { id_chambre: ch.id_chambre },
            update: { numero: ch.numero, type_chambre: ch.type_chambre, prix: ch.prix, statut: ch.statut, photo: ch.photo },
            create: { id_chambre: ch.id_chambre, numero: ch.numero, type_chambre: ch.type_chambre, prix: ch.prix, statut: ch.statut, photo: ch.photo },
          });
        }
      }

      // 3. Restauration des Clients
      if (Array.isArray(clients) && clients.length > 0) {
        for (const cl of clients) {
          await tx.client.create({
            data: {
              id_client: cl.id_client,
              nom: cl.nom,
              prenom: cl.prenom,
              sexe: cl.sexe,
              telephone: cl.telephone,
              profession: cl.profession,
              id_chambre: cl.id_chambre,
              date_entree: new Date(cl.date_entree),
              statut: cl.statut ?? "Actif",
            },
          });
        }
      }

      // 4. Restauration des Contrats
      if (Array.isArray(contrats) && contrats.length > 0) {
        for (const ct of contrats) {
          await tx.contrat.create({
            data: {
              id_contrat: ct.id_contrat,
              id_client: ct.id_client,
              date_debut: new Date(ct.date_debut),
              date_fin: ct.date_fin ? new Date(ct.date_fin) : null,
              montant: ct.montant,
            },
          });
        }
      }

      // 5. Restauration des Liaisons Contrat-Chambres
      if (Array.isArray(contratChambres) && contratChambres.length > 0) {
        for (const cc of contratChambres) {
          await tx.contratChambre.create({
            data: {
              id_contrat: cc.id_contrat,
              id_chambre: cc.id_chambre,
            },
          });
        }
      }

      // 6. Restauration des Paiements
      if (Array.isArray(paiements) && paiements.length > 0) {
        for (const p of paiements) {
          await tx.paiement.create({
            data: {
              id_paiement: p.id_paiement,
              id_client: p.id_client,
              id_contrat: p.id_contrat,
              date_paiement: new Date(p.date_paiement),
              mois_paye: p.mois_paye,
              mois_ym: p.mois_ym,
              montant: p.montant,
              statut: p.statut ?? "Complet",
              numero_recu: p.numero_recu,
            },
          });
        }
      }

      // 7. Restauration des Dépenses
      if (Array.isArray(depenses) && depenses.length > 0) {
        for (const d of depenses) {
          await tx.depense.create({
            data: {
              id_depense: d.id_depense,
              libelle: d.libelle,
              montant: d.montant,
              date_depense: new Date(d.date_depense),
            },
          });
        }
      }

      // 8. Restauration des Clôtures
      if (Array.isArray(clotures) && clotures.length > 0) {
        for (const cl of clotures) {
          await tx.cloture.create({
            data: {
              id_cloture: cl.id_cloture,
              mois: cl.mois,
              date_cloture: new Date(cl.date_cloture),
              total_du: cl.total_du,
              total_encaisse: cl.total_encaisse,
              total_depense: cl.total_depense,
              solde: cl.solde,
              statut: cl.statut,
              valide_par: cl.valide_par,
              commentaire: cl.commentaire,
            },
          });
        }
      }

      // 9. Restauration des Demandes de Contact
      if (Array.isArray(demandesContact) && demandesContact.length > 0) {
        for (const dc of demandesContact) {
          await tx.demandeContact.create({
            data: {
              id_demande: dc.id_demande,
              nom: dc.nom,
              email: dc.email,
              type_chambre: dc.type_chambre,
              message: dc.message,
              date_demande: new Date(dc.date_demande),
              traitee: dc.traitee ?? false,
            },
          });
        }
      }
    });

    const ip = headers().get("x-forwarded-for") ?? "inconnue";
    await prisma.auditLog.create({
      data: {
        utilisateur: user.login,
        id_user: user.id_user,
        action: "RESTAURATION",
        details: `Restauration de base réussie (${clients?.length ?? 0} clients, ${paiements?.length ?? 0} paiements)`,
        ip,
      },
    });

    return NextResponse.json({ success: true, message: "La base de données a été restaurée avec succès !" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: "Erreur lors de la restauration: " + msg }, { status: 500 });
  }
}
