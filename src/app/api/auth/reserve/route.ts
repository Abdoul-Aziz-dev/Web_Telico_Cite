import { NextResponse } from "next/server";
import { prisma } from "../../../../../prisma/client";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nom, prenom, sexe, telephone, profession, id_chambre, montant, mois_paye } = body;

    if (!nom || !prenom || !id_chambre || !montant || !mois_paye) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    const chambre = await prisma.chambre.findUnique({ where: { id_chambre } });
    if (!chambre || chambre.statut !== "Libre") {
      return NextResponse.json({ error: "Cette chambre n'est plus disponible" }, { status: 400 });
    }

    const client = await prisma.client.create({
      data: {
        nom,
        prenom,
        sexe,
        telephone,
        profession,
        id_chambre,
        date_entree: new Date(),
        statut: "Actif"
      }
    });

    const contrat = await prisma.contrat.create({
      data: {
        id_client: client.id_client,
        date_debut: new Date(),
        montant: parseFloat(montant)
      }
    });

    await prisma.contratChambre.create({
      data: {
        id_contrat: contrat.id_contrat,
        id_chambre
      }
    });

    await prisma.chambre.update({
      where: { id_chambre },
      data: { statut: "Occupée" }
    });

    const numero_recu = `REC-RES-${Math.random().toString(16).slice(2, 10).toUpperCase()}`;
    const ym = (() => {
      try {
        const [m, y] = mois_paye.split(" ");
        const monthNum = new Date(Date.parse(m + " 1, 2000")).getMonth() + 1;
        return `${y}-${monthNum.toString().padStart(2, "0")}`;
      } catch {
        return null;
      }
    })();

    await prisma.paiement.create({
      data: {
        id_client: client.id_client,
        id_contrat: contrat.id_contrat,
        date_paiement: new Date(),
        mois_paye,
        mois_ym: ym,
        montant: parseFloat(montant),
        statut: "Complet",
        numero_recu
      }
    });

    return NextResponse.json({ success: true, client, contrat });
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur lors de la réservation: " + error.message }, { status: 500 });
  }
}
