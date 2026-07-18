import { NextResponse } from "next/server";
import { prisma } from "../../../../../prisma/client";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const depense = await prisma.depense.findUnique({ where: { id_depense: id } });
    if (!depense) return NextResponse.json({ error: 'Depense non trouvee' }, { status: 404 });
    return NextResponse.json({ depense });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur lecture depense' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const body = await req.json();
    const updated = await prisma.depense.update({
      where: { id_depense: id },
      data: {
        libelle: body.libelle,
        montant: parseFloat(body.montant),
        date_depense: new Date(body.date_depense),
      },
    });
    return NextResponse.json({ depense: updated });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur mise a jour depense' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    await prisma.depense.delete({ where: { id_depense: id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur suppression depense' }, { status: 500 });
  }
}
