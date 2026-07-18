import { NextResponse } from "next/server";
import { prisma } from "../../../../prisma/client";

export async function GET() {
  try {
    const contrats = await prisma.contrat.findMany({
      orderBy: { id_contrat: 'desc' },
      include: { client: true, contrat_chambres: { include: { chambre: true } } }
    });
    return NextResponse.json({ contrats });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur lecture contrats' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id_client, date_debut, date_fin, montant, chambreIds } = body;
    const contrat = await prisma.contrat.create({ data: { id_client, date_debut, date_fin: date_fin || null, montant: parseFloat(montant) } });
    if (Array.isArray(chambreIds) && chambreIds.length > 0) {
      for (const id of chambreIds) {
        await prisma.contratChambre.create({ data: { id_contrat: contrat.id_contrat, id_chambre: id } });
        await prisma.chambre.update({ where: { id_chambre: id }, data: { statut: 'Occupée' } });
      }
    }
    return NextResponse.json({ contrat }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur création contrat' }, { status: 500 });
  }
}
