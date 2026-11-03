import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "../../../../../prisma/client";
import { verifySessionToken } from "../../../../lib/session";

export async function GET() {
  const user = await verifySessionToken(cookies().get("user_session")?.value);
  if (!user || user.role !== "visiteur") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const link = await prisma.appConfig.findUnique({ where: { cle: `visitor_client_${user.id_user}` } });
    const id_client = link?.valeur ? Number(link.valeur) : null;
    const clients = id_client && Number.isInteger(id_client)
      ? await prisma.client.findMany({
          where: { id_client },
          include: {
            chambre: true,
            contrats: {
              include: { contrat_chambres: { include: { chambre: true } } },
              orderBy: { id_contrat: "desc" },
            },
            paiements: { orderBy: { id_paiement: "desc" } },
          },
        })
      : await prisma.client.findMany({
          where: { nom: user.nom, prenom: user.prenom },
          orderBy: { id_client: "desc" },
          take: 2,
          include: {
            chambre: true,
            contrats: {
              include: { contrat_chambres: { include: { chambre: true } } },
              orderBy: { id_contrat: "desc" },
            },
            paiements: { orderBy: { id_paiement: "desc" } },
          },
        });
    if (!link && clients.length > 1) {
      return NextResponse.json({ reservations: [], warning: "Contactez le gestionnaire pour associer votre dossier à votre compte." });
    }
    return NextResponse.json({ reservations: clients });
  } catch {
    return NextResponse.json({ error: "Impossible de charger les réservations" }, { status: 500 });
  }
}
