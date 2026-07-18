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

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    await prisma.paiement.delete({ where: { id_paiement: id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur suppression paiement' }, { status: 500 });
  }
}
