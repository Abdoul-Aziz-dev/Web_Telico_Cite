import { NextResponse } from "next/server";
import { prisma } from "../../../../../prisma/client";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const paiement = await prisma.paiement.findUnique({ where: { id_paiement: id }, include: { client: true } });
    if (!paiement) return NextResponse.json({ error: 'Paiement non trouvé' }, { status: 404 });
    return NextResponse.json({ paiement });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur lecture paiement' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const { id_client, mois_paye, montant } = await req.json();
    const ym = (() => {
      try {
        const [m, y] = mois_paye.split(' ');
        return `${y}-${(new Date(Date.parse(m + ' 1, 2000')).getMonth() + 1).toString().padStart(2, '0')}`;
      } catch { return null; }
    })();
    const updated = await prisma.paiement.update({
      where: { id_paiement: id },
      data: { id_client, mois_paye, mois_ym: ym, montant: parseFloat(montant) },
    });
    return NextResponse.json({ paiement: updated });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur modification paiement' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    await prisma.paiement.delete({ where: { id_paiement: id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur suppression paiement' }, { status: 500 });
  }
}
