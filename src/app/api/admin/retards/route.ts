import { NextResponse } from "next/server";
import { prisma } from "../../../../../prisma/client";

export async function GET() {
  const now = new Date();
  const mois = now.getMonth() + 1;
  const annee = now.getFullYear();
  const debutMois = new Date(annee, mois - 1, 1);
  const finMois = new Date(annee, mois, 1);
  const moisStr = `${annee}-${String(mois).padStart(2, "0")}`;

  const clientsActifs = await prisma.client.findMany({
    where: { statut: "Actif" },
    include: {
      chambre: true,
      contrats: {
        where: { OR: [{ date_fin: null }, { date_fin: { gte: now } }] },
        orderBy: { id_contrat: "desc" },
        take: 1,
      },
      paiements: {
        where: { date_paiement: { gte: debutMois, lt: finMois } },
      },
    },
  });

  // Relances déjà enregistrées ce mois
  const relancesExistantes = await prisma.relanceLoyer.findMany({
    where: { mois: moisStr },
  });
  const relancesSet = new Set(relancesExistantes.map(r => r.id_client));

  const enRetard = clientsActifs
    .filter(c => c.contrats.length > 0 && c.paiements.length === 0)
    .map(c => ({
      id_client: c.id_client,
      nom: c.nom,
      prenom: c.prenom,
      telephone: c.telephone,
      chambre: c.chambre ? { numero: c.chambre.numero, type_chambre: c.chambre.type_chambre } : null,
      loyer: c.contrats[0]?.montant ?? 0,
      date_entree: c.date_entree,
      relance: relancesSet.has(c.id_client),
    }));

  return NextResponse.json({ enRetard, mois: moisStr });
}

export async function POST(req: Request) {
  try {
    const { id_client, mois, note } = await req.json();
    // Upsert : une seule relance par client par mois
    const existing = await prisma.relanceLoyer.findFirst({ where: { id_client, mois } });
    if (existing) {
      await prisma.relanceLoyer.update({ where: { id_relance: existing.id_relance }, data: { date_relance: new Date(), note } });
    } else {
      await prisma.relanceLoyer.create({ data: { id_client, mois, note } });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erreur relance" }, { status: 500 });
  }
}
