import { NextResponse } from "next/server";
import { prisma } from "../../../../prisma/client";

export async function GET() {
  try {
    const clotures = await prisma.cloture.findMany({ orderBy: { date_cloture: 'desc' } });
    return NextResponse.json({ clotures });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur lecture clôtures' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const created = await prisma.cloture.create({
      data: {
        mois: body.mois,
        date_cloture: new Date(body.date_cloture || new Date().toISOString().slice(0, 10)),
        total_du: parseFloat(body.total_du),
        total_encaisse: parseFloat(body.total_encaisse),
        total_depense: parseFloat(body.total_depense),
        solde: parseFloat(body.solde),
        statut: body.statut || 'Validé',
        valide_par: body.valide_par || null,
        commentaire: body.commentaire || null,
      },
    });
    return NextResponse.json({ cloture: created }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur création clôture' }, { status: 500 });
  }
}
