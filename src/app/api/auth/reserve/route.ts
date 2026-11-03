import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { prisma } from "../../../../../prisma/client";
import { monthYearToYm } from "../../../../lib/dates";
import { verifySessionToken } from "../../../../lib/session";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const user = await verifySessionToken(cookies().get("user_session")?.value);
    if (!user || user.role !== "visiteur") {
      return NextResponse.json({ error: "Session visiteur requise" }, { status: 401 });
    }
    const { sexe, telephone, profession, mois_paye } = body;
    const id_chambre = Number(body.id_chambre);

    if (!Number.isInteger(id_chambre) || id_chambre <= 0 || !["M", "F"].includes(sexe) || typeof mois_paye !== "string") {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }
    const mois_ym = monthYearToYm(mois_paye);
    if (!mois_ym) return NextResponse.json({ error: "Mois de paiement invalide" }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const chambre = await tx.chambre.findUnique({ where: { id_chambre } });
      if (!chambre || chambre.statut !== "Libre") {
        throw new Error("Cette chambre n'est plus disponible");
      }

      const clientLink = await tx.appConfig.findUnique({ where: { cle: `visitor_client_${user.id_user}` } });
      let linkedClient = clientLink?.valeur
        ? await tx.client.findUnique({ where: { id_client: Number(clientLink.valeur) } })
        : null;
      if (linkedClient?.statut === "Actif") {
        throw new Error("Ce compte possède déjà une réservation active.");
      }

      if (!linkedClient && !clientLink) {
        const legacyMatches = await tx.client.findMany({
          where: { nom: user.nom, prenom: user.prenom },
          orderBy: { id_client: "desc" },
          take: 2,
        });
        if (legacyMatches.length > 1) {
          throw new Error("Plusieurs dossiers portent ce nom; contactez le gestionnaire pour associer votre compte.");
        }
        linkedClient = legacyMatches[0] ?? null;
        if (linkedClient?.statut === "Actif") {
          throw new Error("Un dossier actif existe déjà pour ce nom; contactez le gestionnaire.");
        }
      }

      const client = linkedClient
        ? await tx.client.update({
            where: { id_client: linkedClient.id_client },
            data: { sexe, telephone, profession, id_chambre, date_entree: new Date(), statut: "Actif" },
          })
        : await tx.client.create({
            data: {
              nom: user.nom,
              prenom: user.prenom,
              sexe,
              telephone,
              profession,
              id_chambre,
              date_entree: new Date(),
              statut: "Actif",
            },
          });
      await tx.appConfig.upsert({
        where: { cle: `visitor_client_${user.id_user}` },
        update: { valeur: String(client.id_client) },
        create: { cle: `visitor_client_${user.id_user}`, valeur: String(client.id_client) },
      });
      const contract = await tx.contrat.create({
        data: { id_client: client.id_client, date_debut: new Date(), montant: chambre.prix },
      });
      await tx.contratChambre.create({ data: { id_contrat: contract.id_contrat, id_chambre } });
      const roomUpdate = await tx.chambre.updateMany({
        where: { id_chambre, statut: "Libre" },
        data: { statut: "Occupée" },
      });
      if (roomUpdate.count !== 1) throw new Error("Cette chambre n'est plus disponible");

      const numero_recu = `REC-RES-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const payment = await tx.paiement.create({
        data: {
          id_client: client.id_client,
          id_contrat: contract.id_contrat,
          date_paiement: new Date(),
          mois_paye,
          mois_ym,
          montant: chambre.prix,
          statut: "Complet",
          numero_recu,
        },
      });
      await tx.auditLog.create({
        data: {
          utilisateur: user.login,
          id_user: user.id_user,
          action: "RESERVATION",
          details: `Chambre ${chambre.numero} réservée, reçu ${numero_recu}`,
          ip: headers().get("x-forwarded-for") ?? "inconnue",
        },
      });
      return { client, contract, payment };
    });

    return NextResponse.json({
      success: true,
      client: result.client,
      contrat: result.contract,
      paiement: result.payment,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    const status = message.includes("chambre") || message.includes("réservation") || message.includes("dossier actif") || message.includes("Plusieurs dossiers") ? 409 : 500;
    return NextResponse.json({ error: `Erreur lors de la réservation: ${message}` }, { status });
  }
}
