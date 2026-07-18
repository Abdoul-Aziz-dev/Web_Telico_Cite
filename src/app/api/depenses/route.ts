import { NextResponse } from "next/server";
import { prisma } from "../../../../prisma/client";

export async function GET() {
  try {
    const depenses = await prisma.depense.findMany({ orderBy: { date_depense: 'desc' } });
    return NextResponse.json({ depenses });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur lecture dépenses' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const created = await prisma.depense.create({
      data: {
        libelle: body.libelle,
        montant: parseFloat(body.montant),
        date_depense: new Date(body.date_depense || new Date().toISOString().slice(0, 10)),
      },
    });
    return NextResponse.json({ depense: created }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur création dépense' }, { status: 500 });
  }
}
